import { toChineseError } from "@/lib/errorMessage";
import { apiFetch, discordOAuthStartUrl, googleOAuthStartUrl } from "@/lib/api";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, KeyRound, Link2, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Login() {
  const { isEnglish } = useLanguage();
  const { login, user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [voterId, setVoterId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const query = new URLSearchParams(location.split("?")[1] || "");
  const requestedNext = query.get("next");
  const returnTo = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\")
    ? (() => {
        try {
          const target = new URL(requestedNext, window.location.origin);
          return target.origin === window.location.origin ? `${target.pathname}${target.search}${target.hash}` : "/votes";
        } catch {
          return "/votes";
        }
      })()
    : "/votes";
  const googleResult = query.get("google");
  const discordResult = query.get("discord");
  const registered = query.get("registered") === "1";
  const googleMessage = googleResult === "email_not_allowed"
    ? (isEnglish ? "This Google email is not in the registration sheet." : "此 Google Email 不在註冊名單中，請先由管理員加入表格。")
    : googleResult === "unlinked"
      ? (isEnglish ? "Your Google email is not registered in the FUMO sheet." : "此 Google Email 尚未加入 FUMO 註冊名單。")
      : googleResult === "google_already_linked"
        ? (isEnglish ? "This Google account is already linked to another account." : "此 Google 帳戶已綁定其他帳戶。")
        : googleResult === "account_already_linked"
          ? (isEnglish ? "This FUMO account is already linked to another Google account." : "此 FUMO 帳戶已綁定其他 Google 帳戶。")
          : googleResult === "not_configured"
            ? (isEnglish ? "Google sign-in is not configured yet." : "Google 登入尚未完成設定。")
            : googleResult
              ? (isEnglish ? "Google sign-in failed. Please try again." : "Google 登入失敗，請再試一次。")
              : null;
  const discordMessage = discordResult === "connected"
    ? (isEnglish ? "Discord account connected to your FUMO account." : "Discord 帳戶已連結至目前的 FUMO 帳戶。")
    : discordResult === "login"
      ? (isEnglish ? "Signed in with Discord." : "已使用 Discord 登入。")
      : discordResult === "id_not_registered"
    ? (isEnglish ? "This Discord account is not in the FUMO registration list." : "此 Discord 帳戶的 ID 不在 FUMO 註冊名單中。")
    : discordResult === "discord_id_mismatch"
      ? (isEnglish ? "The Discord account does not match this FUMO account." : "此 Discord 帳戶與目前 FUMO 帳戶不一致。")
      : discordResult === "not_configured"
        ? (isEnglish ? "Discord sign-in is not configured yet." : "Discord 登入尚未完成設定。")
        : discordResult === "denied"
          ? (isEnglish ? "Discord sign-in was cancelled." : "你已取消 Discord 登入。")
          : discordResult ? (isEnglish ? "Discord sign-in failed. Please try again." : "Discord 登入失敗，請再試一次。") : null;

  useEffect(() => {
    if (!authLoading && user && discordResult === "login") window.location.assign(returnTo);
  }, [authLoading, discordResult, returnTo, user]);

  const startGoogle = () => window.location.assign(googleOAuthStartUrl(user ? "link" : "login", user ? undefined : returnTo));
  const startDiscord = () => window.location.assign(discordOAuthStartUrl(user ? "link" : "login"));

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const id = voterId.trim();
    if (!id || !password.trim()) {
      setError(isEnglish ? "Enter your ID and password." : "請輸入 ID 與密碼。");
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: id, password: password.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(toChineseError(data.error, isEnglish ? "Sign-in failed. Check your ID and password." : "登入失敗，請確認 ID 與密碼。"));
        return;
      }
      login({ voterId: data.voterId, voterName: data.voterName, countryName: data.countryName, adminLevel: data.adminLevel ?? 0 });
      if (returnTo === "/documents" || returnTo.startsWith("/documents/")) window.location.assign(returnTo);
      else setLocation(returnTo);
    } catch {
      setError(isEnglish ? "Connection error. Please try again." : "連線錯誤，請稍後再試。");
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
              <KeyRound className="w-6 h-6" />{isEnglish ? "Sign in to FUMO" : "登入 FUMO 帳戶"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isEnglish ? "Sign in with your registration ID and password, or use Google if your account is linked." : "可使用註冊 ID 與密碼登入；已連結的 Google 帳戶也可登入。"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {registered && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{isEnglish ? "ID registration successful. Sign in with your ID and password." : "ID 註冊成功，請使用 ID 與密碼登入。"}</div>}
            {googleMessage && <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-md" role="alert"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span className="text-sm">{googleMessage}</span></div>}
            {discordMessage && <div className={`flex items-start gap-2 rounded-md p-3 ${discordResult === "login" || discordResult === "connected" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`} role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span className="text-sm">{discordMessage}</span></div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-id" className="block text-sm font-medium mb-1">{isEnglish ? "Registration ID" : "註冊 ID（Discord ID）"}</label>
                <Input id="login-id" value={voterId} onChange={event => setVoterId(event.target.value)} placeholder={isEnglish ? "Enter your registration ID" : "輸入註冊名單中的 ID"} autoComplete="username" />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium mb-1">{isEnglish ? "Password" : "密碼"}</label>
                <Input id="login-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={isEnglish ? "Enter your password" : "輸入密碼"} autoComplete="current-password" />
              </div>
              {error && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md" role="alert"><AlertTriangle className="w-4 h-4 shrink-0" /><span className="text-sm">{error}</span></div>}
              <Button type="submit" disabled={loading} className="w-full min-h-11 bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? (isEnglish ? "Signing in..." : "登入中…") : (isEnglish ? "Sign in with ID and password" : "使用 ID 與密碼登入")}
              </Button>
            </form>
            <div className="relative py-1" aria-hidden="true"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-muted-foreground">{isEnglish ? "OR" : "或"}</span></div></div>
            <Button type="button" variant="outline" onClick={startGoogle} className="w-full min-h-11 gap-2">
              <Link2 className="w-4 h-4" />{user ? (isEnglish ? "Connect Google account" : "連接 Google 帳戶") : (isEnglish ? "Continue with Google" : "使用 Google 帳戶登入")}
            </Button>
            <Button type="button" variant="outline" onClick={startDiscord} className="w-full min-h-11 gap-2">
              <MessageCircle className="w-4 h-4" />{user ? (isEnglish ? "Connect Discord account" : "連接 Discord 帳戶") : (isEnglish ? "Continue with Discord" : "使用 Discord 登入")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {user ? (isEnglish ? "This links Google to your signed-in FUMO account." : "此操作會將 Google 帳戶連結至目前已登入的 FUMO 帳戶。") : (isEnglish ? "Google sign-in is available for accounts registered with an allowed email." : "Google 登入適用於已列入註冊名單 Email 的帳戶；也可直接使用 ID 與密碼登入。")}
            </p>
            <p className="text-center text-sm text-muted-foreground">
              {isEnglish ? "No account yet?" : "還沒有帳戶？"}{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">{isEnglish ? "Register with ID or Google" : "使用 ID 或 Google 註冊"}</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
