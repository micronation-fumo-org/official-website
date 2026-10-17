import { useState } from "react";
import { AlertTriangle, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiFetch, googleOAuthStartUrl } from "@/lib/api";

export default function Register() {
  const { isEnglish } = useLanguage();
  const [location] = useLocation();
  const result = new URLSearchParams(location.split("?")[1] || "").get("google");
  const [voterId, setVoterId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const idRequired = result === "id_required";
  const message = result === "email_not_allowed"
    ? (isEnglish ? "This Google email is not in the registration sheet." : "這個 Google Email 不在註冊名單中。")
    : result === "not_configured"
      ? (isEnglish ? "Google sign-in is not configured yet." : "Google 登入尚未完成設定。")
      : result && !idRequired ? (isEnglish ? "Google registration failed. Please try again." : "Google 註冊失敗，請再試一次。") : null;

  const completeRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!voterId.trim()) { setError(isEnglish ? "Enter your registration ID." : "請輸入註冊 ID。"); return; }
    setLoading(true);
    try {
      const response = await apiFetch("/api/auth/google/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voterId: voterId.trim() }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || (isEnglish ? "Registration failed." : "註冊失敗。")); return; }
      window.location.assign("/votes");
    } catch { setError(isEnglish ? "Connection error. Please try again." : "連線錯誤，請再試一次。"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2"><UserPlus className="w-6 h-6" />{isEnglish ? "Register with Google" : "使用 Google 註冊"}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{idRequired ? (isEnglish ? "Your Google account is verified. Enter the registration ID assigned to you." : "Google 帳戶已驗證，請輸入分配給您的註冊 ID。") : (isEnglish ? "Use Google to register. If your sheet row has an Email, it must match your Google email." : "使用 Google 註冊；若表格該列有 Email，必須與 Google Email 相符。")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-md"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span className="text-sm">{message}</span></div>}
            {idRequired ? (
              <form onSubmit={completeRegistration} className="space-y-3">
                <label className="block text-sm font-medium">{isEnglish ? "Registration ID" : "註冊 ID"}</label>
                <Input value={voterId} onChange={event => setVoterId(event.target.value)} placeholder={isEnglish ? "Enter your registration ID" : "輸入註冊名單中的 ID"} autoComplete="off" className="min-h-11" />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full min-h-11 bg-primary text-primary-foreground hover:bg-primary/90">{loading ? (isEnglish ? "Creating account..." : "建立帳戶中...") : (isEnglish ? "Complete registration" : "完成註冊")}</Button>
              </form>
            ) : (
              <Button type="button" onClick={() => window.location.assign(googleOAuthStartUrl("login"))} className="w-full min-h-11 bg-primary text-primary-foreground hover:bg-primary/90">{isEnglish ? "Continue with Google" : "使用 Google 帳戶註冊"}</Button>
            )}
            <p className="text-center text-sm text-muted-foreground">{isEnglish ? "Already registered?" : "已經註冊？"}{" "}<Link href="/login" className="text-primary font-medium hover:underline">{isEnglish ? "Sign in with Google" : "使用 Google 登入"}</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
