import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from "date-fns";

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
      try {
        const [y, m] = month.split("-").map(Number);
        const start = format(startOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");
        const end = format(endOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");

        const { data } = await apiClient.get("/attendance/summary", {
          params: { start_date: start, end_date: end },
        });

        // Filter for the specific user
        const userRecords = (data || [])
          .filter((s: any) => s.user_id === userId)
          .map((d: any) => ({
            date: d.date,
            status: d.status,
            first_in: d.first_in,
            last_out: d.last_out,
            total_duration_minutes: d.total_duration_minutes,
            late_minutes: d.late_minutes,
          }))
          .sort((a: DailyRecord, b: DailyRecord) => a.date.localeCompare(b.date));

        setRecords(userRecords);
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
                  <TableCell className="tabular-nums">{formatDuration(r.total_duration_minutes)}</TableCell>
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
