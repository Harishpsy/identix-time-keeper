import { useEffect, useState } from "react";
import apiClient, { API_BASE_URL } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Download, FileText } from "lucide-react";
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

  useEffect(() => {
    if (!user) return;
    const fetchPayroll = async () => {
      try {
        const { data } = await apiClient.get("/payroll");
        setRecords((data as unknown as PayrollRecord[]) || []);
      } catch (err) {
        toast.error("Failed to fetch payslips");
      }
    };
    fetchPayroll();
  }, [user]);

  const downloadPayslip = async (rec: PayrollRecord) => {
    const monthLabel = format(parse(rec.month, "yyyy-MM-dd", new Date()), "MMMM yyyy");
    const empName = profile?.full_name || "Employee";

    // Fetch company branding
    try {
      const { data: brandingData } = await apiClient.get("/settings");
      const companyName = brandingData?.company_name || "PAYSLIP";
      const companyAddress = brandingData?.company_address || "";
      const logoUrl = brandingData?.logo_url || "";
      const brandHex = brandingData?.brand_color || "#2980B9";
      const textHex = brandingData?.text_color || "#FFFFFF";
      const hexToRgb = (hex: string): [number, number, number] => {
        const h = hex.replace("#", "");
        return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
      };
      const brandRgb = hexToRgb(brandHex);
      const textRgb = hexToRgb(textHex);

      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();

      // Load logo if available
      let logoDataUrl: string | null = null;
      if (logoUrl) {
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = "anonymous";
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = logoUrl;
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          logoDataUrl = canvas.toDataURL("image/png");
        } catch {
          logoDataUrl = null;
        }
      }

      // Header
      const headerHeight = companyAddress ? 42 : 35;
      doc.setFillColor(...brandRgb);
      doc.rect(0, 0, pw, headerHeight, "F");

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", 10, 4, 18, 18);
      }

      doc.setTextColor(...textRgb);
      doc.setFontSize(18);
      doc.text(companyName, pw / 2, 14, { align: "center" });
      doc.setFontSize(9);
      if (companyAddress) {
        doc.text(companyAddress, pw / 2, 21, { align: "center" });
        doc.setFontSize(10);
        doc.text(`Payslip - ${monthLabel}`, pw / 2, 29, { align: "center" });
        doc.text("Confidential", pw / 2, 35, { align: "center" });
      } else {
        doc.text(monthLabel, pw / 2, 22, { align: "center" });
        doc.text("Confidential", pw / 2, 28, { align: "center" });
      }

      const infoY = headerHeight + 10;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Employee Name: ${empName}`, 14, infoY);
      doc.text(`Email: ${profile?.email || ""}`, 14, infoY + 7);
      doc.text(`Paid Days: ${rec.paid_days - rec.lop_days} / ${rec.paid_days}`, pw - 14, infoY, { align: "right" });
      doc.text(`LOP Days: ${rec.lop_days}`, pw - 14, infoY + 7, { align: "right" });

      // Earnings & Deductions side by side
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
          earnings[i] ? `Rs.${Number(earnings[i][1]).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "",
          (deductions[i]?.[0] as string) || "",
          deductions[i] ? `Rs.${Number(deductions[i][1]).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "",
        ]);
      }
      tableBody.push([
        "Gross Earnings",
        `Rs.${Number(rec.gross_earnings).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        "Total Deductions",
        `Rs.${Number(rec.total_deductions).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      ]);

      autoTable(doc, {
        startY: infoY + 15,
        head: [["Earnings", "Amount (Rs.)", "Deductions", "Amount (Rs.)"]],
        body: tableBody,
        styles: { fontSize: 9, cellPadding: 4, font: "helvetica" },
        headStyles: { fillColor: brandRgb, textColor: textRgb, fontStyle: "bold", halign: "left" },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 35, halign: "right" },
          2: { cellWidth: 55 },
          3: { cellWidth: 35, halign: "right" },
        },
        tableWidth: pw - 28,
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [235, 245, 255];
          }
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 160;

      // Net Salary box
      doc.setFillColor(...brandRgb);
      doc.roundedRect(14, finalY + 8, pw - 28, 20, 3, 3, "F");
      doc.setTextColor(...textRgb);
      doc.setFontSize(12);
      doc.text("Net Salary (Take Home)", 20, finalY + 20);
      doc.setFontSize(16);
      doc.text(`Rs.${Number(rec.net_salary).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pw - 20, finalY + 21, { align: "right" });

      // Footer
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text("This is a system-generated payslip. No signature required.", pw / 2, finalY + 38, { align: "center" });

      doc.save(`payslip-${empName.replace(/\s+/g, "-").toLowerCase()}-${format(parse(rec.month, "yyyy-MM-dd", new Date()), "yyyy-MM")}.pdf`);
      toast.success("Payslip downloaded");
    } catch (err) {
      toast.error("Failed to generate payslip");
    }
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
                        <Button variant="ghost" size="sm" onClick={() => downloadPayslip(rec)} title="Download Payslip">
                          <Download className="w-4 h-4 mr-1" />
                          PDF
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
    </div>
  );
}
