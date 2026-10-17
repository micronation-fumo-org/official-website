import { AlertTriangle, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { googleOAuthStartUrl } from "@/lib/api";

export default function Register() {
  const { isEnglish } = useLanguage();
  const [location] = useLocation();
  const result = new URLSearchParams(location.split("?")[1] || "").get("google");
  const message = result === "email_not_allowed"
    ? (isEnglish ? "This Google email is not in the registration sheet." : "這個 Google Email 不在註冊名單中，請先請管理員加入表格。")
    : result === "not_configured"
      ? (isEnglish ? "Google sign-in is not configured yet." : "Google 登入尚未完成設定。")
      : result ? (isEnglish ? "Google registration failed. Please try again." : "Google 註冊失敗，請再試一次。") : null;

  return (
    <div className="min-h-screen bg-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2"><UserPlus className="w-6 h-6" />{isEnglish ? "Register with Google" : "使用 Google 註冊"}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{isEnglish ? "Your verified Google email must match the Email column in the registration sheet." : "已驗證的 Google Email 必須與註冊名單中的 Email 欄位相符。"}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-md"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span className="text-sm">{message}</span></div>}
            <Button type="button" onClick={() => window.location.assign(googleOAuthStartUrl("login"))} className="w-full min-h-11 bg-primary text-primary-foreground hover:bg-primary/90">{isEnglish ? "Continue with Google" : "使用 Google 帳戶註冊"}</Button>
            <p className="text-center text-sm text-muted-foreground">{isEnglish ? "Already registered?" : "已經註冊？"}{" "}<Link href="/login" className="text-primary font-medium hover:underline">{isEnglish ? "Sign in with Google" : "使用 Google 登入"}</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
