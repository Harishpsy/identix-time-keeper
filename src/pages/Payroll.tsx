import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Pencil, Trash2, Loader2, Users, Download, Send } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PayrollRecord {
  id: string;
  user_id: string;
  month: string;
  basic_salary: number;
  hra: number;
  dearness_allowance: number;
  conveyance_allowance: number;
  medical_allowance: number;
  special_allowance: number;
  overtime: number;
  bonus: number;
  other_earnings: number;
  epf_employee: number;
  esi_employee: number;
  professional_tax: number;
  tds: number;
  loan_recovery: number;
  other_deductions: number;
  gross_earnings: number;
  total_deductions: number;
  net_salary: number;
  epf_employer: number;
  esi_employer: number;
  paid_days: number;
  lop_days: number;
  notes: string | null;
  created_at: string;
  released: boolean;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  biometric_id: string | null;
  date_of_joining: string | null;
}

const defaultForm = {
  user_id: "",
  basic_salary: "",
  hra: "0",
  dearness_allowance: "0",
  conveyance_allowance: "0",
  medical_allowance: "0",
  special_allowance: "0",
  overtime: "0",
  bonus: "0",
  other_earnings: "0",
  epf_employee: "0",
  esi_employee: "0",
  professional_tax: "0",
  tds: "0",
  loan_recovery: "0",
  other_deductions: "0",
  epf_employer: "0",
  esi_employer: "0",
  paid_days: "30",
  lop_days: "0",
  notes: "",
};

export default function Payroll() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [form, setForm] = useState({ ...defaultForm });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const monthDate = `${selectedMonth}-01`;
    const [{ data: payrollData }, { data: empData }] = await Promise.all([
      supabase.from("payroll").select("*").eq("month", monthDate).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, biometric_id, date_of_joining").eq("is_active", true).order("full_name"),
    ]);
    setRecords((payrollData as unknown as PayrollRecord[]) || []);
    setEmployees(empData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedMonth]);

  const getEmployeeName = (userId: string) =>
    employees.find((e) => e.id === userId)?.full_name || "Unknown";

  const getEmployeeEmail = (userId: string) =>
    employees.find((e) => e.id === userId)?.email || "";

  const getEmployeeId = (userId: string) =>
    employees.find((e) => e.id === userId)?.biometric_id || "—";

  const getEmployeeDOJ = (userId: string) => {
    const doj = employees.find((e) => e.id === userId)?.date_of_joining;
    return doj ? format(new Date(doj), "dd MMM yyyy") : "—";
  };

  const downloadPayslip = (rec: PayrollRecord) => {
    const monthLabel = format(parse(rec.month, "yyyy-MM-dd", new Date()), "MMMM yyyy");
    const empName = getEmployeeName(rec.user_id);
    const empEmail = getEmployeeEmail(rec.user_id);

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pw, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("PAYSLIP", pw / 2, 16, { align: "center" });
    doc.setFontSize(10);
    doc.text(monthLabel, pw / 2, 24, { align: "center" });
    doc.text("Confidential", pw / 2, 30, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Employee Name: ${empName}`, 14, 45);
    doc.text(`Email: ${empEmail}`, 14, 52);
    doc.text(`Paid Days: ${rec.paid_days - rec.lop_days} / ${rec.paid_days}`, pw - 14, 45, { align: "right" });
    doc.text(`LOP Days: ${rec.lop_days}`, pw - 14, 52, { align: "right" });

    const earnings = [
      ["Basic Salary", rec.basic_salary],
      ["HRA", rec.hra],
      ["Dearness Allowance", rec.dearness_allowance],
      ["Conveyance Allowance", rec.conveyance_allowance],
      ["Medical Allowance", rec.medical_allowance],
      ["Special Allowance", rec.special_allowance],
      ["Overtime", rec.overtime],
      ["Bonus", rec.bonus],
      ["Other Earnings", rec.other_earnings],
    ].filter(([, v]) => Number(v) > 0);

    const deductions = [
      ["EPF (Employee)", rec.epf_employee],
      ["ESI (Employee)", rec.esi_employee],
      ["Professional Tax", rec.professional_tax],
      ["TDS / Income Tax", rec.tds],
      ["Loan Recovery", rec.loan_recovery],
      ["Other Deductions", rec.other_deductions],
    ].filter(([, v]) => Number(v) > 0);

    const maxRows = Math.max(earnings.length, deductions.length);
    const tableBody: (string | number)[][] = [];
    for (let i = 0; i < maxRows; i++) {
      tableBody.push([
        (earnings[i]?.[0] as string) || "",
        earnings[i] ? `₹${Number(earnings[i][1]).toFixed(2)}` : "",
        (deductions[i]?.[0] as string) || "",
        deductions[i] ? `₹${Number(deductions[i][1]).toFixed(2)}` : "",
      ]);
    }
    tableBody.push([
      "Gross Earnings", `₹${Number(rec.gross_earnings).toFixed(2)}`,
      "Total Deductions", `₹${Number(rec.total_deductions).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["Earnings", "Amount (₹)", "Deductions", "Amount (₹)"]],
      body: tableBody,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 3: { halign: "right" } },
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [235, 245, 255];
        }
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 160;

    doc.setFillColor(41, 128, 185);
    doc.roundedRect(14, finalY + 8, pw - 28, 20, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("Net Salary (Take Home)", 20, finalY + 20);
    doc.setFontSize(16);
    doc.text(`₹${Number(rec.net_salary).toFixed(2)}`, pw - 20, finalY + 21, { align: "right" });

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text("This is a system-generated payslip. No signature required.", pw / 2, finalY + 38, { align: "center" });

    doc.save(`payslip-${empName.replace(/\s+/g, "-").toLowerCase()}-${format(parse(rec.month, "yyyy-MM-dd", new Date()), "yyyy-MM")}.pdf`);
    toast.success("Payslip downloaded");
  };

  const resetForm = () => { setForm({ ...defaultForm }); setEditingId(null); };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  // When employee is selected for a new entry, carry forward their latest payroll data
  const handleEmployeeSelect = async (userId: string) => {
    setForm((prev) => ({ ...prev, user_id: userId }));
    if (editingId) return; // Don't carry forward when editing

    const { data } = await supabase
      .from("payroll")
      .select("*")
      .eq("user_id", userId)
      .order("month", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const prev = data[0] as unknown as PayrollRecord;
      setForm({
        user_id: userId,
        basic_salary: prev.basic_salary.toString(),
        hra: prev.hra.toString(),
        dearness_allowance: prev.dearness_allowance.toString(),
        conveyance_allowance: prev.conveyance_allowance.toString(),
        medical_allowance: prev.medical_allowance.toString(),
        special_allowance: prev.special_allowance.toString(),
        overtime: "0",
        bonus: "0",
        other_earnings: "0",
        epf_employee: prev.epf_employee.toString(),
        esi_employee: prev.esi_employee.toString(),
        professional_tax: prev.professional_tax.toString(),
        tds: prev.tds.toString(),
        loan_recovery: prev.loan_recovery.toString(),
        other_deductions: prev.other_deductions.toString(),
        epf_employer: prev.epf_employer.toString(),
        esi_employer: prev.esi_employer.toString(),
        paid_days: prev.paid_days.toString(),
        lop_days: "0",
        notes: "",
      });
      toast.info("Salary details carried forward from previous month. Adjust as needed.");
    }
  };

  const openEdit = (rec: PayrollRecord) => {
    setEditingId(rec.id);
    setForm({
      user_id: rec.user_id,
      basic_salary: rec.basic_salary.toString(),
      hra: rec.hra.toString(),
      dearness_allowance: rec.dearness_allowance.toString(),
      conveyance_allowance: rec.conveyance_allowance.toString(),
      medical_allowance: rec.medical_allowance.toString(),
      special_allowance: rec.special_allowance.toString(),
      overtime: rec.overtime.toString(),
      bonus: rec.bonus.toString(),
      other_earnings: rec.other_earnings.toString(),
      epf_employee: rec.epf_employee.toString(),
      esi_employee: rec.esi_employee.toString(),
      professional_tax: rec.professional_tax.toString(),
      tds: rec.tds.toString(),
      loan_recovery: rec.loan_recovery.toString(),
      other_deductions: rec.other_deductions.toString(),
      epf_employer: rec.epf_employer.toString(),
      esi_employer: rec.esi_employer.toString(),
      paid_days: rec.paid_days.toString(),
      lop_days: rec.lop_days.toString(),
      notes: rec.notes || "",
    });
    setDialogOpen(true);
  };

  const n = (v: string) => parseFloat(v) || 0;

  const grossPreview = n(form.basic_salary) + n(form.hra) + n(form.dearness_allowance) + n(form.conveyance_allowance) + n(form.medical_allowance) + n(form.special_allowance) + n(form.overtime) + n(form.bonus) + n(form.other_earnings);
  const deductionsPreview = n(form.epf_employee) + n(form.esi_employee) + n(form.professional_tax) + n(form.tds) + n(form.loan_recovery) + n(form.other_deductions);
  const netPreview = grossPreview - deductionsPreview;

  const handleSave = async () => {
    if (!form.user_id && n(form.basic_salary) <= 0) {
      toast.error("Employee and basic salary are required");
    } else if (!form.user_id) {
      toast.error("Please select an employee");
      return;
    } else if (n(form.basic_salary) <= 0) {
      toast.error("Basic salary is required");
      return;
    }
    if (n(form.basic_salary) < 0) {
      toast.error("Basic salary must be positive");
      return;
    }

    setSaving(true);
    const monthDate = `${selectedMonth}-01`;
    const payload = {
      user_id: form.user_id,
      month: monthDate,
      basic_salary: n(form.basic_salary),
      hra: n(form.hra),
      dearness_allowance: n(form.dearness_allowance),
      conveyance_allowance: n(form.conveyance_allowance),
      medical_allowance: n(form.medical_allowance),
      special_allowance: n(form.special_allowance),
      overtime: n(form.overtime),
      bonus: n(form.bonus),
      other_earnings: n(form.other_earnings),
      epf_employee: n(form.epf_employee),
      esi_employee: n(form.esi_employee),
      professional_tax: n(form.professional_tax),
      tds: n(form.tds),
      loan_recovery: n(form.loan_recovery),
      other_deductions: n(form.other_deductions),
      epf_employer: n(form.epf_employer),
      esi_employer: n(form.esi_employer),
      paid_days: parseInt(form.paid_days) || 30,
      lop_days: parseInt(form.lop_days) || 0,
      notes: form.notes.trim() || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("payroll").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("payroll").insert(payload));
    }

    if (error) {
      if (error.code === "23505") toast.error("Payroll entry already exists for this employee and month");
      else toast.error(error.message || "Failed to save");
    } else {
      toast.success(editingId ? "Payroll updated" : "Payroll created");
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("payroll").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetchData(); }
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    const monthDate = `${selectedMonth}-01`;
    
    // Get employees who already have payroll this month
    const existingUserIds = new Set(records.map((r) => r.user_id));
    
    // Get employees who DON'T have payroll this month yet
    const missingEmployees = employees.filter((e) => !existingUserIds.has(e.id));
    
    if (missingEmployees.length === 0) {
      toast.info("All active employees already have payroll for this month");
      setGenerating(false);
      return;
    }

    // For each missing employee, fetch their latest payroll record
    const insertPayloads: any[] = [];
    let skippedCount = 0;

    for (const emp of missingEmployees) {
      const { data } = await supabase
        .from("payroll")
        .select("*")
        .eq("user_id", emp.id)
        .order("month", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const prev = data[0] as unknown as PayrollRecord;
        insertPayloads.push({
          user_id: emp.id,
          month: monthDate,
          basic_salary: prev.basic_salary,
          hra: prev.hra,
          dearness_allowance: prev.dearness_allowance,
          conveyance_allowance: prev.conveyance_allowance,
          medical_allowance: prev.medical_allowance,
          special_allowance: prev.special_allowance,
          overtime: 0,
          bonus: 0,
          other_earnings: 0,
          epf_employee: prev.epf_employee,
          esi_employee: prev.esi_employee,
          professional_tax: prev.professional_tax,
          tds: prev.tds,
          loan_recovery: prev.loan_recovery,
          other_deductions: prev.other_deductions,
          epf_employer: prev.epf_employer,
          esi_employer: prev.esi_employer,
          paid_days: prev.paid_days,
          lop_days: 0,
          notes: "Auto-generated from previous month",
        });
      } else {
        skippedCount++;
      }
    }

    if (insertPayloads.length > 0) {
      const { error } = await supabase.from("payroll").insert(insertPayloads);
      if (error) {
        toast.error("Failed to generate payroll: " + error.message);
      } else {
        toast.success(`Payroll generated for ${insertPayloads.length} employee(s)`);
        if (skippedCount > 0) {
          toast.info(`${skippedCount} employee(s) skipped — no previous payroll record found. Add them manually.`);
        }
        fetchData();
      }
    } else {
      toast.warning("No employees with previous payroll data found. Please add payroll manually for first-time entries.");
    }

    setGenerating(false);
  };

  const filtered = records.filter((r) =>
    getEmployeeName(r.user_id).toLowerCase().includes(search.toLowerCase())
  );

  const employeesWithPayroll = new Set(records.map((r) => r.user_id));
  const availableEmployees = editingId ? employees : employees.filter((e) => !employeesWithPayroll.has(e.id));

  const renderNumField = (label: string, field: keyof typeof form) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min="0" step="0.01" value={form[field]} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} onClick={(e) => e.stopPropagation()} className="h-8 text-sm" />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll Management</h1>
            <p className="text-muted-foreground mt-1">Indian payroll standard — manage employee salaries</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleGenerateAll} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
              Generate All Payroll
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const monthDate = `${selectedMonth}-01`;
                const { error } = await supabase.from("payroll").update({ released: true } as any).eq("month", monthDate).eq("released", false);
                if (error) { toast.error("Failed to release payslips"); return; }
                toast.success("All payslips released for " + format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM yyyy"));
                fetchData();
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Release All
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Payroll
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Payroll" : "New Payroll Entry"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                {/* Employee & Days */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Employee *</Label>
                    <Select value={form.user_id} onValueChange={handleEmployeeSelect} disabled={!!editingId}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {(editingId ? employees : availableEmployees).map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {renderNumField("Paid Days", "paid_days")}
                  {renderNumField("LOP Days", "lop_days")}
                </div>

                <Separator />

                {/* Earnings */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Earnings</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {renderNumField("Basic Salary *", "basic_salary")}
                    {renderNumField("HRA", "hra")}
                    {renderNumField("Dearness Allowance (DA)", "dearness_allowance")}
                    {renderNumField("Conveyance Allowance", "conveyance_allowance")}
                    {renderNumField("Medical Allowance", "medical_allowance")}
                    {renderNumField("Special Allowance", "special_allowance")}
                    {renderNumField("Overtime", "overtime")}
                    {renderNumField("Bonus", "bonus")}
                    {renderNumField("Other Earnings", "other_earnings")}
                  </div>
                  <div className="mt-2 text-right text-sm font-medium text-foreground">
                    Gross Earnings: <span className="font-bold">₹{grossPreview.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                {/* Deductions */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Deductions</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {renderNumField("EPF (Employee)", "epf_employee")}
                    {renderNumField("ESI (Employee)", "esi_employee")}
                    {renderNumField("Professional Tax", "professional_tax")}
                    {renderNumField("TDS / Income Tax", "tds")}
                    {renderNumField("Loan Recovery", "loan_recovery")}
                    {renderNumField("Other Deductions", "other_deductions")}
                  </div>
                  <div className="mt-2 text-right text-sm font-medium text-foreground">
                    Total Deductions: <span className="font-bold">₹{deductionsPreview.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                {/* Employer Contributions */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Employer Contributions</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {renderNumField("EPF (Employer)", "epf_employer")}
                    {renderNumField("ESI (Employer)", "esi_employer")}
                  </div>
                </div>

                <Separator />

                {/* Net Salary */}
                <div className="rounded-lg bg-primary/10 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Net Salary (Take Home)</p>
                  <p className="text-2xl font-bold text-primary">₹{netPreview.toFixed(2)}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={2} className="text-sm" />
                </div>

                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Update" : "Create"} Payroll Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-44" />
        </div>

        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                 <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Emp ID</TableHead>
                    <TableHead>DOJ</TableHead>
                    <TableHead className="text-right">Basic</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No payroll records for {format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">{getEmployeeName(rec.user_id)}</TableCell>
                        <TableCell className="font-mono text-sm">{getEmployeeId(rec.user_id)}</TableCell>
                        <TableCell className="text-sm">{getEmployeeDOJ(rec.user_id)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">₹{Number(rec.basic_salary).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">₹{Number(rec.gross_earnings).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-destructive">₹{Number(rec.total_deductions).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">₹{Number(rec.net_salary).toFixed(2)}</TableCell>
                        <TableCell className="text-center text-sm">{rec.paid_days - rec.lop_days}/{rec.paid_days}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant={rec.released ? "default" : "outline"}
                              size="sm"
                              onClick={async () => {
                                const newVal = !rec.released;
                                const { error } = await supabase.from("payroll").update({ released: newVal } as any).eq("id", rec.id);
                                if (error) { toast.error("Failed to update release status"); return; }
                                toast.success(newVal ? "Payslip released to employee" : "Payslip release revoked");
                                fetchData();
                              }}
                              title={rec.released ? "Revoke early release" : "Release to employee now"}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => downloadPayslip(rec)} title="Download Payslip">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(rec)} title="Edit">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: rec.id, name: getEmployeeName(rec.user_id) })} title="Delete">
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


        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payroll Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the payroll entry for <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) {
                    handleDelete(deleteTarget.id);
                    setDeleteTarget(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
