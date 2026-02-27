import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, description, trend }: any) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1 text-xs">
          <span className={trend > 0 ? "text-green-600" : "text-red-600"}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
      )}
    </CardContent>
  </Card>
);

// Employee Avatar Component
const EmployeeAvatar = ({ name, email, avatar }: { name: string; email: string; avatar?: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 border-2 border-background">
        <AvatarImage src={avatar} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="font-medium text-sm">{name}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {email}
        </span>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <Badge
    variant={isActive ? "secondary" : "outline"}
    className={cn(
      "gap-1 px-2 py-0.5 text-xs font-medium",
      isActive
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
        : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800"
    )}
  >
    {isActive ? (
      <>
        <CheckCircle2 className="w-3 h-3" />
        Active
      </>
    ) : (
      <>
        <XCircle className="w-3 h-3" />
        Inactive
      </>
    )}
  </Badge>
);

// Role Badge Component
const RoleBadge = ({ role }: { role: string }) => {
  const config = {
    super_admin: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Super Admin" },
    admin: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Admin" },
    subadmin: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "Manager" },
    employee: { color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", label: "Employee" },
  };

  const { color, label } = config[role as keyof typeof config] || config.employee;

  return (
    <Badge variant="outline" className={cn("text-xs font-medium border-0", color)}>
      {label}
    </Badge>
  );
};

export default function Employees() {
  const { role: currentUserRole } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    biometric_id: "",
    employee_id: "",
    department_id: "",
    shift_id: "",
    role: "employee",
    date_of_joining: "",
    manager_id: "",
    designation: "",
    phone: "",
  });

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

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post("/auth/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee created successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create employee");
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

  const resetForm = () => {
    setForm({
      full_name: "",
      email: "",
      password: "",
      biometric_id: "",
      employee_id: "",
      department_id: "",
      shift_id: "",
      role: "employee",
      date_of_joining: "",
      manager_id: "",
      designation: "",
      phone: "",
    });
  };

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
    setEditingId(emp.id);
    setEditForm({
      biometric_id: emp.biometric_id?.toString() || "",
      department_id: emp.department_id || "",
      shift_id: emp.shift_id || "",
      date_of_joining: emp.date_of_joining ? format(new Date(emp.date_of_joining), "yyyy-MM-dd") : "",
      manager_id: emp.manager_id || "",
      designation: emp.designation || "",
      employee_id: emp.employee_id || "",
      phone: emp.phone || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      await updateProfileMutation.mutateAsync({ id, data: editForm });
      toast.success("Profile updated");
      setEditingId(null);
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Name, email and password are required");
      return;
    }
    createEmployeeMutation.mutate(form);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
            <p className="text-muted-foreground">
              Manage your workforce, roles, and permissions
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setBulkActionMode(!bulkActionMode)}
            className={cn(bulkActionMode && "bg-primary/10 border-primary")}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Bulk Actions
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-tour="add-employee">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Employee</DialogTitle>
                <DialogDescription>
                  Add a new employee to your organization. They will receive an email with login instructions.
                </DialogDescription>
              </DialogHeader>
              <EmployeeForm
                form={form}
                setForm={setForm}
                departments={departments}
                shifts={shifts}
                employees={employees}
                currentUserRole={currentUserRole}
                onSubmit={handleCreate}
                isPending={createEmployeeMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                  Status: {selectedStatus}
                  <button onClick={() => setSelectedStatus("all")}>
                    <X className="w-3 h-3 ml-1" />
                  </button>
                </Badge>
              )}
              {selectedRole !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Role: {selectedRole}
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
          <div className="overflow-x-auto">
            <Table>
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
                    const isEditing = editingId === emp.id;
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
                          {isEditing ? (
                            <Input
                              value={editForm.designation}
                              onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                              className="w-32 h-8 text-sm"
                            />
                          ) : (
                            <span className="text-sm">{emp.designation || "—"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editForm.department_id}
                              onValueChange={(val) => setEditForm({ ...editForm, department_id: val })}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {departments.map(d => (
                                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="font-normal">
                              {emp.department_name || "—"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editForm.manager_id}
                              onValueChange={(val) => setEditForm({ ...editForm, manager_id: val })}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {employees
                                  .filter(e => e.id !== emp.id && (e.role === 'subadmin' || e.role === 'admin' || e.role === 'super_admin'))
                                  .map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm">{emp.manager_name || "—"}</span>
                          )}
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
                            {isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => saveEdit(emp.id)}
                                  disabled={updateProfileMutation.isPending}
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                  <X className="w-4 h-4 text-destructive" />
                                </Button>
                              </>
                            ) : (
                              <>
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
                              </>
                            )}
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
    </div>
  );
}

// Employee Form Component
const EmployeeForm = ({ form, setForm, departments, shifts, employees, currentUserRole, onSubmit, isPending }: any) => (
  <div className="space-y-8 py-4 px-1">
    {/* Identity Section */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <UserCircle className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-tight">Identity</h4>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Personal Information</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5" data-tour="form-full-name">
          <Label htmlFor="full_name" className="text-xs font-semibold text-muted-foreground">Legal Full Name *</Label>
          <div className="relative group">
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input id="full_name" className="pl-9 h-10 rounded-xl bg-muted/30 border-transparent focus:bg-background transition-all" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="John Alexander Doe" />
          </div>
        </div>
        <div className="space-y-1.5" data-tour="form-email">
          <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Work Email Address *</Label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input id="email" type="email" className="pl-9 h-10 rounded-xl bg-muted/30 border-transparent focus:bg-background transition-all" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.io" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground">Mobile Contact</Label>
          <div className="relative group">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input id="phone" className="pl-9 h-10 rounded-xl bg-muted/30 border-transparent focus:bg-background transition-all" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Joining Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full h-10 px-3 rounded-xl bg-muted/30 border-transparent justify-start text-left font-medium text-sm hover:bg-muted/50", !form.date_of_joining && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.date_of_joining ? format(new Date(form.date_of_joining), "dd MMM yyyy") : "Pick onboarding date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden shadow-2xl border-none">
              <CalendarComponent mode="single" selected={form.date_of_joining ? new Date(form.date_of_joining) : undefined} onSelect={(date) => setForm({ ...form, date_of_joining: date ? format(date, "yyyy-MM-dd") : "" })} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>

    {/* Professional Section */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-orange-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-tight">Professional</h4>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Organizational Context</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="employee_id" className="text-xs font-semibold text-muted-foreground">Internal ID</Label>
          <Input id="employee_id" className="h-10 rounded-xl bg-muted/30 border-transparent focus:bg-background transition-all" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="EMP-001" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="biometric_id" className="text-xs font-semibold text-muted-foreground">Biometric Key</Label>
          <Input id="biometric_id" className="h-10 rounded-xl bg-muted/30 border-transparent focus:bg-background transition-all" value={form.biometric_id} onChange={(e) => setForm({ ...form, biometric_id: e.target.value })} placeholder="BIO-XXXX" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="designation" className="text-xs font-semibold text-muted-foreground">Official Designation</Label>
        <Input id="designation" className="h-10 rounded-xl bg-muted/30 border-transparent focus:bg-background transition-all" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior Software Architect" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Department Assignment</Label>
          <Select value={form.department_id} onValueChange={(val) => setForm({ ...form, department_id: val })}>
            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-transparent focus:ring-0">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id} className="rounded-lg">{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Reporting Manager</Label>
          <Select value={form.manager_id} onValueChange={(val) => setForm({ ...form, manager_id: val })}>
            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-transparent focus:ring-0">
              <SelectValue placeholder="Select lead" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              <SelectItem value="none" className="rounded-lg">Direct Report</SelectItem>
              {employees
                .filter((e: any) => e.role === 'subadmin' || e.role === 'admin' || e.role === 'super_admin')
                .map((m: any) => (
                  <SelectItem key={m.id} value={m.id} className="rounded-lg">{m.full_name}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Operational Shift</Label>
        <Select value={form.shift_id} onValueChange={(val) => setForm({ ...form, shift_id: val })}>
          <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-transparent focus:ring-0">
            <SelectValue placeholder="Assign working hours" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-none shadow-2xl">
            {shifts.map((s: any) => (
              <SelectItem key={s.id} value={s.id} className="rounded-lg">
                <div className="flex flex-col">
                  <span className="font-bold">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{s.start_time} - {s.end_time}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Access Section */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-tight">Access</h4>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Security & Permissions</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5" data-tour="form-password">
          <Label htmlFor="password" title="Initial Security Key (Password) *" className="text-xs font-semibold text-muted-foreground">Initial Security Key (Password) *</Label>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input id="password" type="password" className="pl-9 h-10 rounded-xl bg-muted/30 border-transparent focus:bg-background transition-all" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>
        </div>
        <div className="space-y-1.5" data-tour="form-role">
          <Label className="text-xs font-semibold text-muted-foreground">Platform Role Assignment</Label>
          <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-transparent focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              <SelectItem value="employee" className="rounded-lg">Employee Level</SelectItem>
              <SelectItem value="subadmin" className="rounded-lg">Department Manager</SelectItem>
              <SelectItem value="admin" className="rounded-lg">System Administrator</SelectItem>
              {currentUserRole === "super_admin" && (
                <SelectItem value="super_admin" className="rounded-lg">Platform Owner</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <div className="pt-4">
      <Button className="w-full h-12 rounded-2xl shadow-xl shadow-primary/20 font-bold group" onClick={onSubmit} disabled={isPending}>
        {isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <UserPlus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Initialize Professional Profile
          </>
        )}
      </Button>
    </div>
  </div>
);
