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
    Lock,
    ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ModuleInfo {
    key: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const modules: ModuleInfo[] = [
    { key: "attendance", label: "Attendance", description: "Presence tracking", icon: <Clock className="w-5 h-5" />, color: "bg-blue-500/10 text-blue-500" },
    { key: "leave_requests", label: "Leave Requests", description: "Time off management", icon: <CalendarDays className="w-5 h-5" />, color: "bg-emerald-500/10 text-emerald-500" },
    { key: "my_payslips", label: "My Payslips", description: "Earnings history", icon: <Receipt className="w-5 h-5" />, color: "bg-amber-500/10 text-amber-500" },
    { key: "employees", label: "Employees", description: "Staff directory", icon: <Users className="w-5 h-5" />, color: "bg-indigo-500/10 text-indigo-500" },
    { key: "departments", label: "Departments", description: "Org structure", icon: <ClipboardList className="w-5 h-5" />, color: "bg-rose-500/10 text-rose-500" },
    { key: "shifts", label: "Shifts", description: "Work schedules", icon: <Timer className="w-5 h-5" />, color: "bg-cyan-500/10 text-cyan-500" },
    { key: "payroll", label: "Payroll", description: "Salary processing", icon: <DollarSign className="w-5 h-5" />, color: "bg-green-600/10 text-green-600" },
    { key: "attendance_reset", label: "Attendance Reset", description: "Data reprocessing", icon: <RotateCcw className="w-5 h-5" />, color: "bg-orange-500/10 text-orange-500" },
    { key: "attendance_summary", label: "Attendance Summary", description: "Analytics & reports", icon: <BarChart3 className="w-5 h-5" />, color: "bg-violet-500/10 text-violet-500" },
    { key: "company_branding", label: "Company Branding", description: "Branding control", icon: <Settings className="w-5 h-5" />, color: "bg-slate-500/10 text-slate-500" },
    { key: "loans", label: "Loans", description: "Financial requests", icon: <Landmark className="w-5 h-5" />, color: "bg-sky-600/10 text-sky-600" },
    { key: "holidays", label: "Holidays", description: "Public holiday list", icon: <CalendarDays className="w-5 h-5" />, color: "bg-red-500/10 text-red-500" },
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
                title: modLabel(moduleKey),
                description: `${enabled ? "Enabled" : "Disabled"} for ${role}`,
            });
        } catch (err) {
            console.error("Failed to update permission", err);
            setPermissions((prev) => ({
                ...prev,
                [role]: { ...prev[role], [moduleKey]: !enabled },
            }));
            toast({ title: "Error", description: "Update failed", variant: "destructive" });
        } finally {
            setUpdating(null);
        }
    };

    const modLabel = (key: string) => modules.find((m) => m.key === key)?.label || key;

    const renderModuleList = (role: string) => {
        const rolePerms = permissions[role] || {};

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {modules.map((mod) => {
                    const isEnabled = rolePerms[mod.key] ?? false;
                    const isUpdating = updating === `${role}-${mod.key}`;

                    return (
                        <div
                            key={mod.key}
                            className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 hover:border-primary/30 ${isEnabled
                                ? "bg-primary/[0.02] border-primary/20 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
                                : "bg-white border-slate-100 opacity-80 hover:opacity-100"
                                }`}
                        >
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isEnabled ? mod.color : "bg-slate-100 text-slate-400"}`}>
                                {mod.icon}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold truncate">{mod.label}</h3>
                                <p className="text-[10px] text-slate-400 truncate">{mod.description}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {isUpdating ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-primary/50" />
                                ) : (
                                    <Switch
                                        checked={isEnabled}
                                        onCheckedChange={(checked) => handleToggle(role, mod.key, checked)}
                                        className="scale-90 data-[state=checked]:bg-primary"
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Loading Access Matrix</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 py-4">
            {/* Cleaner Integrated Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-tighter">
                        <Lock className="w-3.5 h-3.5" />
                        Infrastructure
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Permissions</h1>
                    <p className="text-slate-500 text-sm">
                        Manage module visibility across different organizational roles.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs font-medium text-slate-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Enforcement
                    </div>
                </div>
            </div>

            <Tabs defaultValue="employee" className="space-y-8">
                <div className="flex justify-start px-2">
                    <TabsList className="bg-slate-100/80 p-1 rounded-full border border-slate-200 backdrop-blur-sm">
                        <TabsTrigger value="employee" className="rounded-full px-6 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                            Employees
                        </TabsTrigger>
                        <TabsTrigger value="subadmin" className="rounded-full px-6 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                            Sub-Admins
                        </TabsTrigger>
                        <TabsTrigger value="admin" className="rounded-full px-6 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                            Admins
                        </TabsTrigger>
                    </TabsList>
                </div>

                {["employee", "subadmin", "admin"].map((role) => (
                    <TabsContent key={role} value={role} className="mt-0 focus-visible:outline-none px-2">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                    {role.charAt(0).toUpperCase() + role.slice(1)} Privileges
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </div>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold text-[10px]">
                                    {Object.values(permissions[role] || {}).filter(Boolean).length} Active
                                </Badge>
                            </div>
                            {renderModuleList(role)}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
