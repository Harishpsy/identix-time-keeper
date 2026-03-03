import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PunchEvent {
  id: string;
  user_id: string;
  timestamp: string;
  punch_type: string;
  full_name?: string;
}

export default function LiveAttendanceFeed() {
  const [events, setEvents] = useState<PunchEvent[]>([]);

  const fetchRecent = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await apiClient.get("/attendance/recent", { params: { date: today } });
      if (data?.punches && data?.profiles) {
        const profileMap = new Map(data.profiles.map((p: any) => [p.id, p.full_name]));
        const recentPunches = (data.punches as any[])
          .slice(-20)
          .reverse()
          .map((p: any) => ({
            id: p.id,
            user_id: p.user_id,
            timestamp: p.timestamp,
            punch_type: p.punch_type,
            full_name: (profileMap.get(p.user_id) as string) || "Unknown",
          }));
        setEvents(recentPunches);
      }
    } catch (err) {
      console.error("Failed to fetch live feed", err);
    }
  };

  useEffect(() => {
    fetchRecent();
    // Poll every 30 seconds instead of realtime subscription
    const interval = setInterval(fetchRecent, 30000);
    return () => clearInterval(interval);
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
                    {event.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.full_name || "Unknown"}</p>
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
