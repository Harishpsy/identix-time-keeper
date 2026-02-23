import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface DailyRecord {
  date: string;
  status: string;
  first_in: string | null;
  last_out: string | null;
  total_duration: string | null;
  late_minutes: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  month: string; // "yyyy-MM"
}

const statusLabel: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  half_day: "Half Day",
  on_leave: "On Leave",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  present: "default",
  late: "secondary",
  absent: "destructive",
  half_day: "outline",
  on_leave: "secondary",
};

function formatTime(ts: string | null) {
  if (!ts) return "—";
  try {
    return format(new Date(ts), "hh:mm a");
  } catch {
    return "—";
  }
}

function formatDuration(dur: string | null) {
  if (!dur) return "—";
  // interval comes as "HH:MM:SS" or similar
  const match = dur.match(/(\d+):(\d+)/);
  if (match) return `${match[1]}h ${match[2]}m`;
  return dur;
}

function formatLateMinutes(mins: number | null) {
  if (!mins || mins <= 0) return "00Mins.00Sec";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}Mins.${String(m).padStart(2, "0")}Sec`;
}

export default function EmployeeDailyDetails({ open, onOpenChange, userId, userName, month }: Props) {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;

    const fetchDetails = async () => {
      setLoading(true);
      const [y, m] = month.split("-").map(Number);
      const start = format(startOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");

      const todayDate = new Date();
      const today = format(todayDate, "yyyy-MM-dd");
      const yesterday = format(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 1), "yyyy-MM-dd");
      const dayBefore = format(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 2), "yyyy-MM-dd");
      const isCurrentMonth = today >= start && today <= end;

      // Recent days within this month for raw punch correction
      const recentDays = [today, yesterday, dayBefore].filter((d) => d >= start && d <= end);
      const earliestRecent = recentDays[recentDays.length - 1];
      const latestRecent = recentDays[0];

      // IST = UTC+5:30. Convert IST day boundaries to UTC for DB queries.
      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      const earliestStartUTC = new Date(new Date(`${earliestRecent}T00:00:00`).getTime() - IST_OFFSET_MS).toISOString();
      const latestEndUTC = new Date(new Date(`${latestRecent}T23:59:59`).getTime() - IST_OFFSET_MS).toISOString();

      const [{ data }, rawResult] = await Promise.all([
        supabase
          .from("daily_summaries")
          .select("date, status, first_in, last_out, total_duration, late_minutes, is_manual_override")
          .eq("user_id", userId)
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true }),
        isCurrentMonth && recentDays.length > 0
          ? supabase
              .from("attendance_raw")
              .select("timestamp, punch_type")
              .eq("user_id", userId)
              .gte("timestamp", earliestStartUTC)
              .lte("timestamp", latestEndUTC)
              .order("timestamp", { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      // Build punch map by date — convert each UTC timestamp → IST date for bucketing
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

      // Map daily_summaries and correct recent days using raw punches
      // Always use raw punches as source of truth for recent days
      const records: DailyRecord[] = (data || []).map((d: any) => {
        if (!recentDays.includes(d.date) || d.is_manual_override) {
          return { date: d.date, status: d.status, first_in: d.first_in, last_out: d.last_out, total_duration: d.total_duration, late_minutes: d.late_minutes };
        }

        const dayPunches = punchByDay.get(d.date);
        if (!dayPunches || dayPunches.logins.length === 0) {
          return { date: d.date, status: d.status, first_in: d.first_in, last_out: d.last_out, total_duration: d.total_duration, late_minutes: d.late_minutes };
        }

        // Always rebuild from raw punches to get the latest last_out/duration
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

        // Preserve late status & late_minutes from the processed summary if valid,
        // otherwise correct absent/on_leave to present
        let status = d.status;
        let lateMinutes = d.late_minutes || 0;
        if (status === "absent" || status === "on_leave") {
          status = "present";
          lateMinutes = 0;
        }
        // Half-day override
        if (lastOut && durationMs > 0 && durationMs < 4 * 3600000) {
          status = "half_day";
        }

        return { date: d.date, status, first_in: firstIn, last_out: lastOut, total_duration: duration, late_minutes: lateMinutes };
      });

      // Add synthetic records for recent days with punches but no daily_summary
      for (const day of recentDays) {
        const hasSummary = records.some((r) => r.date === day);
        if (!hasSummary) {
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
            records.push({ date: day, status: "present", first_in: firstIn, last_out: lastOut, total_duration: duration, late_minutes: 0 });
          }
        }
      }

      // Sort by date ascending
      records.sort((a, b) => a.date.localeCompare(b.date));

      setRecords(records);
      setLoading(false);
    };

    fetchDetails();
  }, [open, userId, month]);

  const [y, m] = month.split("-").map(Number);
  const monthLabel = format(new Date(y, m - 1, 1), "MMMM yyyy");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{userName} — {monthLabel}</DialogTitle>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Late (min)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No records found</TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r.date}>
                  <TableCell className="font-medium tabular-nums">{format(new Date(r.date + "T00:00:00"), "dd MMM, EEE")}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status] || "outline"}>
                      {statusLabel[r.status] || r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatTime(r.first_in)}</TableCell>
                  <TableCell className="tabular-nums">{formatTime(r.last_out)}</TableCell>
                  <TableCell className="tabular-nums">{formatDuration(r.total_duration)}</TableCell>
                  <TableCell className="tabular-nums">{formatLateMinutes(r.late_minutes)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
