import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import {
  Fingerprint,
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
  ClipboardList,
  RotateCcw,
  Timer,
  DollarSign,
  Receipt,
  BarChart3,
  Shield,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles: string[];
  moduleKey?: string; // maps to role_permissions.module_key
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"] },
  { label: "Attendance", href: "/attendance", icon: <Clock className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "attendance" },
  { label: "Employees", href: "/employees", icon: <Users className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "employees" },
  { label: "Departments", href: "/departments", icon: <ClipboardList className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "departments" },
  { label: "Shifts", href: "/shifts", icon: <Timer className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "shifts" },
  { label: "Leave Requests", href: "/leave", icon: <CalendarDays className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "leave_requests" },
  { label: "Payroll", href: "/payroll", icon: <DollarSign className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "payroll" },
  { label: "My Payslips", href: "/my-payslips", icon: <Receipt className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "my_payslips" },
  { label: "Attendance Reset", href: "/attendance-reset", icon: <RotateCcw className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "attendance_reset" },
  { label: "Attendance Summary", href: "/attendance-summary", icon: <BarChart3 className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "attendance_summary" },
  { label: "Company Branding", href: "/company-branding", icon: <Settings className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "company_branding" },
  { label: "Role Permissions", href: "/role-permissions", icon: <Shield className="w-5 h-5" />, roles: ["admin"] },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [leavesEnabled, setLeavesEnabled] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await apiClient.get("/settings");
        if (data) setLeavesEnabled(data.leaves_enabled ?? true);
      } catch (err) {
        console.error("Failed to fetch settings in layout", err);
      }
    };
    const fetchPermissions = async () => {
      try {
        const { data } = await apiClient.get("/role-permissions");
        setRolePermissions(data || {});
      } catch (err) {
        console.error("Failed to fetch role permissions", err);
      }
    };
    fetchSettings();
    fetchPermissions();
  }, []);

  const filteredNav = navItems.filter((item) => {
    if (!role) return false;

    // Admin always sees everything
    if (role === "admin") return item.roles.includes(role);

    // For non-admin roles, check dynamic permissions
    if (item.moduleKey) {
      const perms = rolePermissions[role];
      if (perms && perms[item.moduleKey] !== undefined) {
        if (!perms[item.moduleKey]) return false;
      } else {
        // Fallback to hardcoded roles if permissions not loaded yet
        if (!item.roles.includes(role)) return false;
      }
    } else {
      // No moduleKey means static (e.g. Dashboard) — use hardcoded roles
      if (!item.roles.includes(role)) return false;
    }

    // Visibility toggle for Leave Requests (legacy setting)
    if (item.label === "Leave Requests" && !leavesEnabled) {
      return false;
    }

    return true;
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-sidebar-primary-foreground">Identix</h2>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role} Panel</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{profile?.full_name || "User"}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
