import { toChineseError } from "@/lib/errorMessage";
import { useState } from "react";
import { AlertTriangle, Link2, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiFetch, googleOAuthStartUrl } from "@/lib/api";

export default function Register() {
  const { isEnglish } = useLanguage();
  const [location, setLocation] = useLocation();
  const [voterId, setVoterId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const query = new URLSearchParams(location.split("?")[1] || "");
  const googleResult = query.get("google");
  const googleMessage = googleResult === "email_not_allowed"
    ? (isEnglish ? "This Google email is not in the registration sheet." : "這個 Google Email 不在註冊名單中。")
    : googleResult === "not_configured"
      ? (isEnglish ? "Google sign-in is not configured yet." : "Google 登入尚未完成設定。")
      : googleResult
        ? (isEnglish ? "Google registration failed. Please try again." : "Google 註冊失敗，請再試一次。")
        : null;

  const handleIdRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const id = voterId.trim();
    const trimmedPassword = password.trim();
    if (!id || !trimmedPassword) {
      setError(isEnglish ? "Enter your registration ID and password." : "請輸入註冊 ID 與密碼。");
      return;
    }
    if (trimmedPassword.length < 4) {
      setError(isEnglish ? "Password must contain at least 4 characters." : "密碼至少需要 4 個字元。");
      return;
    }
    if (trimmedPassword !== confirmPassword.trim()) {
      setError(isEnglish ? "The passwords do not match." : "兩次輸入的密碼不一致。");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: id, password: trimmedPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(toChineseError(data.error, isEnglish ? "Registration failed. Check your ID and try again." : "註冊失敗，請確認 ID 後再試。"));
        return;
      }
      setSuccess(true);
      window.setTimeout(() => setLocation("/login?registered=1"), 1200);
    } catch {
      setError(isEnglish ? "Connection error. Please try again." : "連線錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const startGoogleRegistration = () => window.location.assign(googleOAuthStartUrl("login"));

  return (
    <div className="min-h-screen bg-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
              <UserPlus className="w-6 h-6" />{isEnglish ? "Create a FUMO account" : "註冊 FUMO 帳戶"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isEnglish ? "Choose ID and password, or Google. ID registration requires an entry in the official registration list." : "可選擇 ID 與密碼，或使用 Google 註冊；ID 必須已列於官方註冊名單。"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {googleMessage && <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-md" role="alert"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span className="text-sm">{googleMessage}</span></div>}
            {success ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800" role="status">
                {isEnglish ? "ID registration successful. Redirecting you to sign in…" : "ID 註冊成功，正在前往登入頁…"}
              </div>
            ) : (
              <>
                <form onSubmit={handleIdRegister} className="space-y-4">
                  <h2 className="text-sm font-semibold">{isEnglish ? "Register with ID and password" : "使用 ID 與密碼註冊"}</h2>
                  <div>
                    <label htmlFor="register-id" className="block text-sm font-medium mb-1">{isEnglish ? "Registration ID (Discord ID)" : "註冊 ID（Discord ID）"}</label>
                    <Input id="register-id" value={voterId} onChange={event => setVoterId(event.target.value)} placeholder={isEnglish ? "Enter your registration ID" : "輸入註冊名單中的 ID"} autoComplete="username" inputMode="numeric" />
                    <p className="text-xs text-muted-foreground mt-1">{isEnglish ? "Your ID must be listed in the official registration sheet. Registration does not automatically grant voting eligibility." : "ID 必須在官方註冊名單內；完成註冊不代表自動取得投票資格。"}</p>
                  </div>
                  <div>
                    <label htmlFor="register-password" className="block text-sm font-medium mb-1">{isEnglish ? "Set password" : "設定密碼"}</label>
                    <Input id="register-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={isEnglish ? "At least 4 characters" : "至少 4 個字元"} autoComplete="new-password" />
                  </div>
                  <div>
                    <label htmlFor="register-confirm-password" className="block text-sm font-medium mb-1">{isEnglish ? "Confirm password" : "確認密碼"}</label>
                    <Input id="register-confirm-password" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder={isEnglish ? "Enter the password again" : "再次輸入密碼"} autoComplete="new-password" />
                  </div>
                  {error && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md" role="alert"><AlertTriangle className="w-4 h-4 shrink-0" /><span className="text-sm">{error}</span></div>}
                  <Button type="submit" disabled={loading || success} className="w-full min-h-11 bg-primary text-primary-foreground hover:bg-primary/90">
                    {loading ? (isEnglish ? "Creating account…" : "建立帳戶中…") : (isEnglish ? "Register with ID" : "使用 ID 註冊")}
                  </Button>
                </form>
                <div className="relative py-1" aria-hidden="true"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-muted-foreground">{isEnglish ? "OR" : "或"}</span></div></div>
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold">{isEnglish ? "Register with Google" : "使用 Google 註冊"}</h2>
                  <p className="text-xs text-muted-foreground">{isEnglish ? "Google registration is available when your email is on the official registration list." : "Google 註冊需使用已列於官方註冊名單的 Email。"}</p>
                  <Button type="button" variant="outline" onClick={startGoogleRegistration} className="w-full min-h-11 gap-2"><Link2 className="w-4 h-4" />{isEnglish ? "Continue with Google" : "使用 Google 帳戶註冊"}</Button>
                </div>
                <p className="text-center text-sm text-muted-foreground">{isEnglish ? "Already have an account?" : "已經有帳戶？"}{" "}<Link href="/login" className="text-primary font-medium hover:underline">{isEnglish ? "Sign in with ID or Google" : "使用 ID 或 Google 登入"}</Link></p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
