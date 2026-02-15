import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "./StatCard";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { Clock, CalendarCheck, AlertTriangle, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CheckInOut from "./CheckInOut";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { formatLocalDate, parseLocalDate } from "@/lib/timezone";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, leaves: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const now = new Date();
      const start = formatLocalDate(startOfMonth(now));
      const end = formatLocalDate(endOfMonth(now));

      const [{ data: sums }, { count: leaveCount }] = await Promise.all([
        supabase
          .from("daily_summaries")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false }),
        supabase
          .from("leave_requests")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "approved")
          .gte("date", start)
          .lte("date", end),
      ]);

      const data = sums || [];
      setSummaries(data);
      setStats({
        present: data.filter((s) => s.status === "present").length,
        late: data.filter((s) => s.status === "late").length,
        absent: data.filter((s) => s.status === "absent").length,
        leaves: leaveCount || 0,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Days Present" value={stats.present} icon={<CalendarCheck className="w-5 h-5" />} variant="success" />
        <StatCard title="Days Late" value={stats.late} icon={<Clock className="w-5 h-5" />} variant="warning" />
        <StatCard title="Days Absent" value={stats.absent} icon={<AlertTriangle className="w-5 h-5" />} variant="destructive" />
        <StatCard title="Leaves Taken" value={stats.leaves} icon={<CalendarDays className="w-5 h-5" />} variant="info" />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{format(parseLocalDate(s.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—"}</TableCell>
                      <TableCell>{s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—"}</TableCell>
                      <TableCell>{s.total_duration || "—"}</TableCell>
                      <TableCell><AttendanceStatusBadge status={s.status} /></TableCell>
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
