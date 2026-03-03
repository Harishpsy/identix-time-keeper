import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Loader2, Eye, EyeOff, Shield, Clock, Users } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error); // Error is now a string from useAuth
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    navigate("/");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-foreground/10 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite_1s]" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl animate-[pulse_5s_ease-in-out_infinite_2s]" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-primary-foreground">
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/20">
                <Fingerprint className="w-9 h-9" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">IdentixHR</h1>
                <p className="text-primary-foreground/70 text-lg">Attendance Tracking</p>
              </div>
            </div>

            <h2 className="text-3xl font-semibold mb-4 leading-tight">
              Smart Workforce<br />Management
            </h2>
            <p className="text-primary-foreground/60 text-lg mb-12 max-w-md">
              Track attendance, manage shifts, and streamline payroll — all in one place.
            </p>

            <div className="space-y-6">
              {[
                { icon: Clock, label: "Real-time Attendance", desc: "Biometric & web check-in" },
                { icon: Users, label: "Team Management", desc: "Departments, shifts & leaves" },
                { icon: Shield, label: "Secure & Reliable", desc: "Role-based access control" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 animate-fade-in"
                  style={{ animationDelay: `${(i + 1) * 150}ms`, animationFillMode: "both" }}
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-foreground/10 border border-primary-foreground/10 flex items-center justify-center backdrop-blur-sm">
                    <item.icon className="w-5 h-5 text-primary-foreground/80" />
                  </div>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-primary-foreground/50">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-10 lg:hidden animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Fingerprint className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">IdentixHR</h1>
              <p className="text-sm text-muted-foreground">Attendance Tracking</p>
            </div>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-1">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="h-11 pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-8">
              Contact your administrator if you need access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
