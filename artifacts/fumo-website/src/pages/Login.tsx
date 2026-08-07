import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

export default function Login() {
  const [voterId, setVoterId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!voterId.trim() || !password.trim()) {
      setError("請輸入 Discord ID 和密碼");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: voterId.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登入失敗");
        return;
      }
      login({
        voterId: data.voterId,
        voterName: data.voterName,
        countryName: data.countryName,
        adminLevel: data.adminLevel ?? 0,
      });
      setLocation("/votes");
    } catch {
      setError("連線錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
              <KeyRound className="w-6 h-6" />
              登入帳戶 Login
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              使用您的 Discord ID 和密碼登入
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Discord ID</label>
                <Input
                  value={voterId}
                  onChange={(e) => setVoterId(e.target.value)}
                  placeholder="例如: 1192442242753896541"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">密碼 Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="輸入您的密碼"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "登入中..." : "登入 Login"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                還沒有帳戶？{" "}
                <Link href="/register" className="text-primary font-medium hover:underline">
                  前往註冊
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
