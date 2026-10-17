import { AlertTriangle, KeyRound, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { googleOAuthStartUrl } from "@/lib/api";

export default function Login() {
  const { isEnglish } = useLanguage();
  const { user } = useAuth();
  const [location] = useLocation();
  const result = new URLSearchParams(location.split("?")[1] || "").get("google");
  const message = result === "email_not_allowed"
    ? (isEnglish ? "This Google email is not in the registration sheet." : "此 Google Email 不在註冊名單中，請先由管理員加入表格。")
    : result === "unlinked"
      ? (isEnglish ? "Your Google email is not registered in the FUMO sheet." : "此 Google Email 尚未加入 FUMO 註冊名單。")
      : result === "google_already_linked"
        ? (isEnglish ? "This Google account is already linked to another account." : "此 Google 帳戶已綁定其他帳戶。")
        : result === "account_already_linked"
          ? (isEnglish ? "This FUMO account is already linked to another Google account." : "此 FUMO 帳戶已綁定其他 Google 帳戶。")
          : result === "not_configured"
            ? (isEnglish ? "Google sign-in is not configured yet." : "Google 登入尚未完成設定。")
            : result
              ? (isEnglish ? "Google sign-in failed. Please try again." : "Google 登入失敗，請再試一次。")
              : null;
  const startGoogle = () => window.location.assign(googleOAuthStartUrl(user ? "link" : "login"));

  return (
    <div className="min-h-screen bg-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2"><KeyRound className="w-6 h-6" />{isEnglish ? "Sign in with Google" : "使用 Google 登入"}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{isEnglish ? "Only Google emails listed in the registration sheet are allowed." : "只有註冊名單 Email 欄位中的 Google 帳戶可以註冊與登入。"}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-md"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span className="text-sm">{message}</span></div>}
            <Button type="button" onClick={startGoogle} className="w-full min-h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Link2 className="w-4 h-4" />{user ? (isEnglish ? "Connect Google account" : "綁定 Google 帳戶") : (isEnglish ? "Continue with Google" : "使用 Google 帳戶繼續")}</Button>
            <p className="text-center text-sm text-muted-foreground">{isEnglish ? "New user?" : "新使用者？"}{" "}<Link href="/register" className="text-primary font-medium hover:underline">{isEnglish ? "Register with Google" : "使用 Google 註冊"}</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
