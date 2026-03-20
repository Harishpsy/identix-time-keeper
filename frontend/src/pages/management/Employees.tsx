import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Plus,
  Loader2,
  Pencil,
  Check,
  X,
  FileText,
  Trash2,
  Filter,
  Download,
  Upload,
  Mail,
  Phone,
  Calendar,
  UserCircle,
  Building2,
  Briefcase,
  Clock,
  MoreVertical,
  ChevronDown,
  ArrowUpDown,
  Users,
  UserPlus,
  UserCog,
  AlertCircle,
  Copy,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  CalendarIcon,
  Shield,
  Lock,
  Unlock,
  Settings2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, parse } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Management Components
import { StatsCard } from "@/components/management/StatsCard";
import { StatusBadge } from "@/components/management/StatusBadge";
import { RoleBadge } from "@/components/management/RoleBadge";
import { EmployeeAvatar } from "@/components/management/EmployeeAvatar";
import { PageHeader } from "@/components/management/PageHeader";
import { EmployeeForm } from "@/components/management/EmployeeForm";

// Types
interface Employee {
  id: string;
  full_name: string;
  email: string;
  employee_id: string;
  designation: string;
  department_id: string;
  department_name: string;
  manager_id: string;
  manager_name: string;
  shift_id: string;
  shift_name: string;
  is_active: boolean;
  role: string;
  biometric_id: string;
  date_of_joining: string;
  phone?: string;
  avatar?: string;
}

interface Department {
  id: string;
  name: string;
  employee_count?: number;
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export default function Employees() {
  const { role: currentUserRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("full_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editForm, setEditForm] = useState({
    biometric_id: "",
    department_id: "",
    shift_id: "",
    date_of_joining: "",
    manager_id: "",
    designation: "",
    employee_id: "",
    phone: "",
    full_name: "",
    email: "",
    role: "employee",
    is_active: true,
    gender: "",
    date_of_birth: "",
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<Employee | null>(null);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Queries
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await apiClient.get("/profiles");
      return data;
    },
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await apiClient.get("/profiles/departments");
      return data;
    },
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["shifts"],
    queryFn: async () => {
      const { data } = await apiClient.get("/profiles/shifts");
      return data;
    },
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiClient.patch(`/profiles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee deleted successfully");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete employee");
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: any }) => {
      return apiClient.post("/profiles/bulk-update", { ids, data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Bulk update completed");
      setBulkActionMode(false);
      setSelectedEmployees([]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to bulk update");
    },
  });
  
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return apiClient.post("/auth/reset-password", { userId, newPassword });
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      setPasswordTarget(null);
      setNewPassword("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to reset password");
    },
  });

  // Filtering and Sorting
  const filteredEmployees = employees
    .filter((emp) => {
      const matchesSearch =
        emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(search.toLowerCase());

      const matchesDepartment = selectedDepartment === "all" || emp.department_id === selectedDepartment;
      const matchesStatus = selectedStatus === "all" ||
        (selectedStatus === "active" && emp.is_active) ||
        (selectedStatus === "inactive" && !emp.is_active);
      const matchesRole = selectedRole === "all" || emp.role === selectedRole;

      return matchesSearch && matchesDepartment && matchesStatus && matchesRole;
    })
    .sort((a, b) => {
      let aVal = a[sortField as keyof Employee];
      let bVal = b[sortField as keyof Employee];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    inactive: employees.filter(e => !e.is_active).length,
    managers: employees.filter(e => e.role === "subadmin" || e.role === "admin").length,
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedEmployees.length === 0) {
      toast.error("No employees selected");
      return;
    }

    switch (action) {
      case "activate":
        await bulkUpdateMutation.mutateAsync({ ids: selectedEmployees, data: { is_active: true } });
        break;
      case "deactivate":
        await bulkUpdateMutation.mutateAsync({ ids: selectedEmployees, data: { is_active: false } });
        break;
      case "change-department":
        if (value) {
          await bulkUpdateMutation.mutateAsync({ ids: selectedEmployees, data: { department_id: value } });
        }
        break;
      case "change-shift":
        if (value) {
          await bulkUpdateMutation.mutateAsync({ ids: selectedEmployees, data: { shift_id: value } });
        }
        break;
    }
  };

  const startEdit = (emp: Employee) => {
    setEditTarget(emp);
    setEditForm({
      full_name: emp.full_name || "",
      email: emp.email || "",
      biometric_id: emp.biometric_id?.toString() || "",
      department_id: emp.department_id || "",
      shift_id: emp.shift_id || "",
      date_of_joining: emp.date_of_joining ? format(new Date(emp.date_of_joining), "yyyy-MM-dd") : "",
      manager_id: emp.manager_id || "",
      designation: emp.designation || "",
      employee_id: emp.employee_id || "",
      phone: emp.phone || "",
      role: emp.role || "employee",
      is_active: emp.is_active,
      gender: (emp as any).gender || "",
      date_of_birth: (emp as any).date_of_birth ? format(new Date((emp as any).date_of_birth), "yyyy-MM-dd") : "",
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await updateProfileMutation.mutateAsync({ id, data: editForm });
      toast.success("Profile updated");
      setEditTarget(null);
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };


  const handleDelete = async (id: string) => {
    deleteEmployeeMutation.mutate(id);
  };

  const downloadEmployeePDF = async (empId: string, empName: string) => {
    const now = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end = format(endOfMonth(now), "yyyy-MM-dd");

    try {
      const response = await apiClient.get("/attendance/summary", {
        params: { user_id: empId, start_date: start, end_date: end }
      });
      const records = response.data;

      const doc = new jsPDF();

      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, doc.internal.pageSize.width, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("Attendance Report", 14, 25);

      doc.setFontSize(10);
      doc.text(`Employee: ${empName}`, 14, 35);
      doc.text(`Period: ${format(new Date(start), "dd MMM yyyy")} - ${format(new Date(end), "dd MMM yyyy")}`, 14, 42);

      // Table
      autoTable(doc, {
        startY: 50,
        head: [["Date", "Status", "Check In", "Check Out", "Duration"]],
        body: records.map((r: any) => [
          format(new Date(r.date), "dd MMM yyyy"),
          r.status,
          r.check_in || "—",
          r.check_out || "—",
          r.total_duration_minutes != null
            ? `${Math.floor(r.total_duration_minutes / 60)}h ${r.total_duration_minutes % 60}m`
            : "—",
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      doc.save(`attendance-${empName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast.success("Report downloaded successfully");
    } catch (err) {
      toast.error("Failed to download PDF");
    }
  };

  if (loadingEmployees) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <Users className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-muted-foreground animate-pulse">Loading employee data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Employee Management"
        description="Manage your workforce, roles, and permissions"
        icon={Users}
      >
        <Button
          variant="outline"
          onClick={() => setBulkActionMode(!bulkActionMode)}
          className={cn(bulkActionMode && "bg-primary/10 border-primary")}
        >
          <Settings2 className="w-4 h-4 mr-2" />
          Bulk Actions
        </Button>
        <Button onClick={() => navigate("/employees/new")} data-tour="add-employee">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Employees"
          value={stats.total}
          icon={Users}
          description="Active workforce"
        />
        <StatsCard
          title="Active"
          value={stats.active}
          icon={CheckCircle2}
          description={`${Math.round((stats.active / stats.total) * 100)}% of total`}
          trend={5}
        />
        <StatsCard
          title="Inactive"
          value={stats.inactive}
          icon={XCircle}
          description="Needs attention"
          trend={-2}
        />
        <StatsCard
          title="Managers"
          value={stats.managers}
          icon={UserCog}
          description="Team leads & admins"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, ID, or designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[160px]">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[140px]">
                  <Shield className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="subadmin">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {currentUserRole === "super_admin" && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {(selectedDepartment !== "all" || selectedStatus !== "all" || selectedRole !== "all" || search) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedDepartment("all");
                    setSelectedStatus("all");
                    setSelectedRole("all");
                    setSearch("");
                  }}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Active Filters */}
          {(selectedDepartment !== "all" || selectedStatus !== "all" || selectedRole !== "all") && (
            <div className="flex gap-2 mt-4">
              {selectedDepartment !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Department: {departments.find(d => d.id === selectedDepartment)?.name}
                  <button onClick={() => setSelectedDepartment("all")}>
                    <X className="w-3 h-3 ml-1" />
                  </button>
                </Badge>
              )}
              {selectedStatus !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
                  <button onClick={() => setSelectedStatus("all")}>
                    <X className="w-3 h-3 ml-1" />
                  </button>
                </Badge>
              )}
              {selectedRole !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Role: {
                    selectedRole === "subadmin" ? "Manager" :
                      selectedRole === "super_admin" ? "Super Admin" :
                        selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)
                  }
                  <button onClick={() => setSelectedRole("all")}>
                    <X className="w-3 h-3 ml-1" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {bulkActionMode && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedEmployees(
                      selectedEmployees.length === filteredEmployees.length
                        ? []
                        : filteredEmployees.map(e => e.id)
                    );
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {selectedEmployees.length === filteredEmployees.length ? "Deselect All" : "Select All"}
                </Button>
                <span className="text-sm">
                  <span className="font-medium">{selectedEmployees.length}</span> employees selected
                </span>
              </div>

              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Status
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkAction("activate")}>
                      <Unlock className="w-4 h-4 mr-2" />
                      Activate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("deactivate")}>
                      <Lock className="w-4 h-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Department
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {departments.map((d) => (
                      <DropdownMenuItem
                        key={d.id}
                        onClick={() => handleBulkAction("change-department", d.id)}
                      >
                        {d.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBulkActionMode(false);
                    setSelectedEmployees([]);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees Table */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {bulkActionMode && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees(filteredEmployees.map(e => e.id));
                          } else {
                            setSelectedEmployees([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                  )}
                  <TableHead>
                    <button
                      className="flex items-center gap-1 font-medium"
                      onClick={() => toggleSort("full_name")}
                    >
                      Employee
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </TableHead>
                  <TableHead>Emp ID</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 font-medium"
                      onClick={() => toggleSort("designation")}
                    >
                      Designation
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 font-medium"
                      onClick={() => toggleSort("department_name")}
                    >
                      Department
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={bulkActionMode ? 11 : 10} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-medium text-lg">No employees found</h3>
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => {
                    return (
                      <TableRow key={emp.id} className="group hover:bg-muted/50">
                        {bulkActionMode && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedEmployees.includes(emp.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmployees([...selectedEmployees, emp.id]);
                                } else {
                                  setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <EmployeeAvatar name={emp.full_name} email={emp.email} avatar={emp.avatar} />
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {emp.employee_id || "—"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{emp.designation || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {emp.department_name || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{emp.manager_name || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {emp.shift_name || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={emp.role} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={emp.is_active}
                              onCheckedChange={() => {
                                updateProfileMutation.mutate({
                                  id: emp.id,
                                  data: { is_active: !emp.is_active }
                                });
                              }}
                              className="data-[state=checked]:bg-green-500"
                            />
                            <StatusBadge isActive={emp.is_active} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(emp)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadEmployeePDF(emp.id, emp.full_name)}
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPasswordTarget(emp)}>
                                      <Lock className="w-4 h-4 mr-2" />
                                      Change Password
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Mail className="w-4 h-4 mr-2" />
                                      Send Email
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Calendar className="w-4 h-4 mr-2" />
                                      View Schedule
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Copy className="w-4 h-4 mr-2" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => setDeleteTarget({ id: emp.id, name: emp.full_name })}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Delete Employee
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
              This action cannot be undone and will permanently remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              {deleteEmployeeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!passwordTarget} onOpenChange={(open) => !open && setPasswordTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <span className="font-medium text-foreground">{passwordTarget?.full_name}</span>.
              The user will need to use this new password for their next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  {isPasswordVisible ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Minimum 6 characters recommended for better security.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPasswordTarget(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => passwordTarget && resetPasswordMutation.mutate({ userId: passwordTarget.id, newPassword })}
              disabled={!newPassword || newPassword.length < 4 || resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Update Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-white/20 shadow-2xl rounded-[2rem] p-0 overflow-hidden">
          <div className="flex-none px-8 py-8 border-b border-border/40 bg-white/50 dark:bg-slate-900/50">
            <DialogHeader className="space-y-0">
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative w-14 h-14 rounded-[1.25rem] bg-white dark:bg-slate-900 border border-border/50 shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:rotate-3 shadow-primary/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20 opacity-50" />
                    <Pencil className="w-6 h-6 text-primary relative z-10 transition-transform duration-500 group-hover:scale-110" />
                  </div>
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    Edit Profile
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse hidden sm:block" />
                  </DialogTitle>
                  <DialogDescription className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>Updating records for</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-extrabold text-primary uppercase tracking-widest shadow-sm">
                      {editTarget?.full_name}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
            <EmployeeForm
            form={editForm}
            setForm={setEditForm}
            departments={departments}
            shifts={shifts}
            employees={employees}
            currentUserRole={currentUserRole}
            onSubmit={() => editTarget && saveEdit(editTarget.id)}
            isPending={updateProfileMutation.isPending}
            isEdit={true}
            submitText="Update Employee Profile"
          />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

