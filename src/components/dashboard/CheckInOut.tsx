import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LogIn, LogOut, Clock, Coffee, AlertTriangle, ShieldAlert, CalendarClock, SkipForward } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ShiftConfig {
  total_working_hours: number;
  max_break_minutes: number;
  start_time: string;
  grace_period_mins: number;
}

export default function CheckInOut() {
  const { user, profile } = useAuth();
  const [todayPunches, setTodayPunches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig | null>(null);
  const [lateDialogOpen, setLateDialogOpen] = useState(false);
  const [lateSubmitting, setLateSubmitting] = useState(false);

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
    if (!profile?.shift_id) {
      // Fallback for admins/super_admins who might not have a shift assigned
      if (user?.role === "admin" || user?.role === "super_admin") {
        setShiftConfig({
          total_working_hours: 9,
          max_break_minutes: 60,
          start_time: "09:00:00",
          grace_period_mins: 15,
        });
      }
      return;
    }
    apiClient
      .get(`/profiles/shifts/${profile.shift_id}`)
      .then(({ data }) => {
        if (data) setShiftConfig({
          total_working_hours: data.total_working_hours ?? 9,
          max_break_minutes: data.max_break_minutes ?? 60,
          start_time: data.start_time || "09:00:00",
          grace_period_mins: data.grace_period_mins ?? 15,
        });
      })
      .catch(err => console.error("Failed to fetch shift config", err));
  }, [profile?.shift_id, user?.role]);

  const fetchTodayPunches = async () => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    try {
      const { data } = await apiClient.get("/attendance/my-punches", { params: { date: today } });
      setTodayPunches(data || []);
    } catch (err) {
      console.error("Failed to fetch punches", err);
    }
  };

  const hasLoggedIn = todayPunches.some((p) => p.punch_type === "login");
  const hasLoggedOut = todayPunches.some((p) => p.punch_type === "logout");
  const isOnBreak = (() => {
    const breakStarts = todayPunches.filter((p) => p.punch_type === "break_start").length;
    const breakEnds = todayPunches.filter((p) => p.punch_type === "break_end").length;
    return breakStarts > breakEnds;
  })();

  // Check if current time is past shift start + grace period
  const isLateLogin = (): boolean => {
    if (!shiftConfig?.start_time) return false;
    const now = new Date();
    const [shiftH, shiftM] = shiftConfig.start_time.split(":").map(Number);
    const cutoff = new Date(now);
    cutoff.setHours(shiftH, shiftM + (shiftConfig.grace_period_mins || 0), 0, 0);
    return now > cutoff;
  };

  // Format the cutoff time for display
  const getCutoffTime = (): string => {
    if (!shiftConfig?.start_time) return "";
    const [shiftH, shiftM] = shiftConfig.start_time.split(":").map(Number);
    const cutoff = new Date();
    cutoff.setHours(shiftH, shiftM + (shiftConfig.grace_period_mins || 0), 0, 0);
    return format(cutoff, "hh:mm a");
  };

  const handleLoginClick = () => {
    if (isLateLogin()) {
      setLateDialogOpen(true);
    } else {
      proceedWithLogin();
    }
  };

  const proceedWithLogin = async () => {
    await handlePunch("login", "Login Time");
  };

  const handleLateChoice = async (choice: "permission" | "half_day" | "skip") => {
    setLateSubmitting(true);
    try {
      if (choice !== "skip") {
        const today = format(new Date(), "yyyy-MM-dd");
        const now = format(new Date(), "HH:mm");

        const leaveData: any = {
          date: today,
          type: choice,
          reason: choice === "permission" ? "Late login - Permission requested" : "Late login - Half day requested",
        };

        // For permission, include the time range (shift start to now)
        if (choice === "permission" && shiftConfig?.start_time) {
          const [h, m] = shiftConfig.start_time.split(":").map(Number);
          leaveData.start_time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          leaveData.end_time = now;
        }

        await apiClient.post("/leaves/apply", leaveData);
        toast({
          title: choice === "permission" ? "Permission Request Sent" : "Half Day Request Sent",
          description: "Your request has been sent to admin for approval.",
        });
      }

      setLateDialogOpen(false);
      await proceedWithLogin();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setLateSubmitting(false);
    }
  };

  const handlePunch = async (punchType: string, label: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await apiClient.post("/attendance/punch", { punch_type: punchType });
      const now = data.timestamp;

      toast({
        title: `${label} ✓`,
        description: format(new Date(now), "hh:mm:ss a"),
      });

      await fetchTodayPunches();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to record punch",
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
    const starts = todayPunches.filter((p) => p.punch_type === "break_start");
    const ends = todayPunches.filter((p) => p.punch_type === "break_end");
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
    <>
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
                onClick={handleLoginClick}
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
                      ? handlePunch("break_end", "Break Ended")
                      : handlePunch("break_start", "Break Started")
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

      {/* Late Login Popup */}
      <Dialog open={lateDialogOpen} onOpenChange={setLateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Late Login Detected
            </DialogTitle>
            <DialogDescription>
              You are logging in after the allowed time ({getCutoffTime()}). Please select how you'd like to mark this:
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            {/* Permission Option */}
            <button
              onClick={() => handleLateChoice("permission")}
              disabled={lateSubmitting}
              className="flex items-center gap-4 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CalendarClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-semibold text-sm group-hover:text-primary">Permission</div>
                <div className="text-xs text-muted-foreground">Request permission for the late hours. Admin will be notified.</div>
              </div>
            </button>

            {/* Half Day Option */}
            <button
              onClick={() => handleLateChoice("half_day")}
              disabled={lateSubmitting}
              className="flex items-center gap-4 p-4 rounded-lg border-2 border-border hover:border-orange-500 hover:bg-orange-500/5 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="font-semibold text-sm group-hover:text-orange-600">Half Day</div>
                <div className="text-xs text-muted-foreground">Mark this as a half day. Admin will be notified.</div>
              </div>
            </button>

            {/* Skip Option */}
            <button
              onClick={() => handleLateChoice("skip")}
              disabled={lateSubmitting}
              className="flex items-center gap-4 p-4 rounded-lg border border-dashed border-border hover:border-muted-foreground/50 hover:bg-muted/50 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <SkipForward className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-semibold text-sm text-muted-foreground group-hover:text-foreground">Skip</div>
                <div className="text-xs text-muted-foreground">Just login without sending any request.</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
