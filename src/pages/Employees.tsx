import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, UserCheck, UserX, Loader2, Pencil, Check, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ biometric_id: "", department_id: "", shift_id: "", date_of_joining: "" });

  // New employee form
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

  const fetchEmployees = async () => {
    const [{ data: profs }, { data: userRoles }, { data: deps }, { data: sh }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("departments").select("*"),
      supabase.from("shifts").select("*"),
    ]);

    setEmployees(profs || []);
    setDepartments(deps || []);
    setShifts(sh || []);

    const roleMap: Record<string, string> = {};
    userRoles?.forEach((r: any) => { roleMap[r.user_id] = r.role; });
    setRoles(roleMap);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: !isActive }).eq("id", id);
    if (error) toast.error("Failed to update");
    else { toast.success(`Employee ${isActive ? "deactivated" : "activated"}`); fetchEmployees(); }
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as any })
      .eq("user_id", userId);
    if (error) toast.error("Failed to update role");
    else { toast.success("Role updated"); fetchEmployees(); }
  };

  const startEdit = (emp: any) => {
    setEditingId(emp.id);
    setEditForm({
      biometric_id: emp.biometric_id?.toString() || "",
      department_id: emp.department_id || "",
      shift_id: emp.shift_id || "",
      date_of_joining: emp.date_of_joining || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

   const saveEdit = async (id: string) => {
    const updates: Record<string, any> = {
      biometric_id: editForm.biometric_id?.trim() || null,
      department_id: editForm.department_id || null,
      shift_id: editForm.shift_id || null,
      date_of_joining: editForm.date_of_joining || null,
    };
    const { error } = await supabase.from("profiles").update(updates).eq("id", id);
    if (error) toast.error("Failed to update profile");
    else { toast.success("Profile updated"); setEditingId(null); fetchEmployees(); }
  };

  const handleCreate = async () => {
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!form.full_name.trim() || !trimmedEmail || !form.password.trim()) {
      toast.error("Name, email and password are required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-employee", {
        body: {
          full_name: form.full_name.trim(),
          email: trimmedEmail,
          password: form.password,
          biometric_id: form.biometric_id || null,
          department_id: form.department_id || null,
          shift_id: form.shift_id || null,
          date_of_joining: form.date_of_joining || null,
          role: form.role,
        },
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to create employee");
      } else if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success("Employee created successfully");
        setDialogOpen(false);
        setForm({ full_name: "", email: "", password: "", biometric_id: "", department_id: "", shift_id: "", role: "employee", date_of_joining: "" });
        fetchEmployees();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create employee");
    } finally {
      setCreating(false);
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
    const monthName = format(now, "MMMM yyyy");

    const { data } = await supabase
      .from("daily_summaries")
      .select("*")
      .eq("user_id", empId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });

    const records = data || [];
    const present = records.filter((s) => s.status === "present").length;
    const late = records.filter((s) => s.status === "late").length;
    const absent = records.filter((s) => s.status === "absent").length;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Attendance Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`${empName} — ${monthName}`, 14, 28);
    doc.setFontSize(10);
    doc.text(`Present: ${present}  |  Late: ${late}  |  Absent: ${absent}  |  Total: ${records.length}`, 14, 35);

    autoTable(doc, {
      startY: 42,
      head: [["Date", "First In", "Last Out", "Duration", "Status", "Late (mins)"]],
      body: records.map((s) => [
        format(new Date(s.date), "dd MMM yyyy"),
        s.first_in ? format(new Date(s.first_in), "hh:mm a") : "—",
        s.last_out ? format(new Date(s.last_out), "hh:mm a") : "—",
        s.total_duration || "—",
        s.status,
        s.late_minutes || 0,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`attendance-${empName.replace(/\s+/g, "-").toLowerCase()}-${format(now, "yyyy-MM")}.pdf`);
    toast.success(`PDF downloaded for ${empName}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employee Management</h1>
            <p className="text-muted-foreground mt-1">Manage employees and their roles</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Employee</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="emp-name">Full Name *</Label>
                  <Input id="emp-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-email">Email *</Label>
                  <Input id="emp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-password">Password *</Label>
                  <Input id="emp-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
                </div>
                <div className="space-y-2">
                   <Label htmlFor="emp-bio">Employee ID</Label>
                  <Input id="emp-bio" value={form.biometric_id} onChange={(e) => setForm({ ...form, biometric_id: e.target.value })} placeholder="e.g. CC01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-doj">Date of Joining</Label>
                  <Input id="emp-doj" type="date" value={form.date_of_joining} onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })} />
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
                      <SelectItem value="admin">Admin</SelectItem>
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
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <Card className="border-border/50">
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
                  {filtered.map((emp) => {
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
                            <Input
                              type="date"
                              value={editForm.date_of_joining}
                              onChange={(e) => setEditForm({ ...editForm, date_of_joining: e.target.value })}
                              className="w-36 h-8 text-sm"
                            />
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
                            value={roles[emp.id] || "employee"}
                            onValueChange={(val) => updateRole(emp.id, val)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="subadmin">Sub-Admin</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={emp.is_active ? "default" : "secondary"} className="text-xs">
                            {emp.is_active ? "Active" : "Inactive"}
                          </Badge>
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
                                <Button variant="ghost" size="sm" onClick={() => toggleActive(emp.id, emp.is_active)} title={emp.is_active ? "Deactivate" : "Activate"}>
                                  {emp.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </Button>
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
      </div>
    </DashboardLayout>
  );
}
