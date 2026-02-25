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
} from "lucide-react";

export interface NavItem {
    label: string;
    href: string;
    icon: ReactNode;
    roles: string[];
    moduleKey: string; // maps to role_permissions.module_key
}

export const navItems: NavItem[] = [
    { label: "Dashboard", href: "/", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "dashboard" },
    { label: "Attendance", href: "/attendance", icon: <Clock className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "attendance" },
    { label: "Employees", href: "/employees", icon: <Users className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "employees" },
    { label: "Departments", href: "/departments", icon: <ClipboardList className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "departments" },
    { label: "Shifts", href: "/shifts", icon: <Timer className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "shifts" },
    { label: "Leave Requests", href: "/leave", icon: <CalendarDays className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "leave_requests" },
    { label: "Payroll", href: "/payroll", icon: <DollarSign className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "payroll" },
    { label: "Loans", href: "/loans", icon: <Receipt className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "loans" },
    { label: "My Payslips", href: "/my-payslips", icon: <Receipt className="w-5 h-5" />, roles: ["subadmin", "employee"], moduleKey: "my_payslips" },
    { label: "Attendance Reset", href: "/attendance-reset", icon: <RotateCcw className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "attendance_reset" },
    { label: "Attendance Summary", href: "/attendance-summary", icon: <BarChart3 className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "attendance_summary" },
    { label: "Company Branding", href: "/company-branding", icon: <Settings className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "company_branding" },
    { label: "Holidays", href: "/holidays", icon: <CalendarDays className="w-5 h-5" />, roles: ["admin", "subadmin", "employee"], moduleKey: "holidays" },
    { label: "Menu Order", href: "/menu-order", icon: <GripVertical className="w-5 h-5" />, roles: ["admin"], moduleKey: "menu_order" },
    { label: "Role Permissions", href: "/role-permissions", icon: <Shield className="w-5 h-5" />, roles: ["admin"], moduleKey: "role_permissions" },
];
