import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, LogOut, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function CheckInOut() {
  const { user } = useAuth();
  const [todayPunches, setTodayPunches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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

  const isCheckedIn = todayPunches.length > 0 && todayPunches.length % 2 !== 0;

  const handlePunch = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const punchType = isCheckedIn ? "check-out" : "check-in";

      const { error } = await supabase.from("attendance_raw").insert({
        user_id: user.id,
        timestamp: now,
        punch_type: punchType,
        device_id: "web-app",
      });

      if (error) throw error;

      toast({
        title: punchType === "check-in" ? "Checked In ✓" : "Checked Out ✓",
        description: `${format(new Date(now), "hh:mm:ss a")}`,
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

  const firstIn = todayPunches.length > 0 ? todayPunches[0] : null;
  const lastPunch = todayPunches.length > 0 ? todayPunches[todayPunches.length - 1] : null;

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
                First In: <span className="font-medium text-foreground">{format(new Date(firstIn.timestamp), "hh:mm a")}</span>
              </div>
            )}
            {lastPunch && todayPunches.length > 1 && (
              <div className="text-sm text-muted-foreground">
                Last: <span className="font-medium text-foreground">{format(new Date(lastPunch.timestamp), "hh:mm a")}</span>
              </div>
            )}

            <Button
              onClick={handlePunch}
              disabled={loading}
              size="lg"
              variant={isCheckedIn ? "destructive" : "default"}
              className="min-w-[140px]"
            >
              {isCheckedIn ? (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Check Out
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Check In
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
