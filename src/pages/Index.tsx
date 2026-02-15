import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AnniversaryCelebration from "@/components/dashboard/AnniversaryCelebration";

const Index = () => {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      <AnniversaryCelebration />
      {role === "admin" || role === "subadmin" ? <AdminDashboard /> : <EmployeeDashboard />}
    </DashboardLayout>
  );
};

export default Index;
