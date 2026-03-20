import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon, UserCircle, Mail, Phone, Briefcase, Shield, Lock, UserPlus, Loader2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmployeeFormProps {
    form: any;
    setForm: (form: any) => void;
    departments: any[];
    shifts: any[];
    employees: any[];
    currentUserRole: string | null;
    onSubmit: () => void;
    isPending: boolean;
    isEdit?: boolean;
    submitText?: string;
}

export const EmployeeForm = ({
    form,
    setForm,
    departments,
    shifts,
    employees,
    currentUserRole,
    onSubmit,
    isPending,
    isEdit = false,
    submitText,
}: EmployeeFormProps) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="space-y-8 py-4 px-1">
            {/* Identity Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <UserCircle className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-tight text-slate-700 dark:text-slate-300">Identity</h4>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Personal Information</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5" data-tour="form-full-name">
                        <Label htmlFor="full_name" className="text-xs font-semibold text-muted-foreground">Legal Full Name *</Label>
                        <div className="relative group">
                            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input id="full_name" className="pl-9 h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:border-primary/50 focus:bg-background/80 transition-all" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="John Alexander Doe" />
                        </div>
                    </div>
                    <div className="space-y-1.5" data-tour="form-email">
                        <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Work Email Address *</Label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input id="email" type="email" autoComplete="off" className="pl-9 h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:border-primary/50 focus:bg-background/80 transition-all" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.io" />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground">Mobile Contact</Label>
                        <div className="relative group">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input id="phone" className="pl-9 h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:border-primary/50 focus:bg-background/80 transition-all" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Gender</Label>
                        <Select value={form.gender} onValueChange={(val) => setForm({ ...form, gender: val })}>
                            <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:ring-1 focus:ring-primary/20 transition-all">
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="male" className="rounded-lg">Male</SelectItem>
                                <SelectItem value="female" className="rounded-lg">Female</SelectItem>
                                <SelectItem value="other" className="rounded-lg">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Date of Birth</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full h-10 px-3 rounded-xl bg-muted/50 border-border/50 shadow-sm hover:bg-muted/80 hover:text-foreground transition-colors", !form.date_of_birth && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {form.date_of_birth ? format(new Date(form.date_of_birth), "dd MMM yyyy") : "Pick birth date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden shadow-2xl border-none">
                                <CalendarComponent mode="single" selected={form.date_of_birth ? new Date(form.date_of_birth) : undefined} onSelect={(date) => setForm({ ...form, date_of_birth: date ? format(date, "yyyy-MM-dd") : "" })} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Joining Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full h-10 px-3 rounded-xl bg-muted/50 border-border/50 shadow-sm hover:bg-muted/80 hover:text-foreground transition-colors", !form.date_of_joining && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {form.date_of_joining ? format(new Date(form.date_of_joining), "dd MMM yyyy") : "Pick onboarding date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden shadow-2xl border-none">
                                <CalendarComponent mode="single" selected={form.date_of_joining ? new Date(form.date_of_joining) : undefined} onSelect={(date) => setForm({ ...form, date_of_joining: date ? format(date, "yyyy-MM-dd") : "" })} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* Professional Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-tight text-slate-700 dark:text-slate-300">Professional</h4>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Organizational Context</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="employee_id" className="text-xs font-semibold text-muted-foreground">Internal ID</Label>
                        <Input id="employee_id" className="h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:border-primary/50 focus:bg-background/80 transition-all" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="EMP-001" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="biometric_id" className="text-xs font-semibold text-muted-foreground">Biometric Key</Label>
                        <Input id="biometric_id" className="h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:border-primary/50 focus:bg-background/80 transition-all" value={form.biometric_id} onChange={(e) => setForm({ ...form, biometric_id: e.target.value })} placeholder="BIO-XXXX" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="designation" className="text-xs font-semibold text-muted-foreground">Official Designation</Label>
                    <Input id="designation" className="h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:border-primary/50 focus:bg-background/80 transition-all" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior Software Architect" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Department Assignment</Label>
                        <Select value={form.department_id} onValueChange={(val) => setForm({ ...form, department_id: val })}>
                            <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:ring-1 focus:ring-primary/20 transition-all">
                                <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {departments.map((d: any) => (
                                    <SelectItem key={d.id} value={d.id} className="rounded-lg">{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Reporting Manager</Label>
                        <Select value={form.manager_id} onValueChange={(val) => setForm({ ...form, manager_id: val })}>
                            <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:ring-1 focus:ring-primary/20 transition-all">
                                <SelectValue placeholder="Select lead" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="none" className="rounded-lg">Direct Report</SelectItem>
                                {employees
                                    .filter((e: any) => e.role === 'subadmin' || e.role === 'admin' || e.role === 'super_admin')
                                    .map((m: any) => (
                                        <SelectItem key={m.id} value={m.id} className="rounded-lg">{m.full_name}</SelectItem>
                                    ))
                                }
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Operational Shift</Label>
                    <Select value={form.shift_id} onValueChange={(val) => setForm({ ...form, shift_id: val })}>
                        <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:ring-1 focus:ring-primary/20 transition-all">
                            <SelectValue placeholder="Assign working hours" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                            {shifts.map((s: any) => (
                                <SelectItem key={s.id} value={s.id} className="rounded-lg group">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{s.name}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase group-focus:text-white/80 transition-colors">{s.start_time} - {s.end_time}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Access Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-tight text-slate-700 dark:text-slate-300">Access</h4>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Security & Permissions</p>
                    </div>
                </div>
                {!isEdit && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5" data-tour="form-password">
                            <Label htmlFor="password" title="Initial Security Key (Password) *" className="text-xs font-semibold text-muted-foreground">Initial Security Key (Password) *</Label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    className="pl-9 pr-10 h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:border-primary/50 focus:bg-background/80 transition-all"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1.5" data-tour="form-role">
                            <Label className="text-xs font-semibold text-muted-foreground">Platform Role Assignment</Label>
                            <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                                <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:ring-1 focus:ring-primary/20 transition-all">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    <SelectItem value="employee" className="rounded-lg">Employee</SelectItem>
                                    <SelectItem value="subadmin" className="rounded-lg">Sub Admin</SelectItem>
                                    <SelectItem value="admin" className="rounded-lg">Admin</SelectItem>
                                    {currentUserRole === "super_admin" && (
                                        <SelectItem value="super_admin" className="rounded-lg">Super Admin</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                {isEdit && (
                    <div className="space-y-1.5" data-tour="form-role">
                        <Label className="text-xs font-semibold text-muted-foreground">Platform Role Assignment</Label>
                        <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                            <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 shadow-sm focus:ring-1 focus:ring-primary/20 transition-all">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="employee" className="rounded-lg">Employee</SelectItem>
                                <SelectItem value="subadmin" className="rounded-lg">Sub Admin</SelectItem>
                                <SelectItem value="admin" className="rounded-lg">Admin</SelectItem>
                                {currentUserRole === "super_admin" && (
                                    <SelectItem value="super_admin" className="rounded-lg">Super Admin</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="pt-4">
                <Button className="w-full h-12 rounded-2xl shadow-sm bg-primary/80 hover:bg-primary text-white font-bold group transition-all" onClick={onSubmit} disabled={isPending}>
                    {isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <UserPlus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                            {submitText || "Initialize Professional Profile"}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};
