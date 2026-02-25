import { useEffect, useState, useCallback, useMemo } from "react";
import apiClient from "@/lib/apiClient";
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
import UpcomingAnniversaries from "./UpcomingAnniversaries";

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
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
  const [mySummaries, setMySummaries] = useState<any[]>([]);
  const [todayPage, setTodayPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      const now = new Date();
      const start = format(startOfMonth(now), "yyyy-MM-dd");
      const end = format(endOfMonth(now), "yyyy-MM-dd");

      const [statsRes, leaveRes, myRes] = await Promise.all([
        apiClient.get("/dashboard/admin/stats"),
        apiClient.get("/dashboard/admin/leave"),
        apiClient.get("/attendance/summary", { params: { start_date: start, end_date: end } }),
      ]);

      setStats(statsRes.data);
      setLeaveRecords(leaveRes.data || []);

      // Filter my summaries from the full list
      if (user) {
        const mine = (myRes.data || []).filter((s: any) => s.user_id === user.id);
        setMySummaries(mine);
      }
    } catch (err) {
      console.error("Failed to fetch admin dashboard", err);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    // Poll every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const todayTotalPages = Math.max(1, Math.ceil(leaveRecords.length / PAGE_SIZE));
  const paginatedToday = useMemo(
    () => leaveRecords.slice((todayPage - 1) * PAGE_SIZE, todayPage * PAGE_SIZE),
    [leaveRecords, todayPage]
  );

  const historyTotalPages = Math.max(1, Math.ceil(mySummaries.length / PAGE_SIZE));
  const paginatedHistory = useMemo(
    () => mySummaries.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE),
    [mySummaries, historyPage]
  );

  useEffect(() => { setTodayPage(1); }, [leaveRecords]);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={stats.total} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Present Today" value={stats.present} icon={<UserCheck className="w-5 h-5" />} variant="success" />
        <StatCard title="Late Today" value={stats.late} icon={<Clock className="w-5 h-5" />} variant="warning" />
        <StatCard title="Leave Today" value={stats.absent} icon={<AlertTriangle className="w-5 h-5" />} variant="destructive" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Today's Leave</CardTitle>
        </CardHeader>
        <CardContent>
          {leaveRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No employees on leave today</p>
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
                    {paginatedToday.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>{r.first_in ? format(new Date(r.first_in), "hh:mm a") : "—"}</TableCell>
                        <TableCell>{r.last_out ? format(new Date(r.last_out), "hh:mm a") : "—"}</TableCell>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveAttendanceFeed />
        <UpcomingAnniversaries />
      </div>

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
                    {paginatedHistory.map((s: any) => (
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
    </div>
  );
}
