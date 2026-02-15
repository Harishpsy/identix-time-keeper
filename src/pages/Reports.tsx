import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalDayBoundsUTC, formatLocalDate } from "@/lib/timezone";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import AttendanceStatusBadge from "@/components/dashboard/AttendanceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CalendarCheck, Clock, AlertTriangle, Download, FileText, Loader2 } from "lucide-react";
import { format, endOfMonth, isToday, parseISO, startOfDay } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [summaries, setSummaries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [stats, setStats] = useState({ totalDays: 0, present: 0, late: 0, absent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      setEmployees(data || []);
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [year, mon] = month.split("-").map(Number);
      const start = format(new Date(year, mon - 1, 1), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date(year, mon - 1, 1)), "yyyy-MM-dd");
      const todayStr = formatLocalDate(new Date());

      let query = supabase
        .from("daily_summaries")
        .select("*, profiles!daily_summaries_user_id_fkey(full_name, email)")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });

      if (selectedEmployee !== "all") {
        query = query.eq("user_id", selectedEmployee);
      }

      const { data: summaryData } = await query;
      let all = summaryData || [];

      // If today falls within the selected month, synthesize records from attendance_raw
      // for users who have punched in today but don't have a daily_summary yet
      if (todayStr >= start && todayStr <= end) {
        const { start: dayStart, end: dayEnd } = getLocalDayBoundsUTC(new Date());
        
        let rawQuery = supabase
          .from("attendance_raw")
          .select("*, profiles!attendance_raw_user_id_fkey(full_name, email)")
          .gte("timestamp", dayStart)
          .lte("timestamp", dayEnd)
          .order("timestamp", { ascending: true });

        if (selectedEmployee !== "all") {
          rawQuery = rawQuery.eq("user_id", selectedEmployee);
        }

        const { data: rawData } = await rawQuery;

        if (rawData && rawData.length > 0) {
          // Group raw punches by user_id
          const userPunches: Record<string, any[]> = {};
          for (const punch of rawData) {
            if (!userPunches[punch.user_id]) {
              userPunches[punch.user_id] = [];
            }
            userPunches[punch.user_id].push(punch);
          }

          // Users who already have a daily_summary for today
          const existingTodayUsers = new Set(
            all.filter((s) => s.date === todayStr).map((s) => s.user_id)
          );

          // Create virtual summaries for users with raw punches but no daily_summary
          for (const [userId, punches] of Object.entries(userPunches)) {
            if (existingTodayUsers.has(userId)) continue;

            const loginPunch = punches.find((p) => p.punch_type === "login");
            const logoutPunch = [...punches].reverse().find((p) => p.punch_type === "logout");

            if (loginPunch) {
              const virtualSummary = {
                id: `virtual-${userId}-${todayStr}`,
                user_id: userId,
                date: todayStr,
                first_in: loginPunch.timestamp,
                last_out: logoutPunch?.timestamp || null,
                total_duration: null,
                late_minutes: 0,
                status: "present" as const,
                is_manual_override: false,
                created_at: new Date().toISOString(),
                profiles: loginPunch.profiles,
              };
              all = [virtualSummary, ...all];
            }
          }
        }
      }

      setSummaries(all);
      setStats({
        totalDays: all.length,
        present: all.filter((s) => s.status === "present").length,
        late: all.filter((s) => s.status === "late").length,
        absent: all.filter((s) => s.status === "absent").length,
      });
      setLoading(false);
    };

    fetchData();
  }, [month, selectedEmployee]);

  const downloadCSV = () => {
    const headers = ["Employee", "Date", "First In", "Last Out", "Status", "Late Mins"];
    const rows = summaries.map((s) => [
      s.profiles?.full_name || "",
      s.date,
      s.first_in ? format(new Date(s.first_in), "HH:mm") : "",
      s.last_out ? format(new Date(s.last_out), "HH:mm") : "",
      s.status,
      s.late_minutes || 0,
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const [year, mon] = month.split("-").map(Number);
    const monthName = format(new Date(year, mon - 1, 1), "MMMM yyyy");
    const empName = selectedEmployee === "all"
      ? "All Employees"
      : employees.find((e) => e.id === selectedEmployee)?.full_name || "Employee";

    doc.setFontSize(18);
    doc.text("Attendance Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`${monthName} — ${empName}`, 14, 28);
    doc.setFontSize(10);
    doc.text(`Present: ${stats.present}  |  Late: ${stats.late}  |  Absent: ${stats.absent}  |  Total: ${stats.totalDays}`, 14, 35);

    autoTable(doc, {
      startY: 42,
      head: [["Employee", "Date", "First In", "Last Out", "Status", "Late (mins)"]],
      body: summaries.map((s) => [
        s.profiles?.full_name || "—",
        format(new Date(s.date), "dd MMM yyyy"),
        s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—",
        s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—",
        s.status,
        s.late_minutes || 0,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    const filename = selectedEmployee === "all"
      ? `attendance-report-${month}.pdf`
      : `attendance-report-${empName.replace(/\s+/g, "-").toLowerCase()}-${month}.pdf`;
    doc.save(filename);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">Monthly attendance reports</p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
            <Button variant="outline" onClick={downloadPDF}>
              <FileText className="w-4 h-4 mr-2" />PDF
            </Button>
            <Button variant="outline" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-2" />CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard title="Total Records" value={stats.totalDays} icon={<Users className="w-5 h-5" />} />
          <StatCard title="Present" value={stats.present} icon={<CalendarCheck className="w-5 h-5" />} variant="success" />
          <StatCard title="Late" value={stats.late} icon={<Clock className="w-5 h-5" />} variant="warning" />
          <StatCard title="Absent" value={stats.absent} icon={<AlertTriangle className="w-5 h-5" />} variant="destructive" />
        </div>

        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>First In</TableHead>
                    <TableHead>Last Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Late (mins)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                  ) : summaries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data for this month</TableCell></TableRow>
                  ) : summaries.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.profiles?.full_name || "—"}</TableCell>
                      <TableCell>{format(new Date(s.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—"}</TableCell>
                      <TableCell>{s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—"}</TableCell>
                      <TableCell><AttendanceStatusBadge status={s.status} /></TableCell>
                      <TableCell>{s.late_minutes || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
