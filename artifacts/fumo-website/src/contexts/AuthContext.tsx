import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch } from "@/lib/api";

export interface AuthUser {
  voterId: string;
  voterName: string;
  countryName: string;
  adminLevel: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isTier2Admin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then(async (res) => (res.ok ? setUser(await res.json()) : setUser(null)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = (u: AuthUser) => setUser(u);
  const logout = async () => {
    try { await apiFetch("/api/auth/logout", { method: "POST" }); } finally { setUser(null); }
  };
  const adminLevel = user?.adminLevel ?? 0;

  return <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: adminLevel >= 1, isTier2Admin: adminLevel >= 2, isSuperAdmin: adminLevel >= 9 }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
