import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, LogOut, Clock, Coffee, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getLocalDayBoundsUTC } from "@/lib/timezone";

export default function CheckInOut() {
  const { user, profile } = useAuth();
  const [todayPunches, setTodayPunches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftConfig, setShiftConfig] = useState<{ total_working_hours: number; max_break_minutes: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 50);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setCurrentTime(new Date());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchTodayPunches();
  }, [user]);

  // Fetch shift config for the user
  useEffect(() => {
    if (!profile?.shift_id) return;
    supabase
      .from("shifts")
      .select("total_working_hours, max_break_minutes")
      .eq("id", profile.shift_id)
      .single()
      .then(({ data }) => {
        if (data) setShiftConfig({ total_working_hours: data.total_working_hours as number ?? 9, max_break_minutes: data.max_break_minutes ?? 60 });
      });
  }, [profile?.shift_id]);

  const fetchTodayPunches = async () => {
    if (!user) return;
    const { start, end } = getLocalDayBoundsUTC(new Date());
    const { data } = await supabase
      .from("attendance_raw")
      .select("*")
      .eq("user_id", user.id)
      .gte("timestamp", start)
      .lte("timestamp", end)
      .order("timestamp", { ascending: true });
    setTodayPunches(data || []);
  };

  const hasLoggedIn = todayPunches.some((p) => p.punch_type === "login");
  const hasLoggedOut = todayPunches.some((p) => p.punch_type === "logout");
  const isOnBreak = (() => {
    const breakStarts = todayPunches.filter((p) => p.punch_type === "break-start").length;
    const breakEnds = todayPunches.filter((p) => p.punch_type === "break-end").length;
    return breakStarts > breakEnds;
  })();

  const handlePunch = async (punchType: string, label: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();

      const { error } = await supabase.from("attendance_raw").insert({
        user_id: user.id,
        timestamp: now,
        punch_type: punchType,
        device_id: "web-app",
      });

      if (error) throw error;

      toast({
        title: `${label} ✓`,
        description: format(new Date(now), "hh:mm:ss a"),
      });

      await fetchTodayPunches();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to record punch",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const firstIn = todayPunches.find((p) => p.punch_type === "login");
  const lastPunch = todayPunches.length > 0 ? todayPunches[todayPunches.length - 1] : null;

  // Calculate total break duration
  const totalBreakMs = (() => {
    const starts = todayPunches.filter((p) => p.punch_type === "break-start");
    const ends = todayPunches.filter((p) => p.punch_type === "break-end");
    let total = 0;
    for (let i = 0; i < starts.length; i++) {
      const endTime = ends[i]
        ? new Date(ends[i].timestamp).getTime()
        : isOnBreak && i === starts.length - 1
        ? currentTime.getTime()
        : new Date(starts[i].timestamp).getTime();
      total += endTime - new Date(starts[i].timestamp).getTime();
    }
    return total;
  })();

  const maxBreakMs = (shiftConfig?.max_break_minutes ?? 60) * 60 * 1000;
  const remainingBreakMs = maxBreakMs - totalBreakMs;
  const breakExceeded = remainingBreakMs < 0;

  const formatDuration = (ms: number) => {
    const abs = Math.abs(ms);
    const totalSecs = Math.floor(abs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const msec = Math.floor((abs % 1000) / 10);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const prefix = ms < 0 ? "-" : "";
    return `${prefix}${pad(hrs)}:${pad(mins)}:${pad(secs)}:${pad(msec)}`;
  };

  return (
    <Card className="border-border/50">
      <CardContent className="pt-6 space-y-4">
        {/* Row 1: Clock, Date, Stats */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span className="text-2xl font-mono font-semibold text-foreground whitespace-nowrap tabular-nums">
                {format(currentTime, "hh:mm:ss a")}
              </span>
            </div>
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {format(currentTime, "EEEE, dd MMM yyyy")}
            </div>
          </div>

          {hasLoggedIn && (
            <div className="flex items-center gap-4 flex-wrap">
              {firstIn && (
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  Login: <span className="font-medium text-foreground">{format(new Date(firstIn.timestamp), "hh:mm a")}</span>
                </div>
              )}
              {lastPunch && todayPunches.length > 1 && (
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  Last: <span className="font-medium text-foreground">{format(new Date(lastPunch.timestamp), "hh:mm a")}</span>
                </div>
              )}
              <div className={`flex items-center gap-1 text-sm whitespace-nowrap ${breakExceeded ? "text-destructive" : "text-muted-foreground"}`}>
                <Coffee className="w-3.5 h-3.5" />
                Break: <span className={`font-medium tabular-nums ${breakExceeded ? "text-destructive" : "text-foreground"}`}>{formatDuration(remainingBreakMs)}</span>
              </div>
              {firstIn && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  Working: <span className="font-medium text-foreground tabular-nums">
                    {formatDuration(
                      (hasLoggedOut && lastPunch
                        ? new Date(lastPunch.timestamp).getTime()
                        : currentTime.getTime()
                      ) - new Date(firstIn.timestamp).getTime() - totalBreakMs
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Break exceeded warning */}
        {breakExceeded && hasLoggedIn && !hasLoggedOut && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Break time exceeded by <span className="font-bold tabular-nums">{formatDuration(Math.abs(remainingBreakMs))}</span>
              {isOnBreak && " — Please end your break now!"}
            </span>
          </div>
        )}

        {/* Row 2: Action Buttons */}
        <div className="flex items-center justify-end gap-2">
          {!hasLoggedIn && (
            <Button
              onClick={() => handlePunch("login", "Login Time")}
              disabled={loading}
              size="lg"
              className="min-w-[140px]"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login Time
            </Button>
          )}

          {hasLoggedIn && !hasLoggedOut && (
            <>
              <Button
                onClick={() =>
                  isOnBreak
                    ? handlePunch("break-end", "Break Ended")
                    : handlePunch("break-start", "Break Started")
                }
                disabled={loading}
                size="lg"
                variant="outline"
                className="min-w-[140px]"
              >
                <Coffee className="w-4 h-4 mr-2" />
                {isOnBreak ? "End Break" : "Take a Break"}
              </Button>

              <Button
                onClick={() => handlePunch("logout", "Logout Time")}
                disabled={loading || isOnBreak}
                size="lg"
                variant="destructive"
                className="min-w-[140px]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout Time
              </Button>
            </>
          )}

          {hasLoggedOut && (
            <div className="text-sm font-medium text-muted-foreground px-4 py-2 bg-muted rounded-md">
              Day completed ✓
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
