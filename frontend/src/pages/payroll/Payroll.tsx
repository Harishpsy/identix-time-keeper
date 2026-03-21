import React, { useEffect, useState, useRef } from "react";
import apiClient, { API_BASE_URL } from "@/lib/apiClient";
import { API } from "@/lib/endpoints";
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
import { Search, Plus, Pencil, Trash2, Loader2, Users, Download, Send, Info, HelpCircle, AlertCircle, CheckCircle2, Eye, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PayslipDocument from "@/components/payroll/PayslipDocument";

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
  ctc_salary: "0",
  basic_salary: "0",
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

const calculateTDS = (gross: number, epfEmp: number) => {
  const annualTaxable = (gross - epfEmp) * 12 - 75000;
  if (annualTaxable <= 1200000) return 0;

  let tax = 0;
  let remaining = annualTaxable;

  const slabs = [
    { limit: 400000, rate: 0 },
    { limit: 800000, rate: 0.05 },
    { limit: 1200000, rate: 0.10 },
    { limit: 1600000, rate: 0.15 },
    { limit: 2000000, rate: 0.20 },
    { limit: 2400000, rate: 0.25 },
    { limit: Infinity, rate: 0.30 },
  ];

  let prevLimit = 0;
  for (const slab of slabs) {
    if (annualTaxable > prevLimit) {
      const taxableInSlab = Math.min(annualTaxable, slab.limit) - prevLimit;
      tax += taxableInSlab * slab.rate;
      prevLimit = slab.limit;
    } else break;
  }

  return tax / 12;
};

const getPT = (grossPrice: number) => {
  if (grossPrice <= 5000) return 0;
  if (grossPrice <= 7500) return 75;
  if (grossPrice <= 10000) return 120;
  if (grossPrice <= 15000) return 150;
  return 200;
};

export default function Payroll() {
  const overridesRef = useRef<Record<string, boolean>>({});
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
  const [isAutoCalculate, setIsAutoCalculate] = useState(true);
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState<string | null>(null);
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const monthDate = `${selectedMonth}-01`;
    try {
      const [{ data: payrollData }, { data: profileData }] = await Promise.all([
        apiClient.get(API.PAYROLL.LIST, { params: { month: monthDate } }),
        apiClient.get(API.PROFILES.LIST),
      ]);
      setRecords((payrollData as unknown as PayrollRecord[]) || []);
      setEmployees(profileData || []);
    } catch (err) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
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

  const openPayslipView = (rec: PayrollRecord) => {
    setViewingPayslip(rec);
  };

  const resetForm = () => {
    setForm({ ...defaultForm, user_id: "", ctc_salary: "0" });
    setEditingId(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  // When employee is selected for a new entry, carry forward their latest payroll data
  const handleEmployeeSelect = async (userId: string) => {
    setForm((prev) => ({ ...prev, user_id: userId }));
    if (editingId) return; // Don't carry forward when editing

    const s = (v: any) => (v ?? 0).toString();

    try {
      const [{ data }, { data: daysData }] = await Promise.all([
        apiClient.get(API.PAYROLL.LIST, { params: { user_id: userId, limit: 1 } }),
        apiClient.get(API.PAYROLL.CALCULATE_DAYS, { params: { user_id: userId, month: selectedMonth } })
      ]);

      if (data && data.length > 0) {
        const prev = data[0] as unknown as PayrollRecord;
        setForm({
          user_id: userId,
          ctc_salary: s(prev.gross_earnings + prev.epf_employer + prev.esi_employer),
          basic_salary: s(prev.basic_salary),
          hra: s(prev.hra),
          dearness_allowance: s(prev.dearness_allowance),
          conveyance_allowance: s(prev.conveyance_allowance),
          medical_allowance: s(prev.medical_allowance),
          special_allowance: s(prev.special_allowance),
          overtime: s(prev.overtime),
          bonus: s(prev.bonus),
          other_earnings: s(prev.other_earnings),
          epf_employee: s(prev.epf_employee),
          esi_employee: s(prev.esi_employee),
          professional_tax: s(prev.professional_tax),
          tds: s(prev.tds),
          loan_recovery: s(prev.loan_recovery),
          other_deductions: s(prev.other_deductions),
          epf_employer: s(prev.epf_employer),
          esi_employer: s(prev.esi_employer),
          paid_days: s(daysData?.paid_days || prev.paid_days),
          lop_days: s(daysData?.lop_days || 0),
          notes: "",
        });
        toast.info("Salary details carried forward with auto-calculated days.");
      } else {
        setForm((prev) => ({
          ...prev,
          user_id: userId,
          paid_days: s(daysData?.paid_days || 30),
          lop_days: s(daysData?.lop_days || 0),
        }));
        toast.info("Auto-calculated days for the selected month.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const syncCalculations = (currentForm: typeof form) => {
    if (!isAutoCalculate) return currentForm; const s = (v: number) => v.toFixed(2);
    const ctc = n(currentForm.ctc_salary);
    const pd = n(currentForm.paid_days) || 30;
    const lop = n(currentForm.lop_days) || 0;

    let derivedGross = 0;
    if (ctc > 31800) { derivedGross = ctc - 1800; }
    else if (ctc > 22260) { derivedGross = ctc / 1.06; }
    else { derivedGross = ctc / 1.0925; }

    const basicAmount = n(currentForm.basic_salary);
    const hraAmount = n(currentForm.hra);

    const otherEarningsExceptSpecial =
      n(currentForm.dearness_allowance) +
      n(currentForm.conveyance_allowance) +
      n(currentForm.medical_allowance) +
      n(currentForm.overtime) +
      n(currentForm.bonus) +
      n(currentForm.other_earnings);

    // Special allowance always absorbs the difference to keep CTC/Gross stable
    const specialAmount = Math.max(0, derivedGross - (basicAmount + hraAmount + otherEarningsExceptSpecial));

    const finalGross = derivedGross * ((pd - lop) / pd);

    const epfEmp = Math.min(basicAmount, 15000) * 0.12;
    const esiEmp = finalGross <= 21000 ? finalGross * 0.0075 : 0;
    const pt = getPT(finalGross);
    const tds = calculateTDS(finalGross, epfEmp);

    const overrideEpfEmp = overridesRef.current.epf_employee ? n(currentForm.epf_employee) : epfEmp;
    const overrideEsiEmp = overridesRef.current.esi_employee ? n(currentForm.esi_employee) : esiEmp;
    const overridePt = overridesRef.current.professional_tax ? n(currentForm.professional_tax) : pt;
    const overrideTds = overridesRef.current.tds ? n(currentForm.tds) : tds;

    const epfEmr = Math.min(basicAmount, 15000) * 0.12;
    // Employer matches employee override if not explicitly overridden
    const overrideEpfEmr = overridesRef.current.epf_employer ? n(currentForm.epf_employer) : overrideEpfEmp;
    const overrideEsiEmr = overridesRef.current.esi_employer ? n(currentForm.esi_employer) : (overrideEsiEmp > 0 ? (finalGross <= 21000 ? finalGross * 0.0325 : 0) : 0);

    return {
      ...currentForm,
      special_allowance: s(specialAmount),
      epf_employee: s(overrideEpfEmp),
      esi_employee: s(overrideEsiEmp),
      professional_tax: s(overridePt),
      tds: s(overrideTds),
      epf_employer: s(overrideEpfEmr),
      esi_employer: s(overrideEsiEmr),
    };
  };

  const updateForm = (updates: Partial<typeof form>, markOverride = false) => {
    if (markOverride) {
      Object.keys(updates).forEach((k) => { overridesRef.current[k] = true; });
    }
    setForm((prev) => {
      let next = { ...prev, ...updates };

      // If CTC changes specifically, we reset the percentages for a clean slate
      if ("ctc_salary" in updates) {
        const gn = n(updates.ctc_salary) > 31800 ? n(updates.ctc_salary) - 1800 : n(updates.ctc_salary) / 1.0925;
        next.basic_salary = (gn * 0.5).toFixed(2);
        next.hra = (gn * 0.5 * 0.4).toFixed(2);
        overridesRef.current = {};
      }

      return syncCalculations(next);
    });
  };

  const openEdit = (rec: PayrollRecord) => {
    const s = (v: any) => (v ?? 0).toString();
    setEditingId(rec.id);
    setForm({
      user_id: rec.user_id,
      ctc_salary: s(Number(rec.gross_earnings) + Number(rec.epf_employer) + Number(rec.esi_employer)),
      basic_salary: s(rec.basic_salary),
      hra: s(rec.hra),
      dearness_allowance: s(rec.dearness_allowance),
      conveyance_allowance: s(rec.conveyance_allowance),
      medical_allowance: s(rec.medical_allowance),
      special_allowance: s(rec.special_allowance),
      overtime: s(rec.overtime),
      bonus: s(rec.bonus),
      other_earnings: s(rec.other_earnings),
      epf_employee: s(rec.epf_employee),
      esi_employee: s(rec.esi_employee),
      professional_tax: s(rec.professional_tax),
      tds: s(rec.tds),
      loan_recovery: s(rec.loan_recovery),
      other_deductions: s(rec.other_deductions),
      epf_employer: s(rec.epf_employer),
      esi_employer: s(rec.esi_employer),
      paid_days: s(rec.paid_days),
      lop_days: s(rec.lop_days),
      notes: rec.notes || "",
    });
    setDialogOpen(true);
  };

  const n = (v: string) => parseFloat(v) || 0;

  const currentSynced = syncCalculations(form);
  const grossPreview = (
    n(currentSynced.basic_salary) +
    n(currentSynced.hra) +
    n(currentSynced.dearness_allowance) +
    n(currentSynced.conveyance_allowance) +
    n(currentSynced.medical_allowance) +
    n(currentSynced.special_allowance) +
    n(currentSynced.overtime) +
    n(currentSynced.bonus) +
    n(currentSynced.other_earnings)
  ) * ((n(currentSynced.paid_days) - n(currentSynced.lop_days)) / (n(currentSynced.paid_days) || 1));

  const deductionsPreview =
    n(currentSynced.epf_employee) +
    n(currentSynced.esi_employee) +
    n(currentSynced.professional_tax) +
    n(currentSynced.tds) +
    n(currentSynced.loan_recovery) +
    n(currentSynced.other_deductions);

  const netPreview = grossPreview - deductionsPreview;
  const ctcPreview = grossPreview + n(currentSynced.epf_employer) + n(currentSynced.esi_employer);

  const handleSave = async () => {
    const data = syncCalculations(form);
    if (!data.user_id) {
      toast.error("Please select an employee");
      return;
    }
    if (n(data.basic_salary) <= 0) {
      toast.error("Basic salary is required");
      return;
    }

    setSaving(true);
    const monthDate = `${selectedMonth}-01`;
    const payload = {
      user_id: data.user_id,
      month: monthDate,
      basic_salary: n(data.basic_salary),
      hra: n(data.hra),
      dearness_allowance: n(data.dearness_allowance),
      conveyance_allowance: n(data.conveyance_allowance),
      medical_allowance: n(data.medical_allowance),
      special_allowance: n(data.special_allowance),
      overtime: n(data.overtime),
      bonus: n(data.bonus),
      other_earnings: n(data.other_earnings),
      epf_employee: n(data.epf_employee),
      esi_employee: n(data.esi_employee),
      professional_tax: n(data.professional_tax),
      tds: n(data.tds),
      loan_recovery: n(data.loan_recovery),
      other_deductions: n(data.other_deductions),
      epf_employer: n(data.epf_employer),
      esi_employer: n(data.esi_employer),
      gross_earnings: grossPreview,
      total_deductions: deductionsPreview,
      net_salary: netPreview,
      paid_days: parseInt(data.paid_days) || 30,
      lop_days: parseInt(data.lop_days) || 0,
      notes: data.notes.trim() || null,
    };

    try {
      if (editingId) {
        await apiClient.patch(API.PAYROLL.BY_ID(editingId), payload);
      } else {
        await apiClient.post(API.PAYROLL.CREATE, payload);
      }
      toast.success(editingId ? "Payroll updated" : "Payroll created");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(API.PAYROLL.BY_ID(id));
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    setGenProgress(0);
    const monthDate = `${selectedMonth}-01`;
    try {
      setGenStep("Fetching attendance...");
      setGenProgress(20);
      await new Promise(r => setTimeout(r, 600));

      setGenStep("Applying LOP & Leaves...");
      setGenProgress(40);
      await new Promise(r => setTimeout(r, 600));

      setGenStep("Calculating taxes & statutory...");
      setGenProgress(70);
      await new Promise(r => setTimeout(r, 600));

      const { data } = await apiClient.post(API.PAYROLL.GENERATE, { month: monthDate });

      setGenStep("Finalizing...");
      setGenProgress(90);
      await new Promise(r => setTimeout(r, 400));

      setGenProgress(100);
      toast.success(data.message);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to generate payroll");
    } finally {
      setTimeout(() => {
        setGenerating(false);
        setGenStep(null);
        setGenProgress(0);
      }, 500);
    }
  };

  const filtered = records.filter((r) =>
    getEmployeeName(r.user_id).toLowerCase().includes(search.toLowerCase())
  );

  const employeesWithPayroll = new Set(records.map((r) => r.user_id));
  const availableEmployees = editingId ? employees : employees.filter((e) => !employeesWithPayroll.has(e.id));

  const renderField = (label: string, field: keyof typeof form, helpText?: string) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-[13px] font-medium text-gray-700">{label}</Label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>{helpText}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input
        type="number"
        value={(form as any)[field]}
        onChange={(e) => updateForm({ [field]: e.target.value })}
        className="h-10 bg-white border-gray-200 focus-visible:ring-[#185FA5] transition-all"
      />
    </div>
  );

  const renderAutoFilledField = (label: string, field: keyof typeof form, helpText?: string, badgeText?: string, subLabel?: string) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-[13px] font-medium text-gray-700">{label}</Label>
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>{helpText}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {badgeText && (
          <Badge className={`px-1.5 py-0 rounded text-[10px] border-none ${isAutoCalculate ? "bg-[#EAF3DE] text-[#4A6D1E]" : "bg-gray-100 text-gray-500"}`}>
            {badgeText}
          </Badge>
        )}
      </div>
      <Input
        value={(currentSynced as any)[field]}
        onChange={(e) => updateForm({ [field]: e.target.value }, true)}
        className={`h-10 border-gray-200 transition-colors ${(!overridesRef.current[field] && isAutoCalculate) ? "bg-[#EAF3DE]/40 focus-visible:ring-[#4A6D1E]" : "bg-white focus-visible:ring-[#185FA5]"}`}
      />
      {subLabel && <p className="text-[10px] text-gray-500 font-medium">{subLabel}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payroll Management</h1>
          <p className="text-muted-foreground mt-1">Indian payroll standard — manage employee salaries</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Button
              variant="outline"
              onClick={handleGenerateAll}
              disabled={generating}
              className="relative overflow-hidden border-[#185FA5] text-[#185FA5] hover:bg-[#E6F1FB] min-w-[200px]"
            >
              {generating ? (
                <div className="flex items-center justify-center w-full bg-white absolute inset-0 z-10">
                  <div className="w-full px-4 text-center">
                    <p className="text-[10px] uppercase tracking-tighter font-bold mb-1 animate-pulse">{genStep}</p>
                    <Progress value={genProgress} className="h-1 bg-blue-100" />
                  </div>
                </div>
              ) : null}
              <Users className="w-4 h-4 mr-2" />
              Generate All Payroll
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              const monthDate = `${selectedMonth}-01`;
              try {
                await apiClient.post(API.PAYROLL.RELEASE_ALL, { month: monthDate });
                toast.success("All payslips released for " + format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM yyyy"));
                fetchData();
              } catch (err) {
                toast.error("Failed to release payslips");
              }
            }}
          >
            <Send className="w-4 h-4 mr-2" />
            Release All
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} data-tour="payroll-add">
                <Plus className="w-4 h-4 mr-2" />
                Add Payroll
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
                <DialogTitle className="text-[17px] font-medium text-[#1A1A1A]">
                  {editingId ? "Edit Payroll Entry" : "New Payroll Entry"}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <Badge className={`px-2 py-0.5 rounded-full text-[11px] font-medium border-none ${isAutoCalculate ? "bg-[#E6F1FB] text-[#0C447C]" : "bg-gray-100 text-gray-600"}`}>
                    <RefreshCw className={`w-3 h-3 mr-1 ${isAutoCalculate ? "animate-spin" : ""}`} />
                    Auto-Calculate {isAutoCalculate ? "ON" : "OFF"}
                  </Badge>
                  <Switch
                    checked={isAutoCalculate}
                    onCheckedChange={setIsAutoCalculate}
                    className="data-[state=checked]:bg-[#185FA5]"
                  />
                  <div className="h-6 w-[1px] bg-gray-200 mx-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full" onClick={() => setDialogOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-8 bg-[#FBFBFB]">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-[13px] font-medium text-gray-700">Employee *</Label>
                    <Select value={form.user_id} onValueChange={handleEmployeeSelect} disabled={!!editingId}>
                      <SelectTrigger className="h-10 bg-white border-gray-200"><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {(editingId ? employees : availableEmployees).map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-medium text-gray-700">Paid Days</Label>
                    <Input type="number" value={form.paid_days} onChange={(e) => updateForm({ paid_days: e.target.value })} className="h-10 bg-white border-gray-200" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-medium text-gray-700">LOP Days</Label>
                    <Input type="number" value={form.lop_days} onChange={(e) => updateForm({ lop_days: e.target.value })} className="h-10 bg-white border-gray-200" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 border-gray-200">
                    <h3 className="text-[14px] font-semibold text-gray-800 uppercase tracking-wider">Earnings</h3>
                  </div>
                  <div className="bg-[#F5F7FA] p-4 rounded-lg mb-4 border border-dashed border-gray-300">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <Label className="text-[13px] font-bold text-[#185FA5] uppercase">Target Monthly CTC (Cost to Company)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <Input
                          type="number"
                          value={form.ctc_salary}
                          onChange={(e) => updateForm({ ctc_salary: e.target.value })}
                          className="h-12 pl-8 text-xl font-bold bg-white border-[#185FA5] text-[#185FA5] text-center focus-visible:ring-offset-0 focus-visible:ring-1"
                          placeholder="Enter Total CTC"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500">Gross and statutory components will calculate to match this CTC</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    {renderAutoFilledField("Basic Salary *", "basic_salary", "Derived from Gross (50%)", "50% gross")}
                    {renderAutoFilledField("HRA", "hra", "Derived from Basic (40%)", "40% basic")}
                    {renderField("DA", "dearness_allowance")}
                    {renderField("Conveyance Allowance", "conveyance_allowance")}
                    {renderField("Medical Allowance", "medical_allowance")}
                    {renderAutoFilledField("Special Allowance", "special_allowance", "Residual balance to match Gross", "Balance")}
                    {renderField("Overtime", "overtime")}
                    {renderField("Bonus", "bonus")}
                    {renderField("Other Earnings", "other_earnings")}
                  </div>
                  <div className="flex justify-end p-2 text-right">
                    <div>
                      <span className="text-[13px] text-gray-500 font-medium">Gross Earnings</span>
                      <div className="text-xl font-bold text-[#1A1A1A]">₹{grossPreview.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 border-gray-200">
                    <h3 className="text-[14px] font-semibold text-gray-800 uppercase tracking-wider">Deductions</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    {renderAutoFilledField("EPF (Employee)", "epf_employee", "12% of basic", "12% basic", "Capped at ₹1,800 | EPFO limit")}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] font-medium text-gray-700">ESI (Employee)</Label>
                        <Badge className={`px-1.5 py-0 rounded text-[10px] border-none ${grossPreview > 21000 ? "bg-amber-100 text-amber-700" : "bg-[#EAF3DE] text-[#4A6D1E]"}`}>
                          {grossPreview > 21000 ? "N/A (>₹21K)" : "0.75% gross"}
                        </Badge>
                      </div>
                      <Input value={currentSynced.esi_employee} onChange={(e) => updateForm({ esi_employee: e.target.value }, true)} className={`h-10 border-gray-200 ${(!overridesRef.current.esi_employee && isAutoCalculate) ? "bg-[#EAF3DE]/40" : "bg-white"}`} />
                      <p className="text-[10px] text-gray-500 font-medium">Applicable if gross ≤ ₹21,000</p>
                    </div>
                    {renderAutoFilledField("Professional Tax", "professional_tax", "Slab-based (Maharashtra)", "Slab auto")}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] font-medium text-gray-700">TDS / Income Tax</Label>
                        <TooltipProvider><Tooltip>
                          <TooltipTrigger asChild><Badge className={`px-1.5 py-0 rounded text-[10px] border-none ${n(currentSynced.tds) > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{n(currentSynced.tds) > 0 ? "New regime" : "No TDS"}</Badge></TooltipTrigger>
                          <TooltipContent>Based on New Tax Regime FY 2025-26.</TooltipContent>
                        </Tooltip></TooltipProvider>
                      </div>
                      <Input value={currentSynced.tds} onChange={(e) => updateForm({ tds: e.target.value }, true)} className={`h-10 border-gray-200 ${(!overridesRef.current.tds && isAutoCalculate) ? "bg-[#EAF3DE]/40" : "bg-white"}`} />
                      <p className="text-[10px] text-gray-500 font-medium">Projected taxable: ₹{Math.max(0, (grossPreview - n(currentSynced.epf_employee)) * 12 - 75000).toLocaleString("en-IN")}</p>
                    </div>
                    {renderField("Loan Recovery", "loan_recovery")}
                    {renderField("Other Deductions", "other_deductions")}
                  </div>
                  <div className="flex justify-end p-2 text-right">
                    <div>
                      <span className="text-[13px] text-red-600 font-medium">Total Deductions</span>
                      <div className="text-xl font-bold text-[#A32D2D]">₹{deductionsPreview.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 border-gray-200">
                    <h3 className="text-[14px] font-semibold text-gray-400 uppercase tracking-wider">Employer Contributions</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 opacity-80">
                    {renderAutoFilledField("EPF (Employer)", "epf_employer", "12% of basic", "12% basic")}
                    {renderAutoFilledField("ESI (Employer)", "esi_employer", "3.25% of gross", "3.25% gross")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-[#F5F7FA] border-t border-gray-100">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Gross Earnings</p>
                  <p className="text-lg font-bold text-gray-900">₹{grossPreview.toLocaleString("en-IN")}</p>
                </div>
                <div className="space-y-1 border-l pl-4 border-gray-200">
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Total Deductions</p>
                  <p className="text-lg font-bold text-[#A32D2D]">₹{(deductionsPreview + n(currentSynced.epf_employer) + n(currentSynced.esi_employer)).toLocaleString("en-IN")}</p>
                  <p className="text-[9px] text-gray-400 leading-none">Incl. Employer components</p>
                </div>
                <div className="space-y-1 border-l pl-4 border-gray-200">
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Employer Cost (CTC)</p>
                  <p className="text-lg font-bold text-[#185FA5]">₹{n(form.ctc_salary).toLocaleString("en-IN")}</p>
                </div>
                <div className="space-y-1 border-l pl-4 border-gray-200">
                  <p className="text-[11px] font-medium text-gray-500 uppercase">Net Take-Home</p>
                  <p className="text-xl font-black text-[#185FA5]">₹{netPreview.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 bg-white border-t sticky bottom-0 z-10">
                <Button variant="outline" onClick={resetForm} className="border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900">Reset</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-[#185FA5] hover:bg-[#154d86] px-8">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Payroll Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-full" />
        </div>
        <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full sm:w-44" data-tour="payroll-month" />
      </div>

      <Card className="border-border/50" data-tour="payroll-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[800px]">
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
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      No payroll records for {format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM yyyy")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((rec) => (
                    <TableRow key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium text-gray-900">{getEmployeeName(rec.user_id)}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{getEmployeeId(rec.user_id)}</TableCell>
                      <TableCell className="text-xs text-gray-500">{getEmployeeDOJ(rec.user_id)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">₹{Number(rec.basic_salary).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right font-mono text-sm">₹{Number(rec.gross_earnings).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-[#A32D2D] font-medium">₹{Number(rec.total_deductions).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right font-mono text-base font-bold text-[#185FA5]">₹{Number(rec.net_salary).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-normal text-gray-500 border-gray-200">
                          {rec.paid_days - rec.lop_days}/{rec.paid_days}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-[#185FA5]" onClick={() => openPayslipView(rec)} title="View Payslip">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-[#185FA5]" onClick={() => openEdit(rec)} title="Edit">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={() => setDeleteTarget({ id: rec.id, name: getEmployeeName(rec.user_id) })} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${rec.released ? "text-green-600" : "text-gray-400 hover:text-[#185FA5]"}`}
                            onClick={async () => {
                              const newVal = !rec.released;
                              try {
                                await apiClient.patch(API.PAYROLL.BY_ID(rec.id), { released: newVal });
                                toast.success(newVal ? "Payslip released" : "Release revoked");
                                fetchData();
                              } catch (err) {
                                toast.error("Failed to update");
                              }
                            }}
                            title={rec.released ? "Revoke release" : "Release now"}
                          >
                            <Send className="w-4 h-4" />
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

      <Dialog open={!!viewingPayslip} onOpenChange={(open) => { if (!open) setViewingPayslip(null); }}>
        <DialogContent className="max-w-[760px] p-0 border-none bg-transparent shadow-none print:p-0 print:m-0 print:max-w-none print:w-full [&>button]:bg-white [&>button]:text-gray-900 [&>button]:shadow-md [&>button]:border [&>button]:border-gray-200 [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:right-6 [&>button]:top-6 [&>button_svg]:w-4 [&>button_svg]:h-4">
          {viewingPayslip && (
            <div className="max-h-[85vh] overflow-y-auto rounded-xl print:max-h-none print:overflow-visible relative">
              <PayslipDocument
                record={viewingPayslip as any}
                employeeName={getEmployeeName(viewingPayslip.user_id)}
                employeeEmail={getEmployeeEmail(viewingPayslip.user_id)}
                employeeId={getEmployeeId(viewingPayslip.user_id)}
                onClose={() => setViewingPayslip(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
