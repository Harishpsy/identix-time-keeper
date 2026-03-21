import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/auth/Auth";
import Attendance from "./pages/attendance/Attendance";
import Employees from "./pages/management/Employees";
import Shifts from "./pages/management/Shifts";
import Departments from "./pages/management/Departments";
import LeaveRequests from "./pages/management/LeaveRequests";
import DashboardLayout from "./components/layout/DashboardLayout";
import { ThemeProvider } from "./components/theme/ThemeContext";

import Payroll from "./pages/payroll/Payroll";
import MyPayslips from "./pages/payroll/MyPayslips";
import AttendanceReset from "./pages/attendance/AttendanceReset";
import AttendanceSummary from "./pages/attendance/AttendanceSummary";
import CompanyBranding from "./pages/admin/CompanyBranding";
import RolePermissions from "./pages/admin/RolePermissions";
import MenuOrder from "./pages/admin/MenuOrder";
import LoanManagement from "./pages/payroll/LoanManagement";
import Holidays from "./pages/management/Holidays";
import AddEmployee from "./pages/management/AddEmployee";
import AttendanceDetails from "./pages/attendance/AttendanceDetails";
import OnboardingDashboard from "./pages/admin/OnboardingDashboard";
import AccessCard from "./pages/attendance/AccessCard";
import MyProfile from "./pages/profile/MyProfile";
import NotFound from "./pages/NotFound";
import { isModuleLive } from "./lib/moduleConfig";

const queryClient = new QueryClient();

function ProtectedRoute({
  children,
  allowedRoles,
  moduleKey,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  /** If provided, also checks MODULE_CONFIG — redirects to "/" when module is disabled */
  moduleKey?: string;
}) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  // Block if the module is turned off in the centralized MODULE_CONFIG
  if (moduleKey && !isModuleLive(moduleKey)) return <Navigate to="/" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Routes>
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />

              {/* Protected Routes with Persistent Layout */}
              <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route path="/" element={<Index />} />
                <Route path="/attendance" element={<ProtectedRoute moduleKey="attendance"><Attendance /></ProtectedRoute>} />
                <Route path="/access-card" element={<ProtectedRoute moduleKey="access_card"><AccessCard /></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute moduleKey="employees" allowedRoles={["super_admin", "admin"]}><Employees /></ProtectedRoute>} />
                <Route path="/employees/new" element={<ProtectedRoute moduleKey="employees" allowedRoles={["super_admin", "admin"]}><AddEmployee /></ProtectedRoute>} />
                <Route path="/departments" element={<ProtectedRoute moduleKey="departments" allowedRoles={["super_admin", "admin"]}><Departments /></ProtectedRoute>} />
                <Route path="/shifts" element={<ProtectedRoute moduleKey="shifts" allowedRoles={["super_admin", "admin"]}><Shifts /></ProtectedRoute>} />
                <Route path="/leave" element={<ProtectedRoute moduleKey="leave_requests"><LeaveRequests /></ProtectedRoute>} />
                <Route path="/payroll" element={<ProtectedRoute moduleKey="payroll" allowedRoles={["super_admin", "admin"]}><Payroll /></ProtectedRoute>} />
                <Route path="/loans" element={<ProtectedRoute moduleKey="loans"><LoanManagement /></ProtectedRoute>} />
                <Route path="/my-payslips" element={<ProtectedRoute moduleKey="my_payslips"><MyPayslips /></ProtectedRoute>} />
                <Route path="/attendance-reset" element={<ProtectedRoute moduleKey="attendance_reset" allowedRoles={["super_admin", "admin"]}><AttendanceReset /></ProtectedRoute>} />
                <Route path="/attendance-summary" element={<ProtectedRoute moduleKey="attendance_summary" allowedRoles={["super_admin", "admin"]}><AttendanceSummary /></ProtectedRoute>} />
                <Route path="/attendance-summary/:userId/:month" element={<ProtectedRoute moduleKey="attendance_summary" allowedRoles={["super_admin", "admin"]}><AttendanceDetails /></ProtectedRoute>} />
                <Route path="/company-branding" element={<ProtectedRoute moduleKey="company_branding" allowedRoles={["super_admin", "admin"]}><CompanyBranding /></ProtectedRoute>} />
                <Route path="/menu-order" element={<ProtectedRoute moduleKey="menu_order" allowedRoles={["super_admin", "admin"]}><MenuOrder /></ProtectedRoute>} />
                <Route path="/role-permissions" element={<ProtectedRoute moduleKey="role_permissions" allowedRoles={["super_admin", "admin"]}><RolePermissions /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute moduleKey="onboarding" allowedRoles={["super_admin", "admin", "subadmin", "employee"]}><OnboardingDashboard /></ProtectedRoute>} />
                <Route path="/my-profile" element={<ProtectedRoute moduleKey="my_profile"><MyProfile /></ProtectedRoute>} />
                <Route path="/holidays" element={<ProtectedRoute moduleKey="holidays"><Holidays /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
