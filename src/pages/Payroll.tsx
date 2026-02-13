import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Pencil, Trash2, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";

interface PayrollRecord {
  id: string;
  user_id: string;
  month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  notes: string | null;
  created_at: string;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

export default function Payroll() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const [form, setForm] = useState({
    user_id: "",
    basic_salary: "",
    allowances: "0",
    deductions: "0",
    notes: "",
  });

  const fetchData = async () => {
    const monthDate = `${selectedMonth}-01`;
    const [{ data: payrollData }, { data: empData }] = await Promise.all([
      supabase
        .from("payroll")
        .select("*")
        .eq("month", monthDate)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name"),
    ]);
    setRecords((payrollData as PayrollRecord[]) || []);
    setEmployees(empData || []);
  };

  useEffect(() => { fetchData(); }, [selectedMonth]);

  const getEmployeeName = (userId: string) =>
    employees.find((e) => e.id === userId)?.full_name || "Unknown";

  const resetForm = () => {
    setForm({ user_id: "", basic_salary: "", allowances: "0", deductions: "0", notes: "" });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (rec: PayrollRecord) => {
    setEditingId(rec.id);
    setForm({
      user_id: rec.user_id,
      basic_salary: rec.basic_salary.toString(),
      allowances: rec.allowances.toString(),
      deductions: rec.deductions.toString(),
      notes: rec.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.user_id || !form.basic_salary) {
      toast.error("Employee and basic salary are required");
      return;
    }
    const basicSalary = parseFloat(form.basic_salary);
    if (isNaN(basicSalary) || basicSalary < 0) {
      toast.error("Please enter a valid salary amount");
      return;
    }

    setSaving(true);
    const monthDate = `${selectedMonth}-01`;
    const payload = {
      user_id: form.user_id,
      month: monthDate,
      basic_salary: basicSalary,
      allowances: parseFloat(form.allowances) || 0,
      deductions: parseFloat(form.deductions) || 0,
      notes: form.notes.trim() || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("payroll").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("payroll").insert(payload));
    }

    if (error) {
      if (error.code === "23505") {
        toast.error("Payroll entry already exists for this employee and month");
      } else {
        toast.error(error.message || "Failed to save payroll");
      }
    } else {
      toast.success(editingId ? "Payroll updated" : "Payroll entry created");
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("payroll").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Payroll entry deleted"); fetchData(); }
  };

  const filtered = records.filter((r) => {
    const name = getEmployeeName(r.user_id).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const netPreview = (parseFloat(form.basic_salary) || 0) + (parseFloat(form.allowances) || 0) - (parseFloat(form.deductions) || 0);

  // Employees without payroll for this month
  const employeesWithPayroll = new Set(records.map((r) => r.user_id));
  const availableEmployees = editingId
    ? employees
    : employees.filter((e) => !employeesWithPayroll.has(e.id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll Management</h1>
            <p className="text-muted-foreground mt-1">Manage employee salaries</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Payroll Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Payroll" : "New Payroll Entry"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <Select value={form.user_id} onValueChange={(val) => setForm({ ...form, user_id: val })} disabled={!!editingId}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {(editingId ? employees : availableEmployees).map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Basic Salary *</Label>
                  <Input type="number" min="0" step="0.01" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} placeholder="e.g. 5000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Allowances</Label>
                    <Input type="number" min="0" step="0.01" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Deductions</Label>
                    <Input type="number" min="0" step="0.01" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} />
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-xs text-muted-foreground">Net Salary</p>
                  <p className="text-xl font-bold text-foreground">{netPreview.toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={2} />
                </div>
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Update" : "Create"} Payroll Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-44"
          />
        </div>

        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payroll records for {format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">{getEmployeeName(rec.user_id)}</TableCell>
                        <TableCell className="text-right font-mono">{Number(rec.basic_salary).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{Number(rec.allowances).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{Number(rec.deductions).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{Number(rec.net_salary).toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{rec.notes || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(rec)} title="Edit">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(rec.id)} title="Delete">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
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
    </DashboardLayout>
  );
}
