import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "./StatCard";
import LiveAttendanceFeed from "./LiveAttendanceFeed";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { Users, Clock, AlertTriangle, CalendarCheck, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { role } = useAuth();
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const [todaySummaries, setTodaySummaries] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const today = format(new Date(), "yyyy-MM-dd");

      const [{ count: totalUsers }, { data: summaries }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase
          .from("daily_summaries")
          .select("*, profiles!daily_summaries_user_id_fkey(full_name, email)")
          .eq("date", today)
          .order("first_in", { ascending: true }),
      ]);

      const present = summaries?.filter((s) => s.status === "present").length || 0;
      const late = summaries?.filter((s) => s.status === "late").length || 0;
      const absent = summaries?.filter((s) => s.status === "absent").length || 0;

      setStats({ total: totalUsers || 0, present, late, absent });
      setTodaySummaries(summaries || []);
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {role === "admin" ? "Admin" : "Sub-Admin"} Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Overview of today's attendance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={stats.total} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Present Today" value={stats.present} icon={<UserCheck className="w-5 h-5" />} variant="success" />
        <StatCard title="Late Today" value={stats.late} icon={<Clock className="w-5 h-5" />} variant="warning" />
        <StatCard title="Absent Today" value={stats.absent} icon={<AlertTriangle className="w-5 h-5" />} variant="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Today's Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {todaySummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No attendance records for today</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>First In</TableHead>
                        <TableHead>Last Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Late (mins)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaySummaries.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.profiles?.full_name || "—"}</TableCell>
                          <TableCell>{s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—"}</TableCell>
                          <TableCell>{s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—"}</TableCell>
                          <TableCell><AttendanceStatusBadge status={s.status} /></TableCell>
                          <TableCell>{s.late_minutes || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <LiveAttendanceFeed />
      </div>
    </div>
  );
}
