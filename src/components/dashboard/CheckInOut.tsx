import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, LogOut, Clock, Coffee } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function CheckInOut() {
  const { user } = useAuth();
  const [todayPunches, setTodayPunches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

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

  const fetchTodayPunches = async () => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("attendance_raw")
      .select("*")
      .eq("user_id", user.id)
      .gte("timestamp", `${today}T00:00:00`)
      .lte("timestamp", `${today}T23:59:59`)
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

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span className="text-2xl font-mono font-semibold text-foreground">
                {format(currentTime, "hh:mm:ss a")}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {format(currentTime, "EEEE, dd MMM yyyy")}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {firstIn && (
              <div className="text-sm text-muted-foreground">
                Login: <span className="font-medium text-foreground">{format(new Date(firstIn.timestamp), "hh:mm a")}</span>
              </div>
            )}
            {lastPunch && todayPunches.length > 1 && (
              <div className="text-sm text-muted-foreground">
                Last: <span className="font-medium text-foreground">{format(new Date(lastPunch.timestamp), "hh:mm a")}</span>
              </div>
            )}
            {hasLoggedIn && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Coffee className="w-3.5 h-3.5" />
                Break: <span className="font-medium text-foreground">{totalBreakMs > 0 ? formatDuration(totalBreakMs) : "0s"}</span>
              </div>
            )}
            {hasLoggedIn && firstIn && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Working: <span className="font-medium text-foreground">
                  {formatDuration(
                    (hasLoggedOut && lastPunch
                      ? new Date(lastPunch.timestamp).getTime()
                      : currentTime.getTime()
                    ) - new Date(firstIn.timestamp).getTime() - totalBreakMs
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
