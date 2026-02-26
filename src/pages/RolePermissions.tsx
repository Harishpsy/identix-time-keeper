import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import {
    Clock,
    CalendarDays,
    Receipt,
    Users,
    ClipboardList,
    Timer,
    DollarSign,
    RotateCcw,
    BarChart3,
    Settings,
    Shield,
    Loader2,
    Landmark,
} from "lucide-react";

interface ModuleInfo {
    key: string;
    label: string;
    description: string;
    icon: React.ReactNode;
}

const modules: ModuleInfo[] = [
    { key: "attendance", label: "Attendance", description: "View and track daily attendance", icon: <Clock className="w-5 h-5" /> },
    { key: "leave_requests", label: "Leave Requests", description: "Apply for and manage leaves", icon: <CalendarDays className="w-5 h-5" /> },
    { key: "my_payslips", label: "My Payslips", description: "View personal payslip history", icon: <Receipt className="w-5 h-5" /> },
    { key: "employees", label: "Employees", description: "View and manage employee list", icon: <Users className="w-5 h-5" /> },
    { key: "departments", label: "Departments", description: "View and manage departments", icon: <ClipboardList className="w-5 h-5" /> },
    { key: "shifts", label: "Shifts", description: "View and manage shift schedules", icon: <Timer className="w-5 h-5" /> },
    { key: "payroll", label: "Payroll", description: "Generate and manage payroll", icon: <DollarSign className="w-5 h-5" /> },
    { key: "attendance_reset", label: "Attendance Reset", description: "Reset and reprocess attendance data", icon: <RotateCcw className="w-5 h-5" /> },
    { key: "attendance_summary", label: "Attendance Summary", description: "View attendance reports and analytics", icon: <BarChart3 className="w-5 h-5" /> },
    { key: "company_branding", label: "Company Branding", description: "Manage company logo and settings", icon: <Settings className="w-5 h-5" /> },
    { key: "loans", label: "Loans", description: "Request and manage employee loans", icon: <Landmark className="w-5 h-5" /> },
    { key: "holidays", label: "Holidays Details", description: "View and manage company holiday list", icon: <CalendarDays className="w-5 h-5" /> },
];

type RolePermissions = Record<string, boolean>;
type AllPermissions = Record<string, RolePermissions>;

export default function RolePermissions() {
    const [permissions, setPermissions] = useState<AllPermissions>({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            const { data } = await apiClient.get("/role-permissions");
            setPermissions(data);
        } catch (err) {
            console.error("Failed to fetch permissions", err);
            toast({ title: "Error", description: "Failed to load permissions", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (role: string, moduleKey: string, enabled: boolean) => {
        const updateKey = `${role}-${moduleKey}`;
        setUpdating(updateKey);

        // Optimistic update
        setPermissions((prev) => ({
            ...prev,
            [role]: { ...prev[role], [moduleKey]: enabled },
        }));

        try {
            await apiClient.put("/role-permissions", {
                role,
                module_key: moduleKey,
                is_enabled: enabled,
            });
            toast({
                title: "Updated",
                description: `${modules.find((m) => m.key === moduleKey)?.label} ${enabled ? "enabled" : "disabled"} for ${role}`,
            });
        } catch (err) {
            console.error("Failed to update permission", err);
            // Revert on failure
            setPermissions((prev) => ({
                ...prev,
                [role]: { ...prev[role], [moduleKey]: !enabled },
            }));
            toast({ title: "Error", description: "Failed to update permission", variant: "destructive" });
        } finally {
            setUpdating(null);
        }
    };

    const renderModuleList = (role: string) => {
        const rolePerms = permissions[role] || {};

        return (
            <div className="grid gap-3">
                {modules.map((mod) => {
                    const isEnabled = rolePerms[mod.key] ?? false;
                    const isUpdating = updating === `${role}-${mod.key}`;

                    return (
                        <div
                            key={mod.key}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isEnabled
                                ? "bg-primary/5 border-primary/20 shadow-sm"
                                : "bg-muted/30 border-border"
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isEnabled
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                        }`}
                                >
                                    {mod.icon}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{mod.label}</p>
                                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => handleToggle(role, mod.key, checked)}
                                    disabled={isUpdating}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Role Permissions</h1>
                    <p className="text-sm text-muted-foreground">
                        Control which modules are visible to Employee and Subadmin roles
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="employee" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="employee" className="gap-2">
                        <Users className="w-4 h-4" />
                        Employee
                    </TabsTrigger>
                    <TabsTrigger value="subadmin" className="gap-2">
                        <Shield className="w-4 h-4" />
                        Subadmin
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="employee">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Employee Module Access</CardTitle>
                            <CardDescription>
                                Toggle modules that employees can see in their sidebar navigation
                            </CardDescription>
                        </CardHeader>
                        <CardContent>{renderModuleList("employee")}</CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="subadmin">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Subadmin Module Access</CardTitle>
                            <CardDescription>
                                Toggle modules that subadmins can see in their sidebar navigation
                            </CardDescription>
                        </CardHeader>
                        <CardContent>{renderModuleList("subadmin")}</CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
