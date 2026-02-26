import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Loader2, Globe, Building2, Mail, Lock, User, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";

const RegisterOrganization = () => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        tenantName: "",
        slug: "",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Frontend validation
        if (!/(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.adminPassword)) {
            toast.error("Password must contain at least one number and one special character.");
            return;
        }

        setLoading(true);

        try {
            const response = await apiClient.post("/onboard", {
                tenantName: formData.tenantName,
                slug: formData.slug.toLowerCase().replace(/\s+/g, "-"),
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword,
                adminFullName: formData.adminName,
            });

            toast.success("Organization created successfully!");

            // Save the slug so login knows which workspace to use
            localStorage.setItem("tenant_slug", formData.slug.toLowerCase().replace(/\s+/g, "-"));

            // Redirect to login after a short delay
            setTimeout(() => {
                navigate("/auth");
            }, 2000);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to create organization");
            setLoading(false);
        }
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
        setFormData({ ...formData, slug: value });
    };

    return (
        <div className="min-h-screen flex bg-background">
            {/* Left Panel - Information/Branding */}
            <div className="hidden lg:flex lg:w-1/3 relative overflow-hidden bg-primary">
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-primary-foreground/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl animate-pulse" />
                </div>

                <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
                    <button
                        onClick={() => navigate("/auth")}
                        className="absolute top-12 left-12 flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </button>

                    <div className="flex items-center gap-4 mb-12">
                        <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/20">
                            <Fingerprint className="w-9 h-9" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Identix SaaS</h1>
                    </div>

                    <h2 className="text-2xl font-semibold mb-6">Launch your dedicated workforce portal</h2>

                    <div className="space-y-6">
                        {[
                            "Dedicated isolated database",
                            "Custom organization URL",
                            "Full administrative control",
                            "Instant provisioning"
                        ].map((text) => (
                            <div key={text} className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                <span className="text-primary-foreground/80">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Signup Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
                <div className="w-full max-w-lg">
                    <div className="animate-fade-in">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-foreground">Create Organization</h2>
                            <p className="text-muted-foreground mt-2">Enter your company details to set up your workspace</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Autofill Honeypot - hidden inputs to trick browsers */}
                            <div style={{ display: 'none' }}>
                                <input type="text" name="username" tabIndex={-1} autoComplete="off" />
                                <input type="password" name="password" tabIndex={-1} autoComplete="off" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Organization Details */}
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Organization Details</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="tenantName">Company Name</Label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    id="tenantName"
                                                    placeholder="Acme Corp"
                                                    required
                                                    className="pl-10 h-11"
                                                    value={formData.tenantName}
                                                    onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="slug">Workspace URL (Slug)</Label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    id="slug"
                                                    placeholder="acme-corp"
                                                    required
                                                    className="pl-10 h-11"
                                                    value={formData.slug}
                                                    onChange={handleSlugChange}
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                Your workspace: <span className="font-mono text-primary">{formData.slug || "your-slug"}.identix.com</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Admin Details */}
                                <div className="md:col-span-2 pt-2">
                                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 border-t pt-6">Administrator Settings</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="adminName">Full Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    id="adminName"
                                                    placeholder="John Doe"
                                                    required
                                                    className="pl-10 h-11"
                                                    value={formData.adminName}
                                                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="adminEmail">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    id="adminEmail"
                                                    name={`email_${Math.random().toString(36).slice(2, 7)}`}
                                                    type="email"
                                                    placeholder="admin@company.com"
                                                    required
                                                    autoComplete="off"
                                                    className="pl-10 h-11"
                                                    value={formData.adminEmail}
                                                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                                    onFocus={(e) => e.target.removeAttribute('readonly')}
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="adminPassword">Admin Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    id="adminPassword"
                                                    name={`pass_${Math.random().toString(36).slice(2, 7)}`}
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    required
                                                    minLength={8}
                                                    autoComplete="new-password"
                                                    className="pl-10 pr-10 h-11"
                                                    value={formData.adminPassword}
                                                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                                    onFocus={(e) => e.target.removeAttribute('readonly')}
                                                    readOnly
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                Must be 8+ characters with at least 1 number and 1 special character.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold transition-transform hover:scale-[1.01]"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "Provision Organization"}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterOrganization;
