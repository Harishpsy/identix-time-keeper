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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const sn = url.searchParams.get("SN");
  const table = url.searchParams.get("table");

  // ADMS handshake: device sends GET to check connectivity
  if (req.method === "GET") {
    // If device asks for server info or stamps
    if (table === "options") {
      return new Response(
        "GET OPTION FROM: " + sn + "\r\n" +
        "ATTLOGStamp=0\r\n" +
        "OPERLOGStamp=0\r\n" +
        "ATTPHOTOStamp=0\r\n" +
        "ErrorDelay=30\r\n" +
        "Delay=10\r\n" +
        "TransTimes=00:00;14:05\r\n" +
        "TransInterval=1\r\n" +
        "TransFlag=TransData AttLog\tOpLog\r\n" +
        "Realtime=1\r\n" +
        "TimeZone=5.5\r\n",
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain" } }
      );
    }

    // Generic GET response
    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  // ADMS push: device POSTs attendance data
  if (req.method === "POST") {
    try {
      const body = await req.text();
      const lines = body.trim().split("\n").filter((l) => l.trim());

      const records: Array<{
        user_id: string;
        timestamp: string;
        device_id: string | null;
        punch_type: string | null;
      }> = [];

      for (const line of lines) {
        // ADMS ATTLOG format: PIN\tTime\tStatus\tVerify\tWorkCode\tReserved1\tReserved2
        const parts = line.split("\t");
        if (parts.length < 2) continue;

        const biometricId = parseInt(parts[0].trim(), 10);
        const timeStr = parts[1]?.trim();
        const inOutMode = parts[2]?.trim() || "0";

        if (isNaN(biometricId) || !timeStr) continue;

        // Look up user by biometric_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("biometric_id", biometricId)
          .single();

        if (!profile) {
          console.warn(`No profile found for biometric_id: ${biometricId}`);
          continue;
        }

        // Parse timestamp: "2026-02-13 09:00:00" format
        const parsedTime = new Date(timeStr.replace(" ", "T") + "+05:30");

        records.push({
          user_id: profile.id,
          timestamp: parsedTime.toISOString(),
          device_id: sn,
          punch_type: inOutMode === "1" ? "out" : "in",
        });
      }

      if (records.length > 0) {
        const { error } = await supabase
          .from("attendance_raw")
          .insert(records);

        if (error) {
          console.error("Insert error:", error);
          return new Response("ERR: " + error.message, {
            status: 500,
            headers: corsHeaders,
          });
        }

        console.log(`Inserted ${records.length} attendance records from device ${sn}`);
      }

      // Device expects "OK" response
      return new Response("OK", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    } catch (err) {
      console.error("ADMS processing error:", err);
      return new Response("ERR", {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: corsHeaders,
  });
});
