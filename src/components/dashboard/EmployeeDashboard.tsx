import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "./StatCard";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { Clock, CalendarCheck, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CheckInOut from "./CheckInOut";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { formatLocalDate, parseLocalDate } from "@/lib/timezone";

interface DailySummaryRow {
  id: string;
  date: string;
  status: string;
  first_in: string | null;
  last_out: string | null;
  total_duration: string | null;
  late_minutes: number | null;
  is_manual_override: boolean | null;
}

function formatDuration(dur: string | null) {
  if (!dur) return "—";
  const match = dur.match(/(\d+):(\d+)/);
  if (match) return `${match[1]}h ${match[2]}m`;
  return dur;
}

function formatLateMinutes(mins: number | null) {
  if (!mins || mins <= 0) return "00.00";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}


export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<DailySummaryRow[]>([]);
  const [stats, setStats] = useState({ present: 0, late: 0, leaveTaken: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const now = new Date();
      const start = formatLocalDate(startOfMonth(now));
      const end = formatLocalDate(endOfMonth(now));

      const todayDate = new Date();
      const today = formatLocalDate(todayDate);
      const yesterday = formatLocalDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 1));
      const dayBefore = formatLocalDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 2));
      const isCurrentMonth = today >= start && today <= end;

      const recentDays = [today, yesterday, dayBefore].filter((d) => d >= start && d <= end);
      const earliestRecent = recentDays[recentDays.length - 1];
      const latestRecent = recentDays[0];

      const [{ data: sums }, rawResult] = await Promise.all([
        supabase
          .from("daily_summaries")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false }),
        isCurrentMonth && recentDays.length > 0
          ? supabase
              .from("attendance_raw")
              .select("timestamp, punch_type")
              .eq("user_id", user.id)
              .gte("timestamp", `${earliestRecent}T00:00:00`)
              .lte("timestamp", `${latestRecent}T23:59:59`)
              .order("timestamp", { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      // Build punch map by date for recent days (convert UTC → IST for date bucketing)
      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      const punchByDay = new Map<string, { logins: string[]; logouts: string[] }>();
      for (const p of (rawResult.data || []) as any[]) {
        const istDate = new Date(new Date(p.timestamp).getTime() + IST_OFFSET_MS);
        const punchDate = format(istDate, "yyyy-MM-dd");
        if (!recentDays.includes(punchDate)) continue;
        if (!punchByDay.has(punchDate)) punchByDay.set(punchDate, { logins: [], logouts: [] });
        const entry = punchByDay.get(punchDate)!;
        if (p.punch_type === "login") entry.logins.push(p.timestamp);
        else if (p.punch_type === "logout") entry.logouts.push(p.timestamp);
      }

      // Reconcile summaries with raw punches for recent days
      // Always use raw punches as source of truth for recent days (not just when first_in is missing)
      const reconciledSummaries: DailySummaryRow[] = (sums || []).map((s: any) => {
        if (!recentDays.includes(s.date) || s.is_manual_override) return s;

        const dayPunches = punchByDay.get(s.date);
        if (!dayPunches || dayPunches.logins.length === 0) return s;

        // Always rebuild from raw punches for recent days to get latest last_out/duration
        const firstIn = dayPunches.logins[0];
        const lastOut = dayPunches.logouts.length > 0 ? dayPunches.logouts[dayPunches.logouts.length - 1] : null;
        let duration: string | null = null;
        let durationMs = 0;
        if (firstIn && lastOut) {
          durationMs = new Date(lastOut).getTime() - new Date(firstIn).getTime();
          const h = Math.floor(durationMs / 3600000);
          const min = Math.floor((durationMs % 3600000) / 60000);
          duration = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
        }

        // Recalculate status: preserve late/half_day from summary if it was correctly set,
        // but if summary says absent/on_leave and we have punches, recalculate properly
        let status = s.status;
        let lateMinutes = s.late_minutes || 0;

        if (status === "absent" || status === "on_leave") {
          // We have punches so user was present — recalculate status from raw punches
          // Use the summary's late_minutes if it was already calculated by the edge function
          // Otherwise mark as present (late calculation needs shift info we don't have client-side)
          status = "present";
          lateMinutes = 0;
        }

        // Half-day: if duration < 4 hours override status
        if (lastOut && durationMs > 0 && durationMs < 4 * 3600000) {
          status = "half_day";
        }

        return { ...s, status, first_in: firstIn, last_out: lastOut, total_duration: duration, late_minutes: lateMinutes };
      });

      // Add synthetic records for recent days with punches but no daily_summary
      const existingDates = new Set(reconciledSummaries.map((r) => r.date));
      for (const day of recentDays) {
        if (!existingDates.has(day)) {
          const dayPunches = punchByDay.get(day);
          if (dayPunches && dayPunches.logins.length > 0) {
            const firstIn = dayPunches.logins[0];
            const lastOut = dayPunches.logouts.length > 0 ? dayPunches.logouts[dayPunches.logouts.length - 1] : null;
            let duration: string | null = null;
            if (firstIn && lastOut) {
              const ms = new Date(lastOut).getTime() - new Date(firstIn).getTime();
              const h = Math.floor(ms / 3600000);
              const min = Math.floor((ms % 3600000) / 60000);
              duration = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
            }
            reconciledSummaries.push({ id: `synthetic-${day}`, date: day, status: "present", first_in: firstIn, last_out: lastOut, total_duration: duration, late_minutes: 0, is_manual_override: false });
          }
        }
      }

      // Sort descending by date
      reconciledSummaries.sort((a, b) => b.date.localeCompare(a.date));

      setSummaries(reconciledSummaries);
      setStats({
        present: reconciledSummaries.filter((s) => s.status === "present").length,
        late: reconciledSummaries.filter((s) => s.status === "late").length,
        leaveTaken: reconciledSummaries.filter((s) => s.status === "absent" || s.status === "on_leave" || s.status === "half_day").length,
      });
    };

    fetchData();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your attendance for {format(new Date(), "MMMM yyyy")}</p>
      </div>

      <CheckInOut />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Days Present" value={stats.present} icon={<CalendarCheck className="w-5 h-5" />} variant="success" />
        <StatCard title="Days Late" value={stats.late} icon={<Clock className="w-5 h-5" />} variant="warning" />
        <StatCard title="Leave Taken" value={stats.leaveTaken} icon={<CalendarDays className="w-5 h-5" />} variant="info" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No attendance records this month</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>First In</TableHead>
                      <TableHead>Last Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Late (HH.MM)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{format(parseLocalDate(s.date), "dd MMM yyyy")}</TableCell>
                        <TableCell>{s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—"}</TableCell>
                        <TableCell>{s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—"}</TableCell>
                        <TableCell>{formatDuration(s.total_duration)}</TableCell>
                        <TableCell><AttendanceStatusBadge status={s.status} /></TableCell>
                        <TableCell className="tabular-nums">{formatLateMinutes(s.late_minutes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

