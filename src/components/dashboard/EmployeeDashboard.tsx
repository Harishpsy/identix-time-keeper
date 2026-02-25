import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "./StatCard";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { Clock, CalendarCheck, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CheckInOut from "./CheckInOut";
import { format } from "date-fns";

interface DailySummaryRow {
  id: string;
  date: string;
  status: string;
  first_in: string | null;
  last_out: string | null;
  total_duration_minutes: number | null;
  late_minutes: number | null;
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

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<DailySummaryRow[]>([]);
  const [stats, setStats] = useState({ present: 0, late: 0, leaveTaken: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data } = await apiClient.get("/dashboard/employee");
        setSummaries(data.summaries || []);
        setStats(data.stats || { present: 0, late: 0, leaveTaken: 0 });
      } catch (err) {
        console.error("Failed to fetch employee dashboard", err);
      }
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
                      <TableCell className="font-medium">{format(new Date(s.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—"}</TableCell>
                      <TableCell>{s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—"}</TableCell>
                      <TableCell>{formatDuration(s.total_duration_minutes)}</TableCell>
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
