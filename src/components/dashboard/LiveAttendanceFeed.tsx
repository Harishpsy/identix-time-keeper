import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { format } from "date-fns";

interface PunchEvent {
  id: string;
  user_id: string;
  timestamp: string;
  punch_type: string;
  profile?: { full_name: string };
}

export default function LiveAttendanceFeed() {
  const [events, setEvents] = useState<PunchEvent[]>([]);

  useEffect(() => {
    // Fetch recent punches
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("attendance_raw")
        .select("*, profiles!attendance_raw_user_id_fkey(full_name)")
        .order("timestamp", { ascending: false })
        .limit(10);

      if (data) {
        setEvents(
          data.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            timestamp: d.timestamp,
            punch_type: d.punch_type,
            profile: d.profiles,
          }))
        );
      }
    };

    fetchRecent();

    // Subscribe to realtime
    const channel = supabase
      .channel("live-attendance")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_raw" },
        async (payload) => {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", payload.new.user_id)
            .single();

          const newEvent: PunchEvent = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            timestamp: payload.new.timestamp,
            punch_type: payload.new.punch_type,
            profile: prof || undefined,
          };

          setEvents((prev) => [newEvent, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
          <CardTitle className="text-base font-semibold">Live Attendance Feed</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No attendance records yet today</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {events.map((event, i) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {event.profile?.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.profile?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.timestamp), "hh:mm:ss a")}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {event.punch_type || "punch"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
