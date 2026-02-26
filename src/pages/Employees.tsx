import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Loader2, Pencil, Check, X, FileText, KeyRound, Eye, EyeOff, CalendarIcon, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Employees() {
  const { role: currentUserRole } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ biometric_id: "", department_id: "", shift_id: "", date_of_joining: "" });
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    biometric_id: "",
    department_id: "",
    shift_id: "",
    role: "employee",
    date_of_joining: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profsRes, depsRes, shiftsRes] = await Promise.all([
        apiClient.get("/profiles"),
        apiClient.get("/profiles/departments"),
        apiClient.get("/profiles/shifts"),
      ]);

      setEmployees(profsRes.data);
      setDepartments(depsRes.data);
      setShifts(shiftsRes.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await apiClient.patch(`/profiles/${id}`, { is_active: !isActive });
      toast.success(`Employee ${isActive ? "deactivated" : "activated"}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    try {
      await apiClient.patch(`/profiles/${userId}`, { role: newRole });
      toast.success("Role updated");
      fetchData();
    } catch (err) {
      toast.error("Failed to update role");
    }
  };

  const startEdit = (emp: any) => {
    setEditingId(emp.id);
    setEditForm({
      biometric_id: emp.biometric_id?.toString() || "",
      department_id: emp.department_id || "",
      shift_id: emp.shift_id || "",
      date_of_joining: emp.date_of_joining ? format(new Date(emp.date_of_joining), "yyyy-MM-dd") : "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      await apiClient.patch(`/profiles/${id}`, editForm);
      toast.success("Profile updated");
      setEditingId(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Name, email and password are required");
      return;
    }
    setCreating(true);
    try {
      await apiClient.post("/auth/register", form);
      toast.success("Employee created successfully");
      setDialogOpen(false);
      setForm({ full_name: "", email: "", password: "", biometric_id: "", department_id: "", shift_id: "", role: "employee", date_of_joining: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create employee");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/profiles/${id}`);
      toast.success("Employee deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete employee");
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword.trim()) return;
    setResetting(true);
    try {
      await apiClient.post("/auth/reset-password", { userId: resetTarget.id, newPassword: newPassword.trim() });
      toast.success(`Password reset for ${resetTarget.name}`);
      setResetPasswordOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const filtered = employees.filter((e) =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getDeptName = (id: string | null) => departments.find((d) => d.id === id)?.name || "—";
  const getShiftName = (id: string | null) => shifts.find((s) => s.id === id)?.name || "—";

  const downloadEmployeePDF = async (empId: string, empName: string) => {
    const now = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end = format(endOfMonth(now), "yyyy-MM-dd");

    try {
      const response = await apiClient.get("/attendance/summary", { params: { user_id: empId, start_date: start, end_date: end } });
      const records = response.data;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Attendance Report", 14, 20);
      autoTable(doc, {
        startY: 30,
        head: [["Date", "Status", "Duration"]],
        body: records.map((r: any) => [r.date, r.status, r.total_duration_minutes != null ? `${Math.floor(r.total_duration_minutes / 60)}h ${r.total_duration_minutes % 60}m` : "—"]),
      });
      doc.save(`attendance-${empName.toLowerCase()}.pdf`);
    } catch (err) {
      toast.error("Failed to download PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground mt-1">Manage employees and their roles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setForm({ full_name: "", email: "", password: "", biometric_id: "", department_id: "", shift_id: "", role: "employee", date_of_joining: "" });
            setShowCreatePassword(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button data-tour="add-employee">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Create New Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="emp-name">Full Name *</Label>
                <Input id="emp-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-email">Email *</Label>
                <Input id="emp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-password">Password *</Label>
                <div className="relative">
                  <Input id="emp-password" type={showCreatePassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" autoComplete="new-password" className="pr-10" />
                  <button type="button" onClick={() => setShowCreatePassword(!showCreatePassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-bio">Employee ID</Label>
                <Input id="emp-bio" value={form.biometric_id} onChange={(e) => setForm({ ...form, biometric_id: e.target.value })} placeholder="e.g. CC01" />
              </div>
              <div className="space-y-2">
                <Label>Date of Joining</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.date_of_joining && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.date_of_joining ? format(parse(form.date_of_joining, "yyyy-MM-dd", new Date()), "dd MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.date_of_joining ? parse(form.date_of_joining, "yyyy-MM-dd", new Date()) : undefined} onSelect={(date) => setForm({ ...form, date_of_joining: date ? format(date, "yyyy-MM-dd") : "" })} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department_id} onValueChange={(val) => setForm({ ...form, department_id: val })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shift</Label>
                  <Select value={form.shift_id} onValueChange={(val) => setForm({ ...form, shift_id: val })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {shifts.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="subadmin">Sub-Admin</SelectItem>
                    {currentUserRole === "super_admin" && (
                      <>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Employee
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-sm" data-tour="employee-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="border-border/50" data-tour="employee-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>DOJ</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.map((emp) => {
                  const isEditing = editingId === emp.id;
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editForm.biometric_id}
                            onChange={(e) => setEditForm({ ...editForm, biometric_id: e.target.value })}
                            className="w-24 h-8 font-mono text-sm"
                            placeholder="ID"
                          />
                        ) : (
                          <span className="font-mono text-sm">{emp.biometric_id || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-36 h-8 justify-start text-left text-sm font-normal", !editForm.date_of_joining && "text-muted-foreground")}>
                                <CalendarIcon className="mr-1 h-3 w-3" />
                                {editForm.date_of_joining ? format(parse(editForm.date_of_joining, "yyyy-MM-dd", new Date()), "dd MMM yyyy") : "Pick date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={editForm.date_of_joining ? parse(editForm.date_of_joining, "yyyy-MM-dd", new Date()) : undefined} onSelect={(date) => setEditForm({ ...editForm, date_of_joining: date ? format(date, "yyyy-MM-dd") : "" })} initialFocus />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-sm">{emp.date_of_joining ? format(new Date(emp.date_of_joining), "dd MMM yyyy") : "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select value={editForm.department_id} onValueChange={(val) => setEditForm({ ...editForm, department_id: val })}>
                            <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {departments.map((d) => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm">{getDeptName(emp.department_id)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select value={editForm.shift_id} onValueChange={(val) => setEditForm({ ...editForm, shift_id: val })}>
                            <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {shifts.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm">{getShiftName(emp.shift_id)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={emp.role || "employee"}
                          onValueChange={(val) => updateRole(emp.id, val)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="subadmin">Sub-Admin</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={emp.is_active}
                            onCheckedChange={() => {
                              if (emp.is_active) {
                                setDeactivateTarget({ id: emp.id, name: emp.full_name });
                              } else {
                                toggleActive(emp.id, emp.is_active);
                              }
                            }}
                          />
                          <span className={`text-xs font-medium ${emp.is_active ? "text-green-600" : "text-muted-foreground"}`}>
                            {emp.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => saveEdit(emp.id)}>
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                <X className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => startEdit(emp)} title="Edit">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => downloadEmployeePDF(emp.id, emp.full_name)} title="Download PDF Report">
                                <FileText className="w-4 h-4" />
                              </Button>
                              {(
                                (emp.role !== "admin" && emp.role !== "super_admin") ||
                                (currentUserRole === "super_admin" && emp.role === "admin")
                              ) && (
                                  <>
                                    <Button variant="ghost" size="sm" onClick={() => { setResetTarget({ id: emp.id, name: emp.full_name }); setResetPasswordOpen(true); setNewPassword(""); setShowNewPassword(false); }} title="Reset Password">
                                      <KeyRound className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: emp.id, name: emp.full_name })} title="Delete Employee">
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={resetPasswordOpen} onOpenChange={(open) => { setResetPasswordOpen(open); if (!open) { setNewPassword(""); setResetTarget(null); setShowNewPassword(false); setConfirmStep(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmStep ? "Confirm Reset" : "Reset Password"}</DialogTitle>
          </DialogHeader>
          {confirmStep ? (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to reset the password for <span className="font-medium text-foreground">{resetTarget?.name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmStep(false)} disabled={resetting}>
                  Back
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleResetPassword} disabled={resetting}>
                  {resetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirm Reset
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Set a new password for <span className="font-medium text-foreground">{resetTarget?.name}</span>
              </p>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button className="w-full" onClick={() => setConfirmStep(true)} disabled={newPassword.length < 6}>
                  Continue
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <span className="font-medium text-foreground">{deactivateTarget?.name}</span>? They will no longer appear in active employee lists and attendance tracking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deactivateTarget) {
                  toggleActive(deactivateTarget.id, true);
                  setDeactivateTarget(null);
                }
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This will remove all their data including attendance records, leave requests, and profile information. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget.id);
              }}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
