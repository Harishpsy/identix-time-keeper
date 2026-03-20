import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { API } from "@/lib/endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { RotateCcw, Search, ShieldAlert, Loader2 } from "lucide-react";

interface EmployeePunchData {
  userId: string;
  fullName: string;
  email: string;
  shiftId: string | null;
  punches: any[];
  hasLogin: boolean;
  hasLogout: boolean;
  isOnBreak: boolean;
}

export default function AttendanceReset() {
  const [employees, setEmployees] = useState<EmployeePunchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [resetting, setResetting] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; employee: EmployeePunchData | null }>({
    open: false,
    employee: null,
  });
  const [shiftMap, setShiftMap] = useState<Record<string, Date>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  const today = format(new Date(), "yyyy-MM-dd");

  // Update current time every minute to check shift status
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all shifts and build a map of shift_id -> end time
  useEffect(() => {
    apiClient.get(API.PROFILES.SHIFTS).then(({ data }) => {
      if (data && data.length > 0) {
        const map: Record<string, Date> = {};
        data.forEach((shift: any) => {
          const startTime = shift.start_time || "09:00:00";
          const endTime = shift.end_time;
          const [h, m] = (endTime || startTime).split(":").map(Number);
          const shiftEnd = new Date();
          if (endTime) {
            shiftEnd.setHours(h, m, 0, 0);
          } else {
            // Fallback: start_time + total_working_hours
            const [sh, sm] = startTime.split(":").map(Number);
            const totalHours = shift.total_working_hours ?? 9;
            shiftEnd.setHours(sh + totalHours, sm, 0, 0);
          }
          map[shift.id] = shiftEnd;
        });
        setShiftMap(map);
      }
    }).catch(() => { });
  }, []);

  // Check if a specific employee's shift is over
  const isEmployeeShiftOver = (emp: EmployeePunchData) => {
    if (!emp.shiftId || !shiftMap[emp.shiftId]) return false;
    return currentTime >= shiftMap[emp.shiftId];
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(API.ATTENDANCE.RECENT, { params: { date: today } });
      const { profiles, punches: rawPunches } = data;

      const punchMap = new Map<string, any[]>();
      (rawPunches || []).forEach((p: any) => {
        if (!punchMap.has(p.user_id)) punchMap.set(p.user_id, []);
        punchMap.get(p.user_id)!.push(p);
      });

      const employeeData: EmployeePunchData[] = profiles.map((profile: any) => {
        const punches = punchMap.get(profile.id) || [];
        const breakStarts = punches.filter((p) => p.punch_type === "break_start").length;
        const breakEnds = punches.filter((p) => p.punch_type === "break_end").length;
        return {
          userId: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          shiftId: profile.shift_id || null,
          punches,
          hasLogin: punches.some((p) => p.punch_type === "login"),
          hasLogout: punches.some((p) => p.punch_type === "logout"),
          isOnBreak: breakStarts > breakEnds,
        };
      });

      setEmployees(employeeData);
    } catch (err) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleResetLogout = async (employee: EmployeePunchData) => {
    setResetting(employee.userId);
    try {
      const logoutPunches = employee.punches.filter((p) => p.punch_type === "logout");
      if (logoutPunches.length === 0) return;

      const logoutIds = logoutPunches.map((p) => p.id);
      await apiClient.post(API.ATTENDANCE.DELETE_PUNCHES, { ids: logoutIds });

      toast.success("Logout Reset", {
        description: `${employee.fullName}'s logout punch has been removed.`,
      });

      await fetchData();
    } catch (err: any) {
      toast.error("Reset Failed", {
        description: err.response?.data?.error || "Could not reset the logout punch",
      });
    } finally {
      setResetting(null);
    }
  };

  const filtered = employees.filter(
    (e) =>
      e.hasLogin &&
      (e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const loggedOutEmployees = filtered.filter((e) => e.hasLogout);
  const activeEmployees = filtered.filter((e) => !e.hasLogout);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" />
          Attendance Reset
        </h1>
        <p className="text-muted-foreground mt-1">
          Reset accidental logouts so employees can continue punching for the day
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="text-sm py-1.5 px-3">
          {format(new Date(), "dd MMM yyyy")}
        </Badge>
      </div>

      {/* Logged Out Employees - Need Reset */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-destructive" />
            Completed / Logged Out ({loggedOutEmployees.length})
          </CardTitle>
          <CardDescription>
            Employees who have logged out today. Reset their logout if it was accidental.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : loggedOutEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No logged-out employees to reset</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Login Time</TableHead>
                    <TableHead>Logout Time</TableHead>
                    <TableHead>Punches</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loggedOutEmployees.map((emp) => {
                    const loginPunch = emp.punches.find((p) => p.punch_type === "login");
                    const logoutPunch = [...emp.punches].reverse().find((p) => p.punch_type === "logout");
                    return (
                      <TableRow key={emp.userId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{emp.fullName}</p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {loginPunch ? format(new Date(loginPunch.timestamp), "hh:mm a") : "—"}
                        </TableCell>
                        <TableCell>
                          {logoutPunch ? format(new Date(logoutPunch.timestamp), "hh:mm a") : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{emp.punches.length} punches</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEmployeeShiftOver(emp) ? (
                            <span className="text-xs text-muted-foreground">Shift ended</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={resetting === emp.userId}
                              onClick={() => setConfirmDialog({ open: true, employee: emp })}
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              {resetting === emp.userId ? "Resetting..." : "Reset Logout"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Employees */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Active Employees ({activeEmployees.length})</CardTitle>
          <CardDescription>Employees currently logged in today</CardDescription>
        </CardHeader>
        <CardContent>
          {activeEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active employees</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Login Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Punches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEmployees.map((emp) => {
                    const loginPunch = emp.punches.find((p) => p.punch_type === "login");
                    return (
                      <TableRow key={emp.userId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{emp.fullName}</p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {loginPunch ? format(new Date(loginPunch.timestamp), "hh:mm a") : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={emp.isOnBreak ? "outline" : "default"}>
                            {emp.isOnBreak ? "On Break" : "Working"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{emp.punches.length} punches</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, employee: open ? confirmDialog.employee : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Logout for {confirmDialog.employee?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the logout punch so the employee can continue punching (breaks, final logout).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.employee) handleResetLogout(confirmDialog.employee);
                setConfirmDialog({ open: false, employee: null });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
