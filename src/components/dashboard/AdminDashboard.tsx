import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "./StatCard";
import LiveAttendanceFeed from "./LiveAttendanceFeed";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { Users, Clock, AlertTriangle, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import CheckInOut from "./CheckInOut";

interface TodayRecord {
  userId: string;
  fullName: string;
  email: string;
  firstIn: string | null;
  lastOut: string | null;
  status: string;
  lateMinutes: number;
}

const PAGE_SIZE = 10;

function PaginationControls({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const [todayRecords, setTodayRecords] = useState<TodayRecord[]>([]);
  const [mySummaries, setMySummaries] = useState<any[]>([]);
  const [todayPage, setTodayPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const fetchData = useCallback(async () => {
// ... keep existing code (fetchData body)
    const today = format(new Date(), "yyyy-MM-dd");
    const now = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end = format(endOfMonth(now), "yyyy-MM-dd");

    const [{ count: totalUsers }, { data: summaries }, { data: rawPunches }, myResult] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase
        .from("daily_summaries")
        .select("*, profiles!daily_summaries_user_id_fkey(full_name, email)")
        .eq("date", today)
        .order("first_in", { ascending: true }),
      supabase
        .from("attendance_raw")
        .select("*, profiles!attendance_raw_user_id_fkey(full_name, email)")
        .gte("timestamp", `${today}T00:00:00`)
        .lte("timestamp", `${today}T23:59:59`)
        .order("timestamp", { ascending: true }),
      user
        ? supabase
            .from("daily_summaries")
            .select("*")
            .eq("user_id", user.id)
            .gte("date", start)
            .lte("date", end)
            .order("date", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ]);

    let records: TodayRecord[] = [];

    if (summaries && summaries.length > 0) {
      records = summaries.map((s: any) => ({
        userId: s.user_id,
        fullName: s.profiles?.full_name || "—",
        email: s.profiles?.email || "",
        firstIn: s.first_in,
        lastOut: s.last_out,
        status: s.status,
        lateMinutes: s.late_minutes || 0,
      }));
    } else if (rawPunches && rawPunches.length > 0) {
      const byUser = new Map<string, { punches: any[]; profile: any }>();
      for (const p of rawPunches) {
        if (!byUser.has(p.user_id)) {
          byUser.set(p.user_id, { punches: [], profile: p.profiles });
        }
        byUser.get(p.user_id)!.punches.push(p);
      }

      records = Array.from(byUser.entries()).map(([userId, { punches, profile }]) => {
        const logins = punches.filter((p: any) => p.punch_type === "login");
        const logouts = punches.filter((p: any) => p.punch_type === "logout");
        const firstIn = logins.length > 0 ? logins[0].timestamp : null;
        const lastOut = logouts.length > 0 ? logouts[logouts.length - 1].timestamp : null;

        return {
          userId,
          fullName: profile?.full_name || "—",
          email: profile?.email || "",
          firstIn,
          lastOut,
          status: lastOut ? "present" : firstIn ? "present" : "absent",
          lateMinutes: 0,
        };
      });
    }

    const present = records.filter((r) => r.status === "present" || r.status === "late").length;
    const late = records.filter((r) => r.status === "late").length;
    const absent = (totalUsers || 0) - present;

    setStats({ total: totalUsers || 0, present, late, absent });
    setTodayRecords(records);
    setMySummaries(myResult.data || []);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-attendance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_raw" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const todayTotalPages = Math.max(1, Math.ceil(todayRecords.length / PAGE_SIZE));
  const paginatedToday = useMemo(
    () => todayRecords.slice((todayPage - 1) * PAGE_SIZE, todayPage * PAGE_SIZE),
    [todayRecords, todayPage]
  );

  const historyTotalPages = Math.max(1, Math.ceil(mySummaries.length / PAGE_SIZE));
  const paginatedHistory = useMemo(
    () => mySummaries.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE),
    [mySummaries, historyPage]
  );

  // Reset pages when data changes
  useEffect(() => { setTodayPage(1); }, [todayRecords]);
  useEffect(() => { setHistoryPage(1); }, [mySummaries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {role === "admin" ? "Admin" : "Sub-Admin"} Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Overview of today's attendance</p>
      </div>

      <CheckInOut />

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">My Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {mySummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No attendance records this month</p>
          ) : (
            <>
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
                    {paginatedHistory.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{format(new Date(s.date), "dd MMM yyyy")}</TableCell>
                        <TableCell>{s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—"}</TableCell>
                        <TableCell>{s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—"}</TableCell>
                        <TableCell>{s.total_duration || "—"}</TableCell>
                        <TableCell><AttendanceStatusBadge status={s.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls page={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={stats.total} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Present Today" value={stats.present} icon={<UserCheck className="w-5 h-5" />} variant="success" />
        <StatCard title="Late Today" value={stats.late} icon={<Clock className="w-5 h-5" />} variant="warning" />
        <StatCard title="Absent Today" value={stats.absent} icon={<AlertTriangle className="w-5 h-5" />} variant="destructive" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {todayRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No attendance records for today</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>First In</TableHead>
                      <TableHead>Last Out</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedToday.map((r) => (
                      <TableRow key={r.userId}>
                        <TableCell className="font-medium">{r.fullName}</TableCell>
                        <TableCell>{r.firstIn ? format(new Date(r.firstIn), "hh:mm a") : "—"}</TableCell>
                        <TableCell>{r.lastOut ? format(new Date(r.lastOut), "hh:mm a") : "—"}</TableCell>
                        <TableCell><AttendanceStatusBadge status={r.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls page={todayPage} totalPages={todayTotalPages} onPageChange={setTodayPage} />
            </>
          )}
        </CardContent>
      </Card>

      <LiveAttendanceFeed />
    </div>
  );
}
