import { toChineseError } from "@/lib/errorMessage";
import { apiFetch, googleOAuthStartUrl } from "@/lib/api";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, KeyRound, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Login() {
  const { isEnglish } = useLanguage();
  const [voterId, setVoterId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();

  const beginGoogleFlow = () => {
    const mode = user ? "link" : "login";
    window.location.assign(googleOAuthStartUrl(mode));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!voterId.trim() || !password.trim()) {
      setError("請輸入 Discord ID 和密碼");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: voterId.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(toChineseError(data.error, "登入失敗，請確認 Discord ID 與密碼。"));
        return;
      }
      login({ voterId: data.voterId, voterName: data.voterName, countryName: data.countryName, adminLevel: data.adminLevel ?? 0 });
      setLocation("/votes");
    } catch {
      setError("連線錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2"><KeyRound className="w-6 h-6" />{isEnglish ? "Sign in" : "登入帳戶"}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{isEnglish ? "Sign in with your Discord ID and password, or a linked Google account." : "使用 Discord ID 與密碼，或已連接的 Google 帳戶登入。"}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Discord ID</label><Input value={voterId} onChange={(e) => setVoterId(e.target.value)} placeholder="例如: 1192442242753896541" autoComplete="username" /></div>
              <div><label className="block text-sm font-medium mb-1">密碼 Password</label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="輸入您的密碼" autoComplete="current-password" /></div>
              {error && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md"><AlertTriangle className="w-4 h-4 shrink-0" /><span className="text-sm">{error}</span></div>}
              <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">{loading ? (isEnglish ? "Signing in..." : "登入中...") : (isEnglish ? "Sign in with Discord ID" : "使用 Discord ID 登入")}</Button>
              <Button type="button" variant="outline" onClick={beginGoogleFlow} className="w-full min-h-11 gap-2"><Link2 className="w-4 h-4" />{user ? (isEnglish ? "Connect Google" : "連接 Google") : (isEnglish ? "Continue with Google" : "使用 Google 登入")}</Button>
              <p className="text-center text-xs text-muted-foreground">{user ? (isEnglish ? "This links a Google account to your currently signed-in FUMO account." : "此操作會將 Google 帳戶綁定至目前已登入的 FUMO 帳戶。") : (isEnglish ? "Google sign-in is available after you link it from an existing FUMO account." : "Google 登入僅適用於已綁定的帳戶；第一次連接請先用 Discord ID 與密碼登入。")}</p>
              <p className="text-center text-sm text-muted-foreground">{isEnglish ? "No account yet?" : "還沒有帳戶？"}{" "}<Link href="/register" className="text-primary font-medium hover:underline">{isEnglish ? "Register here" : "前往註冊"}</Link></p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
