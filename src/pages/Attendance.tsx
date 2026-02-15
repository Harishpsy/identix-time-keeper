import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AttendanceStatusBadge from "@/components/dashboard/AttendanceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Search, ChevronLeft, ChevronRight, Download, FileText, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_SIZE = 10;

export default function Attendance() {
  const { user, role } = useAuth();
  const [summaries, setSummaries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [year, mon] = month.split("-").map(Number);
      const start = format(new Date(year, mon - 1, 1), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date(year, mon - 1, 1)), "yyyy-MM-dd");

      let query = supabase
        .from("daily_summaries")
        .select("*, profiles!daily_summaries_user_id_fkey(full_name, email)")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });

      if (role === "employee") {
        query = query.eq("user_id", user?.id);
      }

      const { data } = await query;
      let results = data || [];

      // If today is within selected month and has no daily_summary, build from raw punches
      const today = format(new Date(), "yyyy-MM-dd");
      if (today >= start && today <= end) {
        const hasTodaySummary = results.some((s: any) => s.date === today);
        if (!hasTodaySummary) {
          let rawQuery = supabase
            .from("attendance_raw")
            .select("*, profiles!attendance_raw_user_id_fkey(full_name, email)")
            .gte("timestamp", `${today}T00:00:00`)
            .lte("timestamp", `${today}T23:59:59`)
            .order("timestamp", { ascending: true });

          if (role === "employee") {
            rawQuery = rawQuery.eq("user_id", user?.id);
          }

          const { data: rawPunches } = await rawQuery;
          if (rawPunches && rawPunches.length > 0) {
            const byUser = new Map<string, { punches: any[]; profile: any }>();
            for (const p of rawPunches) {
              if (!byUser.has(p.user_id)) {
                byUser.set(p.user_id, { punches: [], profile: p.profiles });
              }
              byUser.get(p.user_id)!.punches.push(p);
            }

            const todayRecords = Array.from(byUser.entries()).map(([userId, { punches, profile }]) => {
              const logins = punches.filter((p: any) => p.punch_type === "login");
              const logouts = punches.filter((p: any) => p.punch_type === "logout");
              const firstIn = logins.length > 0 ? logins[0].timestamp : null;
              const lastOut = logouts.length > 0 ? logouts[logouts.length - 1].timestamp : null;
              let duration = null;
              if (firstIn && lastOut) {
                const ms = new Date(lastOut).getTime() - new Date(firstIn).getTime();
                const h = Math.floor(ms / 3600000);
                const m = Math.floor((ms % 3600000) / 60000);
                duration = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
              }
              return {
                id: `today-${userId}`,
                user_id: userId,
                date: today,
                first_in: firstIn,
                last_out: lastOut,
                total_duration: duration,
                status: firstIn ? "present" : "absent",
                late_minutes: 0,
                profiles: profile,
              };
            });

            results = [...todayRecords, ...results] as any[];
          }
        }
      }

      setSummaries(results);
      setLoading(false);
    };

    fetchData();
  }, [month, user, role]);

  const filtered = summaries.filter((s) =>
    search
      ? s.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.profiles?.email?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, month]);

  const [year, mon] = month.split("-").map(Number);
  const monthLabel = format(new Date(year, mon - 1, 1), "MMMM yyyy");

  const downloadCSV = () => {
    const isEmp = role === "employee";
    const headers = isEmp
      ? ["Date", "First In", "Last Out", "Duration", "Status", "Late Mins"]
      : ["Employee", "Date", "First In", "Last Out", "Duration", "Status", "Late Mins"];
    const rows = filtered.map((s) => {
      const row = [
        s.date,
        s.first_in ? format(new Date(s.first_in), "HH:mm") : "",
        s.last_out ? format(new Date(s.last_out), "HH:mm") : "",
        s.total_duration || "",
        s.status,
        s.late_minutes || 0,
      ];
      if (!isEmp) row.unshift(s.profiles?.full_name || "");
      return row;
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const isEmp = role === "employee";

    doc.setFontSize(18);
    doc.text("Attendance Records", 14, 20);
    doc.setFontSize(12);
    doc.text(monthLabel, 14, 28);

    const head = isEmp
      ? [["Date", "First In", "Last Out", "Duration", "Status", "Late (mins)"]]
      : [["Employee", "Date", "First In", "Last Out", "Duration", "Status", "Late (mins)"]];

    const body = filtered.map((s) => {
      const row = [
        format(new Date(s.date), "dd MMM yyyy"),
        s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—",
        s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—",
        s.total_duration || "—",
        s.status,
        s.late_minutes || 0,
      ];
      if (!isEmp) row.unshift(s.profiles?.full_name || "—");
      return row;
    });

    autoTable(doc, {
      startY: 35,
      head,
      body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`attendance-${month}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Records</h1>
          <p className="text-muted-foreground mt-1">View attendance details</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-auto"
          />
          {role !== "employee" && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
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
                    {role !== "employee" && <TableHead>Employee</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>First In</TableHead>
                    <TableHead>Last Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Late (mins)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={role !== "employee" ? 7 : 6} className="text-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={role !== "employee" ? 7 : 6} className="text-center text-muted-foreground py-8">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((s) => (
                      <TableRow key={s.id}>
                        {role !== "employee" && <TableCell className="font-medium">{s.profiles?.full_name || "—"}</TableCell>}
                        <TableCell>{format(new Date(s.date), "dd MMM yyyy")}</TableCell>
                        <TableCell>{s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—"}</TableCell>
                        <TableCell>{s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—"}</TableCell>
                        <TableCell>{s.total_duration || "—"}</TableCell>
                        <TableCell><AttendanceStatusBadge status={s.status} /></TableCell>
                        <TableCell>{s.late_minutes || 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 px-4 pb-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
