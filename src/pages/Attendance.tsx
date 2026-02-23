import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AttendanceStatusBadge from "@/components/dashboard/AttendanceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { Search, ChevronLeft, ChevronRight, Download, FileText, Loader2 } from "lucide-react";
import ReprocessDialog from "@/components/attendance/ReprocessDialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_SIZE = 10;

function formatLateMinutes(mins: number | null) {
  if (!mins || mins <= 0) return "00Mins.00Sec";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}Mins.${String(m).padStart(2, "0")}Sec`;
}

export default function Attendance() {
  const { user, role } = useAuth();
  const [summaries, setSummaries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState<"today" | "yesterday" | "previous" | null>(
    role !== "employee" ? "today" : null
  );
  const [refreshKey, setRefreshKey] = useState(0);

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

      // For recent days (today, yesterday, day before), correct/supplement daily_summaries with raw punch data
      const today = new Date();
      const recentDays = [
        format(today, "yyyy-MM-dd"),
        format(subDays(today, 1), "yyyy-MM-dd"),
        format(subDays(today, 2), "yyyy-MM-dd"),
      ].filter((d) => d >= start && d <= end);

      if (recentDays.length > 0 && role !== "employee") {
        // Fetch all active profiles once
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("is_active", true);

        // Fetch raw punches for all recent days
        const earliestDay = recentDays[recentDays.length - 1];
        const latestDay = recentDays[0];
        const { data: rawPunches } = await supabase
          .from("attendance_raw")
          .select("*, profiles!attendance_raw_user_id_fkey(full_name, email)")
          .gte("timestamp", `${earliestDay}T00:00:00`)
          .lte("timestamp", `${latestDay}T23:59:59`)
          .order("timestamp", { ascending: true });

        // Group punches by date and user
        const punchMap = new Map<string, Map<string, any[]>>();
        for (const p of rawPunches || []) {
          const punchDate = format(new Date(p.timestamp), "yyyy-MM-dd");
          if (!punchMap.has(punchDate)) punchMap.set(punchDate, new Map());
          const userMap = punchMap.get(punchDate)!;
          if (!userMap.has(p.user_id)) userMap.set(p.user_id, []);
          userMap.get(p.user_id)!.push(p);
        }

        for (const day of recentDays) {
          const existingSummaries = results.filter((s: any) => s.date === day);
          const existingUserIds = new Set(existingSummaries.map((s: any) => s.user_id));
          const dayPunches = punchMap.get(day) || new Map();

          // Override existing summaries that show absent but have raw punches
          results = results.map((s: any) => {
            if (s.date !== day) return s;
            const userPunches = dayPunches.get(s.user_id);
            if (!userPunches || userPunches.length === 0) return s;
            if (s.first_in) return s; // already has data, don't override
            if (s.is_manual_override) return s; // respect manual overrides

            const logins = userPunches.filter((p: any) => p.punch_type === "login");
            const logouts = userPunches.filter((p: any) => p.punch_type === "logout");
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
              ...s,
              first_in: firstIn,
              last_out: lastOut,
              total_duration: duration,
              status: firstIn ? "present" : s.status,
            };
          });

          // Add missing users for this day
          const newRecords = (allProfiles || [])
            .filter((prof: any) => !existingUserIds.has(prof.id))
            .map((prof: any) => {
              const userPunches = dayPunches.get(prof.id) || [];
              const logins = userPunches.filter((p: any) => p.punch_type === "login");
              const logouts = userPunches.filter((p: any) => p.punch_type === "logout");
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
                id: `synth-${day}-${prof.id}`,
                user_id: prof.id,
                date: day,
                first_in: firstIn,
                last_out: lastOut,
                total_duration: duration,
                status: firstIn ? "present" : "absent",
                late_minutes: 0,
                profiles: { full_name: prof.full_name, email: prof.email },
              };
            });

          results = [...newRecords, ...results] as any[];
        }
      } else if (recentDays.length > 0 && role === "employee") {
        // Employee: correct own records for recent days
        const earliestDay = recentDays[recentDays.length - 1];
        const latestDay = recentDays[0];
        const { data: rawPunches } = await supabase
          .from("attendance_raw")
          .select("*, profiles!attendance_raw_user_id_fkey(full_name, email)")
          .eq("user_id", user?.id)
          .gte("timestamp", `${earliestDay}T00:00:00`)
          .lte("timestamp", `${latestDay}T23:59:59`)
          .order("timestamp", { ascending: true });

        const punchByDay = new Map<string, any[]>();
        for (const p of rawPunches || []) {
          const punchDate = format(new Date(p.timestamp), "yyyy-MM-dd");
          if (!punchByDay.has(punchDate)) punchByDay.set(punchDate, []);
          punchByDay.get(punchDate)!.push(p);
        }

        // Override existing wrong summaries
        results = results.map((s: any) => {
          if (!recentDays.includes(s.date)) return s;
          const dayPunches = punchByDay.get(s.date);
          if (!dayPunches || dayPunches.length === 0) return s;
          if (s.first_in) return s;
          if (s.is_manual_override) return s;

          const logins = dayPunches.filter((p: any) => p.punch_type === "login");
          const logouts = dayPunches.filter((p: any) => p.punch_type === "logout");
          const firstIn = logins.length > 0 ? logins[0].timestamp : null;
          const lastOut = logouts.length > 0 ? logouts[logouts.length - 1].timestamp : null;
          let duration = null;
          if (firstIn && lastOut) {
            const ms = new Date(lastOut).getTime() - new Date(firstIn).getTime();
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            duration = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
          }
          return { ...s, first_in: firstIn, last_out: lastOut, total_duration: duration, status: firstIn ? "present" : s.status };
        });

        // Add missing days for employee
        for (const day of recentDays) {
          const hasDay = results.some((s: any) => s.date === day);
          if (!hasDay) {
            const dayPunches = punchByDay.get(day) || [];
            const logins = dayPunches.filter((p: any) => p.punch_type === "login");
            const logouts = dayPunches.filter((p: any) => p.punch_type === "logout");
            const firstIn = logins.length > 0 ? logins[0].timestamp : null;
            const lastOut = logouts.length > 0 ? logouts[logouts.length - 1].timestamp : null;
            let duration = null;
            if (firstIn && lastOut) {
              const ms = new Date(lastOut).getTime() - new Date(firstIn).getTime();
              const h = Math.floor(ms / 3600000);
              const m = Math.floor((ms % 3600000) / 60000);
              duration = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
            }
            const profile = dayPunches[0]?.profiles || null;
            (results as any[]).unshift({
              id: `synth-${day}-${user?.id}`,
              user_id: user?.id,
              date: day,
              first_in: firstIn,
              last_out: lastOut,
              total_duration: duration,
              status: firstIn ? "present" : "absent",
              late_minutes: 0,
              profiles: profile,
              created_at: new Date().toISOString(),
              is_manual_override: false,
            } as any);
          }
        }
      }

      setSummaries(results);
      setLoading(false);
    };

    fetchData();
  }, [month, user, role, refreshKey]);

  const getQuickFilterDate = (filter: "today" | "yesterday" | "previous") => {
    if (filter === "today") return format(new Date(), "yyyy-MM-dd");
    if (filter === "yesterday") return format(subDays(new Date(), 1), "yyyy-MM-dd");
    return format(subDays(new Date(), 2), "yyyy-MM-dd");
  };

  const filtered = summaries.filter((s) => {
    const matchesSearch = search
      ? s.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.profiles?.email?.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesQuickFilter = quickFilter
      ? s.date === getQuickFilterDate(quickFilter)
      : true;
    return matchesSearch && matchesQuickFilter;
  });

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
        formatLateMinutes(s.late_minutes),
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
        formatLateMinutes(s.late_minutes),
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
            onChange={(e) => { setMonth(e.target.value); setQuickFilter(null); }}
            className="w-auto"
          />
          {role !== "employee" && (
            <div className="flex gap-1">
              {(["today", "yesterday", "previous"] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={quickFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const targetDate = filter === "today" ? new Date() : filter === "yesterday" ? subDays(new Date(), 1) : subDays(new Date(), 2);
                    setMonth(format(targetDate, "yyyy-MM"));
                    setQuickFilter(quickFilter === filter ? null : filter);
                  }}
                >
                  {filter === "today" ? "Today" : filter === "yesterday" ? "Yesterday" : "Previous Day"}
                </Button>
              ))}
            </div>
          )}
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
            {role === "admin" && (
              <ReprocessDialog onComplete={() => setRefreshKey((k) => k + 1)} />
            )}
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
                        <TableCell>{formatLateMinutes(s.late_minutes)}</TableCell>
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
