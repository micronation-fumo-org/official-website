import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, UserPlus } from "lucide-react";

export default function Register() {
  const [voterId, setVoterId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!voterId.trim() || !password.trim()) {
      setError("請填寫所有欄位");
      return;
    }
    if (password.length < 4) {
      setError("密碼至少需要 4 個字元");
      return;
    }
    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: voterId.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "註冊失敗");
        return;
      }
      setSuccess(`註冊成功！歡迎，${data.voterName}。正在前往登入頁面…`);
      setTimeout(() => setLocation("/login"), 1800);
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
              <UserPlus className="w-6 h-6" />
              註冊帳戶 Register
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              僅限已登記的成員國代表可以註冊
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Discord ID</label>
                <Input
                  value={voterId}
                  onChange={(e) => setVoterId(e.target.value)}
                  placeholder="例如: 1192442242753896541"
                  autoComplete="username"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  必須是投票資料表中已登記的代表 Discord 數字 ID
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">設定密碼 Set Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 4 個字元"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">確認密碼 Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次輸入密碼"
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  首次設定的密碼將成為此帳戶的永久密碼（可在設定中更改）。
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !!success}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "處理中..." : "註冊 Register"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                已有帳戶？{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  前往登入
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
