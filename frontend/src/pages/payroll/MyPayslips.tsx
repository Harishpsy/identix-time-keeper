import { useEffect, useState } from "react";
import apiClient, { API_BASE_URL } from "@/lib/apiClient";
import { API } from "@/lib/endpoints";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PayslipDocument from "@/components/payroll/PayslipDocument";
import { Download, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { format, parse, addMonths, setDate, isBefore } from "date-fns";
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
  epf_employer: number;
  esi_employer: number;
  gross_earnings: number;
  total_deductions: number;
  net_salary: number;
  paid_days: number;
  lop_days: number;
  notes: string | null;
  released: boolean;
}

export default function MyPayslips() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchPayroll = async () => {
      try {
        const { data } = await apiClient.get(API.PAYROLL.LIST);
        setRecords((data as unknown as PayrollRecord[]) || []);
      } catch (err) {
        toast.error("Failed to fetch payslips");
      }
    };
    fetchPayroll();
  }, [user]);

  const openPayslipView = (rec: PayrollRecord) => {
    setViewingPayslip(rec);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Payslips</h1>
        <p className="text-muted-foreground mt-1">View and download your salary payslips</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Basic</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Salary</TableHead>
                  <TableHead className="text-center">Days</TableHead>
                  <TableHead>Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const now = new Date();
                  const visibleRecords = records.filter((rec) => {
                    if (rec.released) return true;
                    const payrollMonth = parse(rec.month, "yyyy-MM-dd", new Date());
                    const availableFrom = setDate(addMonths(payrollMonth, 1), 10);
                    return !isBefore(now, availableFrom);
                  });
                  if (visibleRecords.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No payslips available yet. Payslips are released on the 10th of each month.
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return visibleRecords.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">
                        {format(parse(rec.month, "yyyy-MM-dd", new Date()), "MMMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">₹{Number(rec.basic_salary).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">₹{Number(rec.gross_earnings).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-destructive">₹{Number(rec.total_deductions).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">₹{Number(rec.net_salary).toFixed(2)}</TableCell>
                      <TableCell className="text-center text-sm">{rec.paid_days - rec.lop_days}/{rec.paid_days}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openPayslipView(rec)} title="View Payslip">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewingPayslip} onOpenChange={(open) => { if (!open) setViewingPayslip(null); }}>
        <DialogContent className="max-w-[760px] p-0 border-none bg-transparent shadow-none print:p-0 print:m-0 print:max-w-none print:w-full [&>button]:bg-white [&>button]:text-gray-900 [&>button]:shadow-md [&>button]:border [&>button]:border-gray-200 [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:right-6 [&>button]:top-6 [&>button_svg]:w-4 [&>button_svg]:h-4">
          {viewingPayslip && (
            <div className="max-h-[85vh] overflow-y-auto rounded-xl print:max-h-none print:overflow-visible relative">
              <PayslipDocument
                record={viewingPayslip as any}
                employeeName={profile?.full_name || "Employee"}
                employeeEmail={profile?.email || ""}
                employeeId={profile?.biometric_id || "—"}
                onClose={() => setViewingPayslip(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
