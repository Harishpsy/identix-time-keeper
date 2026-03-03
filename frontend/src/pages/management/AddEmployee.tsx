import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { UserPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/management/PageHeader";
import { EmployeeForm } from "@/components/management/EmployeeForm";

interface Department {
    id: string;
    name: string;
}

interface Shift {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
}

interface Employee {
    id: string;
    full_name: string;
    role: string;
}

export default function AddEmployee() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { role: currentUserRole } = useAuth();

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

    // Queries (same as in Employees.tsx)
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

    const { data: employees = [] } = useQuery<Employee[]>({
        queryKey: ["employees"],
        queryFn: async () => {
            const { data } = await apiClient.get("/profiles");
            return data;
        },
    });

    const createEmployeeMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiClient.post("/auth/register", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["employees"] });
            toast.success("Employee created successfully");
            navigate("/employees");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || "Failed to create employee");
        },
    });

    const handleCreate = async () => {
        if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
            toast.error("Name, email and password are required");
            return;
        }
        createEmployeeMutation.mutate(form);
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <PageHeader
                title="Add New Employee"
                description="Initialize a new professional profile"
                icon={UserPlus}
            >
                <Button variant="outline" onClick={() => navigate("/employees")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Directory
                </Button>
            </PageHeader>

            <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 md:p-8">
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
                </CardContent>
            </Card>
        </div>
    );
}
