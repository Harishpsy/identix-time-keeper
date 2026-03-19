import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AttendanceStatusBadge from "@/components/dashboard/AttendanceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { Search, ChevronLeft, ChevronRight, Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReprocessDialog from "@/components/attendance/ReprocessDialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_SIZE = 10;

function formatLateMinutes(mins: number | null) {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}Hrs.${String(m).padStart(2, "0")}Mins`;
  return `${String(m).padStart(2, "0")}Mins`;
}

function formatDurationMins(mins: number | null) {
  if (!mins && mins !== 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

export default function Attendance() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [page, setPage] = useState(1);
  const [quickFilter, setQuickFilter] = useState<"today" | "yesterday" | "previous" | null>(
    role !== "employee" ? "today" : null
  );

  const { data: summaries = [], isLoading: loading } = useQuery({
    queryKey: ["attendance-summary", month],
    queryFn: async () => {
      const [year, mon] = month.split("-").map(Number);
      const start = format(new Date(year, mon - 1, 1), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date(year, mon - 1, 1)), "yyyy-MM-dd");

      const response = await apiClient.get("/attendance/summary", {
        params: { start_date: start, end_date: end }
      });

      return response.data;
    },
  });

  const handleReprocessComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
  };

  const getQuickFilterDate = (filter: "today" | "yesterday" | "previous") => {
    if (filter === "today") return format(new Date(), "yyyy-MM-dd");
    if (filter === "yesterday") return format(subDays(new Date(), 1), "yyyy-MM-dd");
    return format(subDays(new Date(), 2), "yyyy-MM-dd");
  };

  const filtered = summaries.filter((s) => {
    const matchesSearch = search
      ? s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesQuickFilter = quickFilter
      ? format(new Date(s.date), "yyyy-MM-dd") === getQuickFilterDate(quickFilter)
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
        formatDurationMins(s.total_duration_minutes),
        s.status,
        formatLateMinutes(s.late_minutes),
      ];
      if (!isEmp) row.unshift(s.full_name || "");
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
        formatDurationMins(s.total_duration_minutes),
        s.status,
        formatLateMinutes(s.late_minutes),
      ];
      if (!isEmp) row.unshift(s.full_name || "—");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Records</h1>
        <p className="text-muted-foreground mt-1">View attendance details</p>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
        <Input
          type="month"
          value={month}
          onChange={(e) => { setMonth(e.target.value); setQuickFilter(null); }}
          className="w-full sm:w-auto"
          data-tour="attendance-month"
        />
        {role !== "employee" && (
          <div className="flex gap-1 flex-wrap" data-tour="attendance-filter">
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
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        )}
        <div className="flex gap-2 sm:ml-auto" data-tour="attendance-export">
          {(role === "super_admin" || role === "admin") && (
            <ReprocessDialog onComplete={handleReprocessComplete} />
          )}
          <Button variant="outline" size="sm" onClick={downloadPDF} disabled={filtered.length === 0}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCSV} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <Card className="border-border/50" data-tour="attendance-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  {role !== "employee" && <TableHead>Employee</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>First In</TableHead>
                  <TableHead>Last Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Late (HH.MM)</TableHead>
                  {role !== "employee" && <TableHead>Tracking & Device</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={role !== "employee" ? 8 : 6} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={role !== "employee" ? 8 : 6} className="text-center text-muted-foreground py-8">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((s) => (
                    <TableRow key={s.id}>
                      {role !== "employee" && <TableCell className="font-medium">{s.full_name || "—"}</TableCell>}
                      <TableCell>{format(new Date(s.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—"}</TableCell>
                      <TableCell>{s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—"}</TableCell>
                      <TableCell>{formatDurationMins(s.total_duration_minutes)}</TableCell>
                      <TableCell><AttendanceStatusBadge status={s.status} /></TableCell>
                      <TableCell>{formatLateMinutes(s.late_minutes)}</TableCell>
                      {role !== "employee" && (
                        <TableCell>
                          <div className="flex flex-col gap-0.5 text-[10px] min-w-[120px]">
                            <span className="font-mono text-muted-foreground">
                              {s.first_in_ip === "::1" || s.first_in_ip === "127.0.0.1" ? "Localhost" : (s.first_in_ip || "—")}
                            </span>
                            <span className="font-medium text-foreground">{s.first_in_os || "—"} / {s.first_in_browser || "—"}</span>
                            {s.first_in_lat && s.first_in_long ? (
                              <a
                                href={`https://www.google.com/maps?q=${s.first_in_lat},${s.first_in_long}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium flex items-center gap-1"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                View Location
                              </a>
                            ) : (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                Location Unavailable
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
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
  );
}
