import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import apiClient from "@/lib/apiClient";

type AppRole = "super_admin" | "admin" | "subadmin" | "employee";

interface User {
  id: string;
  email: string;
  role: AppRole;
  gender?: 'male' | 'female' | 'other';
}

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      const response = await apiClient.get("/auth/me");
      const data = response.data;
      setUser({ id: data.id, email: data.email, role: data.role });
      setRole(data.role);
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch user data", err);
      signOut();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.post("/auth/login", { email, password });
      const { token, user: userData } = response.data;
      localStorage.setItem("token", token);
      setUser(userData);
      setRole(userData.role);
      await fetchUserData();
      return { error: null };
    } catch (err: any) {
      return { error: err.response?.data?.error || "Login failed" };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      await apiClient.post("/auth/register", { email, password, full_name: fullName });
      return { error: null };
    } catch (err: any) {
      return { error: err.response?.data?.error || "Registration failed" };
    }
  };

  const signOut = async () => {
    localStorage.removeItem("token");
    setUser(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
