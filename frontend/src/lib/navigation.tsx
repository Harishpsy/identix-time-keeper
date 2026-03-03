import { ReactNode } from "react";
import {
    LayoutDashboard,
    Users,
    Clock,
    CalendarDays,
    ClipboardList,
    RotateCcw,
    Timer,
    DollarSign,
    Receipt,
    BarChart3,
    Shield,
    Settings,
    GripVertical,
    UserPlus,
    UserCircle,
} from "lucide-react";

export interface NavItem {
    label: string;
    href: string;
    icon: ReactNode;
    roles: string[];
    moduleKey: string; // maps to role_permissions.module_key
}

export const navItems: NavItem[] = [
    { label: "Dashboard", href: "/", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "dashboard" },

    // Operations
    { label: "Attendance", href: "/attendance", icon: <Clock className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "attendance" },
    { label: "Leave Requests", href: "/leave", icon: <CalendarDays className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "leave_requests" },

    // Management
    { label: "Employees", href: "/employees", icon: <Users className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "employees" },
    { label: "Departments", href: "/departments", icon: <ClipboardList className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "departments" },
    { label: "Shifts", href: "/shifts", icon: <Timer className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "shifts" },

    // Calendar & Info
    { label: "Holidays", href: "/holidays", icon: <CalendarDays className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "holidays" },

    // Financial
    { label: "Payroll", href: "/payroll", icon: <DollarSign className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "payroll" },
    { label: "Loans", href: "/loans", icon: <Receipt className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "loans" },
    { label: "My Payslips", href: "/my-payslips", icon: <Receipt className="w-5 h-5" />, roles: ["subadmin", "employee"], moduleKey: "my_payslips" },

    // Reports & Profile
    { label: "Attendance Summary", href: "/attendance-summary", icon: <BarChart3 className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "attendance_summary" },
    { label: "My Profile", href: "/my-profile", icon: <UserCircle className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "my_profile" },

    // Administration
    { label: "Onboarding ", href: "/onboarding", icon: <UserPlus className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "onboarding" },
    { label: "Attendance Reset", href: "/attendance-reset", icon: <RotateCcw className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "attendance_reset" },
    { label: "Company Branding", href: "/company-branding", icon: <Settings className="w-5 h-5" />, roles: ["super_admin", "admin", "subadmin", "employee"], moduleKey: "company_branding" },
    { label: "Role Permissions", href: "/role-permissions", icon: <Shield className="w-5 h-5" />, roles: ["super_admin", "admin"], moduleKey: "role_permissions" },
    { label: "Menu Order", href: "/menu-order", icon: <GripVertical className="w-5 h-5" />, roles: ["super_admin", "admin"], moduleKey: "menu_order" },
];
