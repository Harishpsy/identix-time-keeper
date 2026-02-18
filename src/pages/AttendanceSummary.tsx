import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Search, Download, FileText, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import EmployeeDailyDetails from "@/components/attendance/EmployeeDailyDetails";

interface EmployeeSummary {
  userId: string;
  name: string;
  email: string;
  department: string;
  present: number;
  late: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  total: number;
}

export default function AttendanceSummary() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [search, setSearch] = useState("");
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [y, m] = month.split("-").map(Number);
    const start = format(startOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");
    const end = format(endOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");

    const todayDate = new Date();
    const today = format(todayDate, "yyyy-MM-dd");
    const yesterday = format(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 1), "yyyy-MM-dd");
    const dayBefore = format(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 2), "yyyy-MM-dd");
    const isCurrentMonth = today >= start && today <= end;

    // Recent days that fall within the selected month
    const recentDays = [today, yesterday, dayBefore].filter((d) => d >= start && d <= end);
    const earliestRecent = recentDays[recentDays.length - 1];
    const latestRecent = recentDays[0];

    const [{ data: dailyData }, { data: profiles }, { data: departments }, { data: recentRawPunches }, { data: recentSummaries }] = await Promise.all([
      supabase.from("daily_summaries").select("user_id, date, status, first_in, is_manual_override").gte("date", start).lte("date", end),
      supabase.from("profiles").select("id, full_name, email, department_id").eq("is_active", true).order("full_name"),
      supabase.from("departments").select("id, name"),
      isCurrentMonth && recentDays.length > 0
        ? supabase.from("attendance_raw").select("user_id, punch_type, timestamp").gte("timestamp", `${earliestRecent}T00:00:00`).lte("timestamp", `${latestRecent}T23:59:59`)
        : Promise.resolve({ data: [] }),
      isCurrentMonth && recentDays.length > 0
        ? supabase.from("daily_summaries").select("user_id, date, status, first_in, is_manual_override").in("date", recentDays)
        : Promise.resolve({ data: [] }),
    ]);

    const deptMap: Record<string, string> = {};
    (departments || []).forEach((d) => { deptMap[d.id] = d.name; });

    // Build a map of recent summaries by date+user for quick lookup
    const recentSummaryMap = new Map<string, any>();
    (recentSummaries || []).forEach((s: any) => {
      recentSummaryMap.set(`${s.date}:${s.user_id}`, s);
    });

    // Build punch map by date+user for recent days
    const recentPunchMap = new Map<string, { hasLogin: boolean }>();
    (recentRawPunches || []).forEach((p: any) => {
      const punchDate = format(new Date(p.timestamp), "yyyy-MM-dd");
      if (!recentDays.includes(punchDate)) return;
      const key = `${punchDate}:${p.user_id}`;
      if (!recentPunchMap.has(key)) recentPunchMap.set(key, { hasLogin: false });
      if (p.punch_type === "login") recentPunchMap.get(key)!.hasLogin = true;
    });

    // Helper to resolve effective status for a date+user
    const getEffectiveStatus = (date: string, userId: string, summaryStatus: string, summaryFirstIn: string | null, isManualOverride: boolean) => {
      if (!recentDays.includes(date)) return summaryStatus;
      const punchInfo = recentPunchMap.get(`${date}:${userId}`);
      // If there's a punch (login) but summary shows wrong status and not manually overridden, correct to present
      if (punchInfo?.hasLogin && !summaryFirstIn && !isManualOverride && (summaryStatus === "absent" || summaryStatus === "on_leave")) {
        return "present";
      }
      return summaryStatus;
    };

    const counts: Record<string, { present: number; late: number; absent: number; halfDay: number; onLeave: number; total: number }> = {};
    (dailyData || []).forEach((r: any) => {
      if (!counts[r.user_id]) counts[r.user_id] = { present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0, total: 0 };
      counts[r.user_id].total++;
      const effectiveStatus = getEffectiveStatus(r.date, r.user_id, r.status, r.first_in, r.is_manual_override);
      if (effectiveStatus === "present") counts[r.user_id].present++;
      else if (effectiveStatus === "late") counts[r.user_id].late++;
      else if (effectiveStatus === "absent") counts[r.user_id].absent++;
      else if (effectiveStatus === "half_day") counts[r.user_id].halfDay++;
      else if (effectiveStatus === "on_leave") counts[r.user_id].onLeave++;
    });

    // For recent days: add synthetic present records for users who punched but have no daily_summary yet
    if (isCurrentMonth && recentDays.length > 0) {
      for (const day of recentDays) {
        recentPunchMap.forEach((punchInfo, key) => {
          const [punchDay, userId] = key.split(":");
          if (punchDay !== day) return;
          const hasSummary = recentSummaryMap.has(`${day}:${userId}`);
          if (!hasSummary && punchInfo.hasLogin) {
            if (!counts[userId]) counts[userId] = { present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0, total: 0 };
            counts[userId].present++;
            counts[userId].total++;
          }
        });
      }
    }

    const result: EmployeeSummary[] = (profiles || []).map((p) => ({
      userId: p.id,
      name: p.full_name,
      email: p.email,
      department: deptMap[p.department_id || ""] || "—",
      present: counts[p.id]?.present || 0,
      late: counts[p.id]?.late || 0,
      absent: counts[p.id]?.absent || 0,
      halfDay: counts[p.id]?.halfDay || 0,
      onLeave: counts[p.id]?.onLeave || 0,
      total: counts[p.id]?.total || 0,
    }));

    setSummaries(result);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [month]);

  const filtered = summaries.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  );

  const [y, m] = month.split("-").map(Number);
  const monthLabel = format(new Date(y, m - 1, 1), "MMMM yyyy");

  // Totals
  const totals = filtered.reduce(
    (acc, s) => ({
      present: acc.present + s.present,
      late: acc.late + s.late,
      absent: acc.absent + s.absent,
      halfDay: acc.halfDay + s.halfDay,
      onLeave: acc.onLeave + s.onLeave,
    }),
    { present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0 }
  );

  const downloadCSV = () => {
    const headers = ["Employee", "Department", "Present", "Late", "Half Day", "Absent", "On Leave", "Total Days"];
    const rows = filtered.map((s) => [s.name, s.department, s.present, s.late, s.halfDay, s.absent, s.onLeave, s.total]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-summary-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Monthly Attendance Summary", 14, 20);
    doc.setFontSize(12);
    doc.text(monthLabel, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [["Employee", "Department", "Present", "Late", "Half Day", "Absent", "On Leave", "Total"]],
      body: filtered.map((s) => [s.name, s.department, s.present, s.late, s.halfDay, s.absent, s.onLeave, s.total]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
      foot: [["Total", "", totals.present, totals.late, totals.halfDay, totals.absent, totals.onLeave, ""]],
      showFoot: "lastPage",
    });

    doc.save(`attendance-summary-${month}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Summary</h1>
          <p className="text-muted-foreground mt-1">Monthly employee-wise attendance overview</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-44"
          />
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search employee or department..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadPDF} disabled={filtered.length === 0}>
              <FileText className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV} disabled={filtered.length === 0}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </div>



        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Half Day</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">On Leave</TableHead>
                    <TableHead className="text-center">Total Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No data found</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((s) => (
                      <TableRow key={s.userId} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEmployee(s)}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{s.department}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="min-w-[2rem] justify-center">{s.present}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="min-w-[2rem] justify-center">{s.late}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="min-w-[2rem] justify-center">{s.halfDay}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive" className="min-w-[2rem] justify-center">{s.absent}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="min-w-[2rem] justify-center">{s.onLeave}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{s.total}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <EmployeeDailyDetails
        open={!!selectedEmployee}
        onOpenChange={(open) => { if (!open) setSelectedEmployee(null); }}
        userId={selectedEmployee?.userId || ""}
        userName={selectedEmployee?.name || ""}
        month={month}
      />
    </DashboardLayout>
  );
}
