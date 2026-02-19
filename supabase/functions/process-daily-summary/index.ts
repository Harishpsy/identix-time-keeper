import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine which date to process (default: today IST)
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.date;
    } catch {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      targetDate = istDate.toISOString().split("T")[0];
    }

    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return new Response(JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all punches for the target date in IST (UTC+5:30)
    const dayStartIST = `${targetDate}T00:00:00+05:30`;
    const dayEndIST = `${targetDate}T23:59:59+05:30`;

    const { data: punches, error: punchError } = await supabase
      .from("attendance_raw")
      .select("user_id, timestamp, punch_type")
      .gte("timestamp", dayStartIST)
      .lte("timestamp", dayEndIST)
      .order("timestamp", { ascending: true });

    if (punchError) throw punchError;

    if (!punches || punches.length === 0) {
      return new Response(JSON.stringify({ message: "No punches found for " + targetDate, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group punches by user — only track login/logout for first_in/last_out
    const userPunches: Record<string, { logins: string[]; logouts: string[] }> = {};
    for (const p of punches) {
      if (!userPunches[p.user_id]) userPunches[p.user_id] = { logins: [], logouts: [] };
      if (p.punch_type === "login") {
        userPunches[p.user_id].logins.push(p.timestamp);
      } else if (p.punch_type === "logout") {
        userPunches[p.user_id].logouts.push(p.timestamp);
      }
    }

    // Only process users who actually logged in
    const userIds = Object.keys(userPunches).filter((uid) => userPunches[uid].logins.length > 0);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ message: "No login punches found for " + targetDate, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get shift info for each user
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, shift_id, shifts(start_time, grace_period_mins)")
      .in("id", userIds);

    if (profileError) throw profileError;

    const profileMap: Record<string, any> = {};
    for (const p of profiles || []) {
      profileMap[p.id] = p;
    }

    const summaries: Array<{
      user_id: string;
      date: string;
      first_in: string;
      last_out: string | null;
      total_duration: string;
      status: string;
      late_minutes: number;
    }> = [];

    for (const userId of userIds) {
      const { logins, logouts } = userPunches[userId];

      // first_in = earliest login, last_out = latest logout
      const firstIn = logins[0];
      const lastOut = logouts.length > 0 ? logouts[logouts.length - 1] : null;

      const firstInDate = new Date(firstIn);
      const lastOutDate = lastOut ? new Date(lastOut) : null;

      // Calculate duration only if we have both login and logout
      let totalDuration = "00:00:00";
      let durationMs = 0;
      if (lastOutDate) {
        durationMs = lastOutDate.getTime() - firstInDate.getTime();
        const durationHours = Math.floor(durationMs / 3600000);
        const durationMins = Math.floor((durationMs % 3600000) / 60000);
        totalDuration = `${String(durationHours).padStart(2, "0")}:${String(durationMins).padStart(2, "0")}:00`;
      }

      // Determine status based on shift
      let lateMinutes = 0;
      let status = "present";
      const profile = profileMap[userId];

      if (profile?.shifts) {
        const shiftStart = profile.shifts.start_time; // e.g. "09:30:00"
        const graceMins = profile.shifts.grace_period_mins || 0;

        // Parse shift start time for the target date in IST
        const shiftStartDate = new Date(`${targetDate}T${shiftStart}+05:30`);
        const graceDeadline = new Date(shiftStartDate.getTime() + graceMins * 60000);

        if (firstInDate > graceDeadline) {
          // Late: calculate minutes late from shift start (not from grace deadline)
          lateMinutes = Math.floor((firstInDate.getTime() - shiftStartDate.getTime()) / 60000);
          status = "late";
        }
      }

      // Half day: logged in and out but worked less than 4 hours
      if (lastOutDate && durationMs > 0 && durationMs < 4 * 3600000) {
        status = "half_day";
      }

      summaries.push({
        user_id: userId,
        date: targetDate,
        first_in: firstIn,
        last_out: lastOut,
        total_duration: totalDuration,
        status,
        late_minutes: lateMinutes,
      });
    }

    // Upsert summaries — skip manual overrides
    let updatedCount = 0;
    for (const summary of summaries) {
      const { data: existing } = await supabase
        .from("daily_summaries")
        .select("id, is_manual_override")
        .eq("user_id", summary.user_id)
        .eq("date", summary.date)
        .single();

      if (existing?.is_manual_override) {
        console.log(`Skipping ${summary.user_id} on ${summary.date} — manual override`);
        continue;
      }

      if (existing) {
        await supabase
          .from("daily_summaries")
          .update({
            first_in: summary.first_in,
            last_out: summary.last_out,
            total_duration: summary.total_duration,
            status: summary.status,
            late_minutes: summary.late_minutes,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("daily_summaries").insert(summary);
      }
      updatedCount++;
    }

    const result = { date: targetDate, processed: updatedCount, total_punchers: summaries.length };
    console.log("Process daily summary result:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Process daily summary error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
