import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, User, Briefcase, Lock, Save } from "lucide-react";
import { format } from "date-fns";

export default function MyProfile() {
    const { user, profile, role } = useAuth();
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Personal details - editable
    const [form, setForm] = useState({
        phone: "",
        date_of_birth: "",
        gender: "",
        address: "",
    });

    // Password change - no longer needed (contact admin)
    // const [passwords, ...] removed

    // Pre-populate from profile
    useEffect(() => {
        if (profile) {
            setForm({
                phone: profile.phone || "",
                date_of_birth: profile.date_of_birth
                    ? profile.date_of_birth.split("T")[0]
                    : "",
                gender: profile.gender || "",
                address: profile.address || "",
            });
        }
    }, [profile]);

    const handleSave = async () => {
        // Validation
        const phoneRegex = /^\d{10}$/;
        if (!form.phone || !phoneRegex.test(form.phone)) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }
        if (!form.date_of_birth) {
            toast.error("Date of Birth is required");
            return;
        }
        if (!form.gender) {
            toast.error("Gender is required");
            return;
        }

        setSaving(true);
        try {
            await apiClient.patch(`/profiles/me`, {
                phone: form.phone,
                date_of_birth: form.date_of_birth,
                gender: form.gender,
                address: form.address || null,
            });
            toast.success("Profile updated successfully");
            setIsEditing(false);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (profile) {
            setForm({
                phone: profile.phone || "",
                date_of_birth: profile.date_of_birth ? profile.date_of_birth.split("T")[0] : "",
                gender: profile.gender || "",
                address: profile.address || "",
            });
        }
        setIsEditing(false);
    };

    const getRoleBadge = () => {
        const map: Record<string, string> = {
            super_admin: "Super Admin",
            admin: "Admin",
            subadmin: "Manager",
            employee: "Employee",
        };
        return map[role || ""] || role || "—";
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
                <p className="text-muted-foreground mt-1">View and edit your personal information</p>
            </div>

            {/* Identity Banner */}
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                            {profile?.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">{profile?.full_name}</h2>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                            <div className="flex gap-2 mt-1.5">
                                <Badge variant="secondary" className="bg-primary/10 text-primary">
                                    {getRoleBadge()}
                                </Badge>
                                {profile?.employee_id && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {profile.employee_id}
                                    </Badge>
                                )}
                                {profile?.onboarding_status && (
                                    <Badge
                                        variant="secondary"
                                        className={
                                            profile.onboarding_status === "Active"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-amber-100 text-amber-700"
                                        }
                                    >
                                        {profile.onboarding_status}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Employment Info (read-only) */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        Employment Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    {[
                        { label: "Department", value: profile?.department_name },
                        { label: "Designation", value: profile?.designation },
                        { label: "Manager", value: profile?.manager_name },
                        { label: "Date of Joining", value: profile?.date_of_joining ? format(new Date(profile.date_of_joining), "dd MMM yyyy") : null },
                        { label: "Biometric ID", value: profile?.biometric_id },
                        { label: "Employee ID", value: profile?.employee_id },
                    ].map(({ label, value }) => (
                        <div key={label} className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                            <p className="font-medium">{value || "—"}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Personal Details */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            Personal Details
                        </CardTitle>
                        {!isEditing && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                Edit
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isEditing ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex gap-1">Phone Number <span className="text-destructive">*</span></Label>
                                    <Input
                                        value={form.phone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                            setForm({ ...form, phone: val });
                                        }}
                                        placeholder="10-digit mobile number"
                                        maxLength={10}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex gap-1">Date of Birth <span className="text-destructive">*</span></Label>
                                    <Input
                                        type="date"
                                        value={form.date_of_birth}
                                        onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex gap-1">Gender <span className="text-destructive">*</span></Label>
                                    <Select value={form.gender} onValueChange={(val) => setForm({ ...form, gender: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Textarea
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    placeholder="Enter your full address"
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSave} disabled={saving} className="gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </Button>
                                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                                    Cancel
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {[
                                { label: "Phone Number", value: form.phone },
                                { label: "Date of Birth", value: form.date_of_birth ? format(new Date(form.date_of_birth), "dd MMM yyyy") : null },
                                { label: "Gender", value: form.gender ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1) : null },
                                { label: "Address", value: form.address },
                            ].map(({ label, value }) => (
                                <div key={label} className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                                    <p className="font-medium">{value || "—"}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Password */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        Password
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border/50">
                        <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">
                            To change your password, please contact your <span className="font-medium text-foreground">Admin</span>. They can reset it for you from the Employee Management panel.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
