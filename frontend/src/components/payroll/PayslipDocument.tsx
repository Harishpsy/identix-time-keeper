import React from 'react';
import { format, parse } from 'date-fns';
import { Share, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PayslipRecord {
  id: string;
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
}

interface PayslipDocumentProps {
  record: PayslipRecord;
  employeeName: string;
  employeeEmail: string;
  employeeId: string;
  onClose?: () => void;
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero Only";
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: number) => {
    let str = '';
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) str += a[Math.floor(n)];
      else {
        str += b[Math.floor(n / 10)] + ' ';
        if (n % 10 > 0) str += a[Math.floor(n % 10)];
      }
    }
    return str;
  };
  
  return inWords(Math.floor(num)).trim() + ' Only';
}

export default function PayslipDocument({ record, employeeName, employeeEmail, employeeId, onClose }: PayslipDocumentProps) {
  const monthLabel = format(parse(record.month, "yyyy-MM-dd", new Date()), "MMMM yyyy");
  
  const formatAmt = (val: number | string) => {
    const num = Number(val);
    if (num === 0) return "—";
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const borderStyle = { borderWidth: "0.5px", borderColor: "#E0E0E0" };

  return (
    <div className="bg-[#F5F5F5] min-h-full sm:p-8 print:p-0 print:bg-white flex items-center justify-center font-sans tracking-tight">
      {/* Outer Wrapper */}
      <div 
        className="w-full max-w-[720px] bg-white rounded-xl overflow-hidden print:border-none print:shadow-none print:rounded-none print:max-w-none print:overflow-visible"
        style={borderStyle}
      >
        {/* Section 1 - Header Bar */}
        <div className="bg-[#185FA5] px-8 py-7 flex justify-between items-start print:break-inside-avoid">
          <div>
            <h1 className="text-white text-[22px] font-medium leading-none mb-1.5">Identix</h1>
            <p className="text-[#B5D4F4] text-[12px]">IdentixHR Pvt. Ltd. | CIN: U74999MH2020PTC000001</p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-[#0C447C] text-[#B5D4F4] text-[11px] px-3 py-0.5 rounded-full mb-2">
              Payslip
            </div>
            <p className="text-white text-[13px] font-medium leading-none mb-1">{monthLabel}</p>
            <p className="text-[#B5D4F4] text-[11px]">Confidential</p>
          </div>
        </div>

        {/* Section 2 - Employee Info Strip */}
        <div className="flex border-b" style={{ borderColor: "#E0E0E0", borderBottomWidth: "0.5px" }}>
          <div className="flex-1 p-4 border-r print:break-inside-avoid" style={borderStyle}>
            <p className="text-[#888780] text-[11px] uppercase tracking-[0.5px] mb-1">Employee name</p>
            <p className="text-[13px] font-medium text-gray-900">{employeeName}</p>
          </div>
          <div className="flex-1 p-4 border-r print:break-inside-avoid" style={borderStyle}>
            <p className="text-[#888780] text-[11px] uppercase tracking-[0.5px] mb-1">Employee ID</p>
            <p className="text-[13px] font-medium text-[#185FA5]">{employeeId}</p>
          </div>
          <div className="flex-1 p-4 print:break-inside-avoid">
            <p className="text-[#888780] text-[11px] uppercase tracking-[0.5px] mb-1">Email</p>
            <p className="text-[12px] font-medium text-gray-900 truncate">{employeeEmail}</p>
          </div>
        </div>

        {/* Section 3 - Attendance Summary Strip */}
        <div className="bg-[#F5F5F5] flex border-b" style={{ borderColor: "#E0E0E0", borderBottomWidth: "0.5px" }}>
          <div className="flex-1 py-3 text-center border-r print:break-inside-avoid" style={borderStyle}>
            <p className="text-[18px] font-medium text-black leading-none mb-0.5">{record.paid_days}</p>
            <p className="text-[11px] text-[#888780]">Total days</p>
          </div>
          <div className="flex-1 py-3 text-center border-r print:break-inside-avoid" style={borderStyle}>
            <p className="text-[18px] font-medium text-[#3B6D11] leading-none mb-0.5">{record.paid_days - record.lop_days}</p>
            <p className="text-[11px] text-[#888780]">Paid days</p>
          </div>
          <div className="flex-1 py-3 text-center border-r print:break-inside-avoid" style={borderStyle}>
            <p className={`text-[18px] font-medium leading-none mb-0.5 ${record.lop_days > 0 ? "text-[#A32D2D]" : "text-[#888780]"}`}>{record.lop_days}</p>
            <p className="text-[11px] text-[#888780]">LOP days</p>
          </div>
          <div className="flex-1 py-3 text-center print:break-inside-avoid">
            <p className="text-[18px] font-medium text-[#185FA5] leading-none mb-0.5">{record.paid_days - record.lop_days}/{record.paid_days}</p>
            <p className="text-[11px] text-[#888780]">Attendance</p>
          </div>
        </div>

        {/* Warning Banner if LOP > 0 */}
        {record.lop_days > 0 && (
          <div className="bg-[#FFF8E6] px-6 py-3 border-b flex items-center gap-2 print:break-inside-avoid" style={{ borderColor: "#E0E0E0", borderBottomWidth: "0.5px" }}>
            <AlertTriangle className="w-4 h-4 text-[#854F0B]" />
            <p className="text-[12px] text-[#854F0B] font-medium">
              {record.lop_days} LOP days detected — ₹{((record.gross_earnings / (record.paid_days - record.lop_days)) * record.lop_days).toLocaleString("en-IN", {maximumFractionDigits:0})} deducted from gross earnings
            </p>
          </div>
        )}

        {/* Section 4 - Earnings & Deductions Table */}
        <div className="print:break-inside-avoid">
          <table className="w-full text-left border-collapse table-fixed text-[13px]">
            <thead>
              <tr className="bg-[#F5F5F5] text-[#888780] text-[12px]">
                <th className="py-2.5 px-6 font-normal w-[32%]" style={{ borderBottom: "0.5px solid #E0E0E0" }}>Earnings</th>
                <th className="py-2.5 px-6 font-normal w-[18%] text-right" style={{ borderBottom: "0.5px solid #E0E0E0", borderRight: "0.5px solid #E0E0E0" }}>Amount (₹)</th>
                <th className="py-2.5 px-6 font-normal w-[32%]" style={{ borderBottom: "0.5px solid #E0E0E0" }}>Deductions</th>
                <th className="py-2.5 px-6 font-normal w-[18%] text-right" style={{ borderBottom: "0.5px solid #E0E0E0" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const eList = [
                  ["Basic salary", record.basic_salary],
                  ["HRA", record.hra],
                  ["Dearness allowance", record.dearness_allowance],
                  ["Conveyance allowance", record.conveyance_allowance],
                  ["Medical allowance", record.medical_allowance],
                  ["Special allowance", record.special_allowance],
                  ["Overtime", record.overtime],
                  ["Bonus", record.bonus],
                  ["Other earnings", record.other_earnings],
                ];
                const dList = [
                  ["EPF (employee)", record.epf_employee],
                  ["ESI (employee)", record.esi_employee],
                  ["Professional tax", record.professional_tax],
                  ["TDS / income tax", record.tds],
                  ["Loan recovery", record.loan_recovery],
                  ["Other deductions", record.other_deductions],
                ];

                const rows = Math.max(eList.length, dList.length);
                const trElements = [];
                for (let i = 0; i < rows; i++) {
                  const isEven = i % 2 === 0;
                  const eName = eList[i]?.[0] as string || "";
                  const eAmt = eList[i] ? formatAmt(eList[i][1]) : "";
                  const dName = dList[i]?.[0] as string || "";
                  const dAmt = dList[i] ? formatAmt(dList[i][1]) : "";
                  
                  // Specific overrides per design prompt
                  const finalDAmt = (dName === "ESI (employee)" && dList[i]?.[1] === 0 && record.gross_earnings > 21000) ? "N/A" : dAmt;

                  if (eName || dName) {
                    trElements.push(
                      <tr key={i} className={isEven ? "bg-white" : "bg-[#F9F9F9]"}>
                        <td className="py-2 px-6 text-gray-800">{eName}</td>
                        <td className={`py-2 px-6 text-right ${eAmt !== "—" ? "text-[#185FA5] font-medium" : "text-[#888780]"}`} style={{ borderRight: "0.5px solid #E0E0E0" }}>{eAmt}</td>
                        <td className="py-2 px-6 text-gray-800">{dName}</td>
                        <td className={`py-2 px-6 text-right ${finalDAmt !== "—" && finalDAmt !== "N/A" && finalDAmt !== "" ? "text-[#A32D2D] font-medium" : "text-[#888780]"}`}>{finalDAmt}</td>
                      </tr>
                    );
                  }
                }
                return trElements;
              })()}
              
              {/* Totals Row */}
              <tr className="bg-[#F5F5F5] text-[13px]" style={{ borderTop: "1px solid #E0E0E0", borderBottom: "0.5px solid #E0E0E0" }}>
                <td className="py-3 px-6 font-medium text-gray-900">Gross earnings</td>
                <td className="py-3 px-6 text-right text-[#185FA5] font-semibold" style={{ borderRight: "0.5px solid #E0E0E0" }}>{formatAmt(record.gross_earnings)}</td>
                <td className="py-3 px-6 font-medium text-gray-900">Total deductions</td>
                <td className="py-3 px-6 text-right text-[#A32D2D] font-semibold">{formatAmt(record.total_deductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 5 - Net Salary Bar */}
        <div className="mx-6 mt-6 mb-6 bg-[#185FA5] rounded-[8px] p-5 flex items-center justify-between print:break-inside-avoid">
          <div>
            <p className="text-white text-[15px] font-medium mb-1">Net salary (take home)</p>
            <p className="text-[#B5D4F4] text-[12px]">After all deductions for {monthLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-white text-[24px] font-medium tracking-tight leading-none mb-1.5">{formatAmt(record.net_salary)}</p>
            <p className="text-[#B5D4F4] text-[11px]">{numberToWords(record.net_salary)}</p>
          </div>
        </div>

        {/* Section 6 - Employer Contributions */}
        <div className="mx-6 mb-8 grid grid-cols-2 gap-4 print:break-inside-avoid">
          <div className="bg-[#F5F5F5] rounded-md p-3.5 flex flex-col justify-center" style={borderStyle}>
            <p className="text-[#888780] text-[11px] mb-1">EPF — employer contribution</p>
            <p className="flex items-baseline gap-2">
              <span className="text-[14px] font-medium text-gray-900">{formatAmt(record.epf_employer)}</span>
              {record.epf_employer > 0 && <span className="text-[#888780] text-[11px]">(12% of basic)</span>}
            </p>
          </div>
          <div className="bg-[#F5F5F5] rounded-md p-3.5 flex flex-col justify-center" style={borderStyle}>
            <p className="text-[#888780] text-[11px] mb-1">ESI — employer contribution</p>
            <p className="flex items-baseline gap-2">
              <span className={`text-[14px] ${record.esi_employer > 0 ? "font-medium text-gray-900" : "text-[#888780]"}`}>
                {record.esi_employer > 0 ? formatAmt(record.esi_employer) : "Not applicable"}
              </span>
              {record.esi_employer === 0 && <span className="text-[#888780] text-[11px]">(gross &gt; ₹21,000)</span>}
            </p>
          </div>
        </div>

        {/* Section 7 - Footer */}
        <div className="px-6 py-4 flex items-center justify-between relative print:break-inside-avoid" style={{ borderTopWidth: "0.5px", borderColor: "#E0E0E0" }}>
          <p className="text-[#888780] text-[11px]">System-generated payslip. No signature required.</p>
          
          <div className="flex items-center gap-3 print:hidden">
            {onClose && (
              <Button variant="ghost" className="h-8 text-[#888780] hover:bg-gray-200 text-[12px] px-4 font-normal" onClick={onClose}>
                Close
              </Button>
            )}
            <Button variant="outline" className="h-8 border-[#185FA5] text-[#185FA5] hover:bg-[#F2F7FC] text-[12px] px-4 font-normal" onClick={() => {
              if (navigator.share) {
                navigator.share({ title: `Payslip - ${monthLabel}`, text: 'Payslip Document' });
              }
            }}>
              Share
            </Button>
            <Button className="h-8 bg-[#185FA5] hover:bg-[#124b82] text-white text-[12px] font-medium px-4" onClick={() => window.print()}>
              Download PDF
            </Button>
          </div>

          <div className="hidden print:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <p className="text-[#888780] text-[10px] opacity-70">Generated on {format(new Date(), "dd MMM yyyy")}</p>
          </div>
        </div>

        {/* Print-only CSS injection to ensure colors print correctly */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            @page {
              margin: 1cm;
              size: auto;
            }
          }
        `}} />
      </div>
    </div>
  );
}
