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
import { Search } from "lucide-react";

export default function Attendance() {
  const { user, role } = useAuth();
  const [summaries, setSummaries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    const fetchData = async () => {
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
      setSummaries(data || []);
    };

    fetchData();
  }, [month, user, role]);

  const filtered = summaries.filter((s) =>
    search
      ? s.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.profiles?.email?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Records</h1>
          <p className="text-muted-foreground mt-1">View attendance details</p>
        </div>

        <div className="flex flex-wrap gap-3">
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
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={role !== "employee" ? 7 : 6} className="text-center text-muted-foreground py-8">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((s) => (
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
