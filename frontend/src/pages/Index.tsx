import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AnniversaryCelebration from "@/components/dashboard/AnniversaryCelebration";
import BirthdayCelebration from "@/components/dashboard/BirthdayCelebration";

const Index = () => {
  const { role } = useAuth();

  return (
    <>
      <AnniversaryCelebration />
      <BirthdayCelebration />
      {role === "super_admin" || role === "admin" || role === "subadmin" ? <AdminDashboard /> : <EmployeeDashboard />}
    </>
  );
};

export default Index;
