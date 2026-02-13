import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Use IST date (UTC+5:30) for "today"
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const today = istDate.toISOString().split("T")[0];

    // Get all active employees
    const { data: activeProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_active", true);

    if (profilesError) throw profilesError;
    if (!activeProfiles || activeProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No active employees found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get employees who already have a daily_summary for today
    const { data: existingSummaries, error: summariesError } = await supabase
      .from("daily_summaries")
      .select("user_id")
      .eq("date", today);

    if (summariesError) throw summariesError;

    const existingUserIds = new Set((existingSummaries || []).map((s) => s.user_id));

    // Also check approved leaves for today
    const { data: approvedLeaves, error: leavesError } = await supabase
      .from("leave_requests")
      .select("user_id")
      .eq("date", today)
      .eq("status", "approved");

    if (leavesError) throw leavesError;

    const onLeaveUserIds = new Set((approvedLeaves || []).map((l) => l.user_id));

    // Build absent records for employees with no summary and no approved leave
    const absentRecords = activeProfiles
      .filter((p) => !existingUserIds.has(p.id) && !onLeaveUserIds.has(p.id))
      .map((p) => ({
        user_id: p.id,
        date: today,
        status: "absent" as const,
      }));

    // Build on_leave records
    const leaveRecords = activeProfiles
      .filter((p) => !existingUserIds.has(p.id) && onLeaveUserIds.has(p.id))
      .map((p) => ({
        user_id: p.id,
        date: today,
        status: "on_leave" as const,
      }));

    const allRecords = [...absentRecords, ...leaveRecords];

    if (allRecords.length > 0) {
      const { error: insertError } = await supabase
        .from("daily_summaries")
        .insert(allRecords);

      if (insertError) throw insertError;
    }

    const result = {
      date: today,
      marked_absent: absentRecords.length,
      marked_on_leave: leaveRecords.length,
      already_recorded: existingUserIds.size,
    };

    console.log("Mark absent result:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Mark absent error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
