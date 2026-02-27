import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation, Link, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { navItems, NavItem } from "@/lib/navigation";
import { Fingerprint, LogOut, Moon, Sun, HelpCircle } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeContext";
import { GuideTour } from "@/components/common/GuideTour";
import { OnboardingModal } from "@/components/common/OnboardingModal";
import { WelcomeModal } from "@/components/common/WelcomeModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
export default function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, role, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [leavesEnabled, setLeavesEnabled] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [sidebarOrder, setSidebarOrder] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState("IdentixHR");
  const [runTour, setRunTour] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Show welcome modal once when user is newly onboarded (Active)
  useEffect(() => {
    if (user?.id && profile?.onboarding_status === 'Active') {
      const key = `welcome_seen_${user.id}`;
      if (!localStorage.getItem(key)) {
        setShowWelcome(true);
        localStorage.setItem(key, '1');
      }
    }
  }, [user?.id, profile?.onboarding_status]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await apiClient.get("/settings");
        if (data) {
          setLeavesEnabled(data.leaves_enabled ?? true);
          setCompanyName("IdentixHR");
          if (data.sidebar_order) {
            try {
              setSidebarOrder(JSON.parse(data.sidebar_order));
            } catch (e) {
              console.error("Failed to parse sidebar order", e);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings in layout", err);
      }
    };
    const fetchPermissions = async () => {
      try {
        const { data } = await apiClient.get("/role-permissions");
        setRolePermissions(data || {});
      } catch (err) {
        console.error("Failed to fetch role permissions", err);
      }
    };
    fetchSettings();
    fetchPermissions();
  }, []);

  const sortedNav = [...navItems].sort((a, b) => {
    if (sidebarOrder.length === 0) return 0;
    const indexA = sidebarOrder.indexOf(a.moduleKey!);
    const indexB = sidebarOrder.indexOf(b.moduleKey!);

    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const filteredNav = sortedNav.filter((item) => {
    if (!role) return false;

    // Super Admin always sees everything
    if (role === "super_admin") return true;

    // For admin and other roles, check dynamic permissions
    if (item.moduleKey) {
      const perms = rolePermissions[role];
      if (perms && perms[item.moduleKey] !== undefined) {
        if (!perms[item.moduleKey]) return false;
      } else {
        // Fallback to hardcoded roles if permissions not loaded yet
        if (!item.roles.includes(role)) return false;
      }
    } else {
      // No moduleKey means static (e.g. Dashboard) — use hardcoded roles
      if (!item.roles.includes(role)) return false;
    }

    // Visibility toggle for Leave Requests (legacy setting)
    if (item.label === "Leave Requests" && !leavesEnabled) {
      return false;
    }

    return true;
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen">
      <GuideTour run={runTour} setRun={setRunTour} />
      <div className="bg-mesh" />
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar/80 backdrop-blur-xl text-sidebar-foreground flex flex-col fixed inset-y-0 left-0 z-30 border-r border-sidebar-border/50 glass">
        <div className="p-5 flex items-center gap-3 border-b border-sidebar-border" data-tour="sidebar-brand">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-sidebar-foreground">{companyName}</h2>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {role === "subadmin" ? "Manager" : role?.replace("_", " ")} Panel
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" data-tour="sidebar-nav">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                data-tour={`nav-${item.moduleKey}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{profile?.full_name || "User"}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            data-tour="theme-toggle"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 mb-1"
          >
            {theme === "light" ? (
              <>
                <Moon className="w-4 h-4 mr-2" />
                Dark Mode
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 mr-2" />
                Light Mode
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSignOutConfirm(true)}
            data-tour="user-profile"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRunTour(true);
            }}
            data-tour="guide-button"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 mt-1"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Start Guide
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children || <Outlet />}
        </div>
      </main>

      {/* Welcome modal for newly onboarded users */}
      {showWelcome && (
        <WelcomeModal
          userName={profile?.full_name?.split(' ')[0] || 'there'}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {/* Sign Out Confirmation */}
      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleSignOut}
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
