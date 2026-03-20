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
import { motion, AnimatePresence } from "framer-motion";

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
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-10 py-6"
        >
            {/* Identity Section */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative"
            >
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/40 rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform">
                        <UserCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">IDENTITY</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">Personal Identification</p>
                    </div>
                </div>

                <div className="bg-white/70 dark:bg-slate-900/70 p-7 rounded-[2.5rem] border border-white/40 shadow-2xl backdrop-blur-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2.5" data-tour="form-fullname">
                            <Label htmlFor="full_name" className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 ml-1">Legal Full Name *</Label>
                            <div className="relative group/field">
                                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/field:text-indigo-600 transition-all duration-300" />
                                <Input 
                                    id="full_name" 
                                    className="pl-12 h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 placeholder:text-slate-300 font-medium" 
                                    value={form.full_name} 
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                                    placeholder="John Alexander Doe" 
                                />
                            </div>
                        </div>
                        <div className="space-y-2.5" data-tour="form-email">
                            <Label htmlFor="email" className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 ml-1">Work Email Address *</Label>
                            <div className="relative group/field">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/field:text-indigo-600 transition-all duration-300" />
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="off"
                                    className="pl-12 h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 placeholder:text-slate-300 font-medium"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="john@company.io"
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5" data-tour="form-phone">
                            <Label htmlFor="phone" className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 ml-1">Mobile Contact</Label>
                            <div className="relative group/field">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/field:text-indigo-600 transition-all duration-300" />
                                <Input
                                    id="phone"
                                    className="pl-12 h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 placeholder:text-slate-300 font-medium"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </div>
                        <div className="space-y-2.5" data-tour="form-gender">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 ml-1">Gender Preference</Label>
                            <Select value={form.gender} onValueChange={(val) => setForm({ ...form, gender: val })}>
                                <SelectTrigger className="h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:ring-4 focus:ring-primary/10 transition-all duration-300 font-medium text-left">
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[1.5rem] border-border/40 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
                                    <SelectItem value="male" className="rounded-xl py-3 focus:bg-primary/10 focus:text-primary font-semibold">Male</SelectItem>
                                    <SelectItem value="female" className="rounded-xl py-3 focus:bg-primary/10 focus:text-primary font-semibold">Female</SelectItem>
                                    <SelectItem value="other" className="rounded-xl py-3 focus:bg-primary/10 focus:text-primary font-semibold">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2.5" data-tour="form-dob">
                            <Label htmlFor="date_of_birth" className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 ml-1">Date of Birth</Label>
                            <div className="relative group/field">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/field:text-indigo-600 transition-all duration-300" />
                                <Input
                                    id="date_of_birth"
                                    type="date"
                                    className="pl-12 h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 font-medium"
                                    value={form.date_of_birth}
                                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2.5" data-tour="form-joining-date">
                            <Label htmlFor="joining_date" className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 ml-1">Joining Date</Label>
                            <div className="relative group/field">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/field:text-indigo-600 transition-all duration-300" />
                                <Input
                                    id="joining_date"
                                    type="date"
                                    className="pl-12 h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 font-medium"
                                    value={form.date_of_joining}
                                    onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Professional Section */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative"
            >
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-amber-400/40 rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform">
                        <Briefcase className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h4 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">PROFESSIONAL</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">Organizational Context</p>
                    </div>
                </div>

                <div className="bg-white/70 dark:bg-slate-900/70 p-7 rounded-[2.5rem] border border-white/40 shadow-2xl backdrop-blur-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2.5" data-tour="form-id">
                            <Label htmlFor="employee_id" className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 ml-1">Internal Identity ID</Label>
                            <div className="relative group/field">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500/50 group-focus-within/field:text-amber-500 transition-colors uppercase">ID</span>
                                <Input 
                                    id="employee_id" 
                                    className="pl-12 h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all duration-300 placeholder:text-slate-300 font-bold" 
                                    value={form.employee_id} 
                                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })} 
                                    placeholder="EMP-001" 
                                />
                            </div>
                        </div>
                        <div className="space-y-2.5" data-tour="form-biometric">
                            <Label htmlFor="biometric_id" className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 ml-1">Biometric Key</Label>
                            <div className="relative group/field">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500/50 group-focus-within/field:text-amber-500 transition-colors uppercase">BIO</span>
                                <Input 
                                    id="biometric_id" 
                                    className="pl-14 h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all duration-300 placeholder:text-slate-300 font-bold" 
                                    value={form.biometric_id} 
                                    onChange={(e) => setForm({ ...form, biometric_id: e.target.value })} 
                                    placeholder="XXXX" 
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2.5 md:col-span-2" data-tour="form-designation">
                            <Label htmlFor="designation" className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 ml-1">Official Designation</Label>
                            <div className="relative group/field">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/field:text-amber-500 transition-all duration-300" />
                                <Input 
                                    id="designation" 
                                    className="pl-12 h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all duration-300 placeholder:text-slate-300 font-medium" 
                                    value={form.designation} 
                                    onChange={(e) => setForm({ ...form, designation: e.target.value })} 
                                    placeholder="e.g. Senior Software Architect" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5" data-tour="form-dept">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 ml-1">Department Assignment</Label>
                            <Select value={form.department_id} onValueChange={(val) => setForm({ ...form, department_id: val })}>
                                <SelectTrigger className="h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:ring-4 focus:ring-amber-500/10 transition-all duration-300 font-medium text-left text-slate-900 focus:text-primary">
                                    <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[1.5rem] border-border/40 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
                                    {departments.map((d: any) => (
                                        <SelectItem key={d.id} value={d.id} className="rounded-xl py-3 focus:bg-amber-500/10 focus:text-amber-700 font-semibold">{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2.5" data-tour="form-mgr">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 ml-1">Reporting Manager</Label>
                            <Select value={form.manager_id} onValueChange={(val) => setForm({ ...form, manager_id: val })}>
                                <SelectTrigger className="h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:ring-4 focus:ring-amber-500/10 transition-all duration-300 font-medium text-left text-slate-900 focus:text-primary">
                                    <SelectValue placeholder="Select lead" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[1.5rem] border-border/40 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
                                    <SelectItem value="none" className="rounded-xl py-3 focus:bg-amber-500/10 focus:text-amber-700 font-semibold">Direct Report (External)</SelectItem>
                                    {employees
                                        .filter((e: any) => e.role === 'subadmin' || e.role === 'admin' || e.role === 'super_admin')
                                        .map((m: any) => (
                                            <SelectItem key={m.id} value={m.id} className="rounded-xl py-3 focus:bg-amber-500/10 focus:text-amber-700 font-semibold">{m.full_name}</SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2.5 md:col-span-2" data-tour="form-shift">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 ml-1">Operational Shift Schedule</Label>
                            <Select value={form.shift_id} onValueChange={(val) => setForm({ ...form, shift_id: val })}>
                                <SelectTrigger className="h-14 rounded-2xl bg-white border-border/60 shadow-sm focus:ring-4 focus:ring-amber-500/10 transition-all duration-300 font-medium">
                                    <SelectValue placeholder="Assign working hours" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[2rem] border-border/40 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 p-2">
                                    {shifts.map((s: any) => (
                                        <SelectItem key={s.id} value={s.id} className="rounded-2xl px-4 py-3 group focus:bg-amber-500/15 mb-1">
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm italic group-focus:text-amber-900 transition-colors uppercase">{s.name}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter group-focus:text-amber-700 transition-colors">Time Window: {s.start_time} - {s.end_time}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Access Section */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="group relative"
            >
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-emerald-400/40 rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform">
                        <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h4 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">ACCESS</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">Security & Permissions</p>
                    </div>
                </div>

                <div className="bg-white/70 dark:bg-slate-900/70 p-7 rounded-[2.5rem] border border-white/40 shadow-2xl backdrop-blur-md">
                    {!isEdit && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2.5" data-tour="form-password">
                                <Label htmlFor="password" title="Initial Security Key (Password) *" className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 ml-1">Initial Security Key *</Label>
                                <div className="relative group/field">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/field:text-emerald-500 transition-all duration-300" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        className="pl-12 pr-12 h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 placeholder:text-slate-300 font-medium"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2.5" data-tour="form-role">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 ml-1">Platform Role Assignment</Label>
                                <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 font-medium text-left text-slate-900 focus:text-primary">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-[1.5rem] border-border/40 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
                                        <SelectItem value="employee" className="rounded-xl py-3 focus:bg-emerald-500/10 focus:text-emerald-700 font-semibold">Employee</SelectItem>
                                        <SelectItem value="subadmin" className="rounded-xl py-3 focus:bg-emerald-500/10 focus:text-emerald-700 font-semibold">Sub Admin</SelectItem>
                                        <SelectItem value="admin" className="rounded-xl py-3 focus:bg-emerald-500/10 focus:text-emerald-700 font-semibold">Admin</SelectItem>
                                        {currentUserRole === "super_admin" && (
                                            <SelectItem value="super_admin" className="rounded-xl py-3 focus:bg-emerald-500/10 focus:text-emerald-700 font-semibold">Super Admin</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    {isEdit && (
                        <div className="space-y-2.5" data-tour="form-role">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 ml-1">Platform Role Assignment</Label>
                            <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                                <SelectTrigger className="h-12 rounded-2xl bg-white border-border/60 shadow-sm focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 font-medium text-left text-slate-900 focus:text-primary">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-[1.5rem] border-border/40 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
                                    <SelectItem value="employee" className="rounded-xl py-3 focus:bg-emerald-500/10 focus:text-emerald-700 font-semibold">Employee</SelectItem>
                                    <SelectItem value="subadmin" className="rounded-xl py-3 focus:bg-emerald-500/10 focus:text-emerald-700 font-semibold">Sub Admin</SelectItem>
                                    <SelectItem value="admin" className="rounded-xl py-3 focus:bg-emerald-500/10 focus:text-emerald-700 font-semibold">Admin</SelectItem>
                                    {currentUserRole === "super_admin" && (
                                        <SelectItem value="super_admin" className="rounded-xl py-3 focus:bg-emerald-500/10 focus:text-emerald-700 font-semibold">Super Admin</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </motion.div>

            <motion.div 
                className="pt-8"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
            >
                <Button 
                    className="w-full h-16 rounded-[2rem] shadow-2xl shadow-primary/20 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:from-primary hover:to-indigo-700 text-white font-black tracking-widest uppercase transition-all duration-500 border-none group relative overflow-hidden" 
                    onClick={onSubmit} 
                    disabled={isPending}
                >
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                    {isPending ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <div className="flex items-center justify-center gap-3">
                            <UserPlus className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                            <span>{submitText || "Finalize & Save Profile"}</span>
                        </div>
                    )}
                </Button>
            </motion.div>
        </motion.div>
    );
};
