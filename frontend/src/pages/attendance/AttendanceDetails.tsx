import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "@/lib/apiClient";
import { API } from "@/lib/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, parse } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";

interface DailyRecord {
    date: string;
    status: string;
    first_in: string | null;
    last_out: string | null;
    total_duration_minutes: number | null;
    break_duration_minutes: number | null;
    late_minutes: number | null;
}

const statusLabel: Record<string, string> = {
    present: "Present",
    late: "Late",
    absent: "Absent",
    half_day: "Half Day",
    on_leave: "On Leave",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    present: "default",
    late: "secondary",
    absent: "destructive",
    half_day: "outline",
    on_leave: "secondary",
};

function formatTime(ts: string | null) {
    if (!ts) return "—";
    try {
        return format(new Date(ts), "hh:mm a");
    } catch {
        return "—";
    }
}

function formatDuration(mins: number | null) {
    if (!mins && mins !== 0) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

function formatLateMinutes(mins: number | null) {
    if (!mins || mins <= 0) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}Hrs.${String(m).padStart(2, "0")}Mins`;
    return `${String(m).padStart(2, "0")}Mins`;
}

function safeFormatDate(dateStr: string) {
    if (!dateStr) return "—";
    try {
        const parsable = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`;
        const d = new Date(parsable);
        if (isNaN(d.getTime())) return dateStr;
        return format(d, "dd MMM, EEE");
    } catch {
        return dateStr;
    }
}

export default function AttendanceDetails() {
    const { userId, month } = useParams<{ userId: string; month: string }>();
    const navigate = useNavigate();
    const [records, setRecords] = useState<DailyRecord[]>([]);
    const [employeeName, setEmployeeName] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId || !month) return;

        const fetchDetails = async () => {
            setLoading(true);
            try {
                const [y, m] = month.split("-").map(Number);
                const start = format(startOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");
                const end = format(endOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");

                const [detailsRes, profilesRes] = await Promise.all([
                    apiClient.get(API.ATTENDANCE.SUMMARY, { params: { start_date: start, end_date: end } }),
                    apiClient.get(API.PROFILES.LIST),
                ]);

                // Get employee name
                const profile = (profilesRes.data || []).find((p: any) => p.id === userId);
                if (profile) setEmployeeName(profile.full_name);

                // Filter and process records
                const userRecords = (detailsRes.data || [])
                    .filter((s: any) => s.user_id === userId)
                    .map((d: any) => ({
                        date: typeof d.date === "string" ? d.date.split("T")[0] : format(new Date(d.date), "yyyy-MM-dd"),
                        status: d.status,
                        first_in: d.first_in,
                        last_out: d.last_out,
                        total_duration_minutes: d.total_duration_minutes,
                        break_duration_minutes: d.break_duration_minutes,
                        late_minutes: d.late_minutes,
                    }))
                    .sort((a: DailyRecord, b: DailyRecord) => b.date.localeCompare(a.date));

                // Deduplicate
                const uniqueRecords = Array.from(new Map(userRecords.map((r: any) => [r.date, r])).values());
                setRecords(uniqueRecords as DailyRecord[]);
            } catch (err) {
                console.error("Failed to fetch attendance details", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [userId, month]);

    const monthLabel = month ? format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy") : "";

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/attendance-summary")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Attendance Details</h1>
                    <p className="text-muted-foreground mt-1">
                        {employeeName} — {monthLabel}
                    </p>
                </div>
            </div>

            <Card className="border-border/50">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Check In</TableHead>
                                    <TableHead>Check Out</TableHead>
                                    <TableHead>Break</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Late (min)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground mt-2">Loading attendance records...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : records.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                            No records found for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((r) => (
                                        <TableRow key={r.date} className="hover:bg-muted/30">
                                            <TableCell className="font-medium tabular-nums whitespace-nowrap">
                                                {safeFormatDate(r.date)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariant[r.status] || "outline"} className="capitalize">
                                                    {(statusLabel[r.status] || r.status).replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="tabular-nums">{formatTime(r.first_in)}</TableCell>
                                            <TableCell className="tabular-nums">{formatTime(r.last_out)}</TableCell>
                                            <TableCell className="tabular-nums">{formatDuration(r.break_duration_minutes)}</TableCell>
                                            <TableCell className="tabular-nums">{formatDuration(r.total_duration_minutes)}</TableCell>
                                            <TableCell className="tabular-nums text-destructive">
                                                {r.late_minutes && r.late_minutes > 0 ? formatLateMinutes(r.late_minutes) : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
