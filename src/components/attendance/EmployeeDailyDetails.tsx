import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, isValid } from "date-fns";
import { Loader2 } from "lucide-react";

interface DailyRecord {
  date: string;
  status: string;
  first_in: string | null;
  last_out: string | null;
  total_duration_minutes: number | null;
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
  half_day_absent: "outline",
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

function formatDuration(mins: number | null) {
  if (!mins && mins !== 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

function formatLateMinutes(mins: number | null) {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}Hrs.${String(m).padStart(2, "0")}Mins`;
  return `${String(m).padStart(2, "0")}Mins`;
}

function safeFormatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    // If it's already YYYY-MM-DD, append time to ensure local interpretation
    const parsable = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`;
    const d = new Date(parsable);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, "dd MMM, EEE");
  } catch (err) {
    console.error("Date parsing error:", err);
    return dateStr;
  }
}

export default function EmployeeDailyDetails({ open, onOpenChange, userId, userName, month }: Props) {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [y, m] = month.split("-").map(Number);
        const start = format(startOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");
        const end = format(endOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");

        const { data } = await apiClient.get("/attendance/summary", {
          params: { start_date: start, end_date: end },
        });

        // Filter for the specific user and ensure unique dates
        const userRecords = (data || [])
          .filter((s: any) => s.user_id === userId)
          .map((d: any) => ({
            date: typeof d.date === "string" ? d.date.split("T")[0] : format(new Date(d.date), "yyyy-MM-dd"),
            status: d.status,
            first_in: d.first_in,
            last_out: d.last_out,
            total_duration_minutes: d.total_duration_minutes,
            late_minutes: d.late_minutes,
          }))
          .sort((a: DailyRecord, b: DailyRecord) => a.date.localeCompare(b.date));

        // Deduplicate records by date (sometimes backend might send duplicates if logic overlaps)
        const uniqueRecords = Array.from(new Map(userRecords.map((r: any) => [r.date, r])).values());

        setRecords(uniqueRecords as DailyRecord[]);
      } catch (err) {
        console.error("Failed to fetch employee details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [open, userId, month]);

  const [y, m] = month.split("-").map(Number);
  const monthLabel = format(new Date(y, m - 1, 1), "MMMM yyyy");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{userName} — {monthLabel}</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
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
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading details...
                    </div>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No attendance records found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.date} className="hover:bg-muted/30">
                    <TableCell className="font-medium tabular-nums whitespace-nowrap">
                      {safeFormatDate(r.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status] || "outline"} className="capitalize">
                        {(statusLabel[r.status] || r.status).replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatTime(r.first_in)}</TableCell>
                    <TableCell className="tabular-nums">{formatTime(r.last_out)}</TableCell>
                    <TableCell className="tabular-nums">{formatDuration(r.total_duration_minutes)}</TableCell>
                    <TableCell className="tabular-nums text-destructive">
                      {r.late_minutes && r.late_minutes > 0 ? formatLateMinutes(r.late_minutes) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
