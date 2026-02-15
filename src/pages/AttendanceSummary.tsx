import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Search, Download, FileText, UserCheck, UserX, Clock, CalendarOff } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const fetchData = async () => {
    setLoading(true);
    const [y, m] = month.split("-").map(Number);
    const start = format(startOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");
    const end = format(endOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");

    const [{ data: dailyData }, { data: profiles }, { data: departments }] = await Promise.all([
      supabase.from("daily_summaries").select("user_id, status").gte("date", start).lte("date", end),
      supabase.from("profiles").select("id, full_name, email, department_id").eq("is_active", true).order("full_name"),
      supabase.from("departments").select("id, name"),
    ]);

    const deptMap: Record<string, string> = {};
    (departments || []).forEach((d) => { deptMap[d.id] = d.name; });

    const counts: Record<string, { present: number; late: number; absent: number; halfDay: number; onLeave: number; total: number }> = {};
    (dailyData || []).forEach((r: any) => {
      if (!counts[r.user_id]) counts[r.user_id] = { present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0, total: 0 };
      counts[r.user_id].total++;
      if (r.status === "present") counts[r.user_id].present++;
      else if (r.status === "late") counts[r.user_id].late++;
      else if (r.status === "absent") counts[r.user_id].absent++;
      else if (r.status === "half_day") counts[r.user_id].halfDay++;
      else if (r.status === "on_leave") counts[r.user_id].onLeave++;
    });

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

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.present}</p>
                <p className="text-xs text-muted-foreground">Total Present</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.late}</p>
                <p className="text-xs text-muted-foreground">Total Late</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <UserX className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.absent}</p>
                <p className="text-xs text-muted-foreground">Total Absent</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <CalendarOff className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.onLeave}</p>
                <p className="text-xs text-muted-foreground">Total On Leave</p>
              </div>
            </CardContent>
          </Card>
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
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No data found</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((s) => (
                      <TableRow key={s.userId}>
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
    </DashboardLayout>
  );
}
