import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Attendance from "./pages/Attendance";
import Employees from "./pages/Employees";
import Shifts from "./pages/Shifts";
import Departments from "./pages/Departments";
import LeaveRequests from "./pages/LeaveRequests";

import Payroll from "./pages/Payroll";
import MyPayslips from "./pages/MyPayslips";
import AttendanceReset from "./pages/AttendanceReset";
import AttendanceSummary from "./pages/AttendanceSummary";
import CompanyBranding from "./pages/CompanyBranding";
import RolePermissions from "./pages/RolePermissions";
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
          <Routes>
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute allowedRoles={["admin"]}><Employees /></ProtectedRoute>} />
            <Route path="/departments" element={<ProtectedRoute allowedRoles={["admin"]}><Departments /></ProtectedRoute>} />
            <Route path="/shifts" element={<ProtectedRoute allowedRoles={["admin"]}><Shifts /></ProtectedRoute>} />
            <Route path="/leave" element={<ProtectedRoute><LeaveRequests /></ProtectedRoute>} />

            <Route path="/payroll" element={<ProtectedRoute allowedRoles={["admin"]}><Payroll /></ProtectedRoute>} />
            <Route path="/my-payslips" element={<ProtectedRoute><MyPayslips /></ProtectedRoute>} />
            <Route path="/attendance-reset" element={<ProtectedRoute allowedRoles={["admin"]}><AttendanceReset /></ProtectedRoute>} />
            <Route path="/attendance-summary" element={<ProtectedRoute allowedRoles={["admin"]}><AttendanceSummary /></ProtectedRoute>} />
            <Route path="/company-branding" element={<ProtectedRoute allowedRoles={["admin"]}><CompanyBranding /></ProtectedRoute>} />
            <Route path="/role-permissions" element={<ProtectedRoute allowedRoles={["admin"]}><RolePermissions /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
