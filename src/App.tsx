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
import AttendanceDetails from "./pages/attendance/AttendanceDetails";
import OnboardingDashboard from "./pages/admin/OnboardingDashboard";
import MyProfile from "./pages/profile/MyProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
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
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/employees" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><Employees /></ProtectedRoute>} />
                <Route path="/departments" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><Departments /></ProtectedRoute>} />
                <Route path="/shifts" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><Shifts /></ProtectedRoute>} />
                <Route path="/leave" element={<LeaveRequests />} />
                <Route path="/payroll" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><Payroll /></ProtectedRoute>} />
                <Route path="/loans" element={<LoanManagement />} />
                <Route path="/my-payslips" element={<MyPayslips />} />
                <Route path="/attendance-reset" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><AttendanceReset /></ProtectedRoute>} />
                <Route path="/attendance-summary" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><AttendanceSummary /></ProtectedRoute>} />
                <Route path="/attendance-summary/:userId/:month" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><AttendanceDetails /></ProtectedRoute>} />
                <Route path="/company-branding" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><CompanyBranding /></ProtectedRoute>} />
                <Route path="/menu-order" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><MenuOrder /></ProtectedRoute>} />
                <Route path="/role-permissions" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><RolePermissions /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute allowedRoles={["super_admin", "admin", "subadmin", "employee"]}><OnboardingDashboard /></ProtectedRoute>} />
                <Route path="/my-profile" element={<MyProfile />} />
                <Route path="/holidays" element={<Holidays />} />
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
