import { useState } from "react";
import { 
  Search, 
  RefreshCw, 
  MoreVertical, 
  Filter, 
  Download,
  ListFilter
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DUMMY_DATA = [
  {
    employeeId: "NAF0748",
    date: "20-Feb-2026",
    firstIn: "20-Feb-2026 10:03 AM",
    lastOut: "20-Feb-2026 03:15 PM",
    netHours: "5.12",
    department: "Tech - IT Quality Assurance",
    designation: "QA Engineer II",
  },
  {
    employeeId: "NAF0748",
    date: "09-Feb-2026",
    firstIn: "09-Feb-2026 10:08 AM",
    lastOut: "09-Feb-2026 01:15 PM",
    netHours: "3.07",
    department: "Tech - IT Quality Assurance",
    designation: "QA Engineer II",
  },
  {
    employeeId: "NAF0748",
    date: "05-Feb-2026",
    firstIn: "05-Feb-2026 04:31 PM",
    lastOut: "05-Feb-2026 05:01 PM",
    netHours: "0.30",
    department: "Tech - IT Quality Assurance",
    designation: "QA Engineer II",
  },
];

export default function AccessCard() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Access Card Report Form - List View</h1>
          <p className="text-muted-foreground">View and manage access card records.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Select defaultValue="less-6-hours">
                <SelectTrigger className="w-[300px] bg-background">
                  <SelectValue placeholder="Filter records" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="less-6-hours">Less than 6 Hours - Access Card Report</SelectItem>
                  <SelectItem value="all-records">All Access Card Records</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search employees..."
                  className="pl-8 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <ListFilter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[120px] font-semibold">Employee ID</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">First In</TableHead>
                <TableHead className="font-semibold">Last Out</TableHead>
                <TableHead className="font-semibold text-right">Net Hours</TableHead>
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Designation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DUMMY_DATA.map((row, index) => (
                <TableRow key={index} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-primary">{row.employeeId}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.firstIn}</TableCell>
                  <TableCell>{row.lastOut}</TableCell>
                  <TableCell className="text-right font-semibold">{row.netHours}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
                      {row.department}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.designation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="flex items-center justify-between px-4 py-4 border-t border-border/50 bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Total Record Count : <span className="font-semibold text-foreground">{DUMMY_DATA.length}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                Show: 
                <Select defaultValue="30">
                  <SelectTrigger className="w-16 h-8 border-none bg-transparent hover:bg-muted p-0 justify-center">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">1-3</span> of <span className="font-medium text-foreground">3</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
