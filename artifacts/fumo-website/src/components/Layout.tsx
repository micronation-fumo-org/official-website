import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Menu, X, Shield, LogIn, UserPlus, LogOut, User, Languages, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { charterUrlEn, charterUrlZh } from "@/data/regulations";
import { googleOAuthStartUrl } from "@/lib/api";

interface LayoutProps { children: ReactNode; }

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isDesktopMoreOpen, setIsDesktopMoreOpen] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<string | null>(null);
  const { user, logout, isAdmin } = useAuth();
  const { language, setLanguage, isEnglish } = useLanguage();

  const allNavLinks = isEnglish
    ? [
        { href: "/", label: "Home" },
        { href: "/members", label: "Member States" },
        { href: "/staff", label: "Positions" },
        { href: "/votes", label: "Voting" },
        { href: "/vote-records", label: "Vote records" },
        { href: "/attendance", label: "Attendance" },
        { href: "/regulations", label: "Regulations" },
        { href: "/charter", label: "Charter" },
        { href: "/partners", label: "Partner Organizations" },
      ]
    : [
        { href: "/", label: "首頁" },
        { href: "/members", label: "會員國" },
        { href: "/staff", label: "職位報告" },
        { href: "/votes", label: "投票" },
        { href: "/vote-records", label: "投票紀錄" },
        { href: "/attendance", label: "出席簽到" },
        { href: "/regulations", label: "法規" },
        { href: "/charter", label: "憲章" },
        { href: "/partners", label: "合作組織" },
      ];
  const morePaths = new Set(["/vote-records", "/attendance", "/regulations", "/charter", "/partners"]);
  const navLinks = allNavLinks.filter((link) => !morePaths.has(link.href));
  const moreNavLinks = allNavLinks.filter((link) => morePaths.has(link.href));

  const adminLevelLabel = (level: number) => {
    if (level >= 9) return isEnglish ? "Super Admin" : "最高管理員";
    if (level >= 2) return isEnglish ? "Tier 2 Admin" : "二階管理員";
    if (level >= 1) return isEnglish ? "Tier 1 Admin" : "一階管理員";
    return "";
  };

  const switchLanguage = () => setLanguage(language === "zh" ? "en" : "zh");
  const closeMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMobileMoreOpen(false);
    setIsDesktopMoreOpen(false);
  };
  const connectGoogle = () => window.location.assign(googleOAuthStartUrl("link"));
  useEffect(() => {
    setIsDesktopMoreOpen(false);
    setIsMobileMoreOpen(false);
  }, [location]);
  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("google");
    if (!status) {
      setGoogleStatus(null);
      return;
    }
    setGoogleStatus(status);
    url.searchParams.delete("google");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    const timeout = window.setTimeout(() => setGoogleStatus(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [location]);
  const googleStatusText = (code: string) => {
    const messages: Record<string, { zh: string; en: string }> = {
      connected: { zh: "Google 帳戶已成功連接至目前的 FUMO 帳戶。", en: "Google has been linked to your FUMO account." },
      login: { zh: "已使用已連接的 Google 帳戶登入。", en: "You signed in with your linked Google account." },
      unlinked: { zh: "此 Google 帳戶尚未連接 FUMO 帳戶。請先使用 Discord ID 與密碼登入，再選擇「連接 Google」。", en: "This Google account is not linked. Sign in with your Discord ID and password, then choose Connect Google." },
      sign_in_first: { zh: "請先登入 FUMO 帳戶，再連接 Google。", en: "Sign in to your FUMO account before connecting Google." },
      google_already_linked: { zh: "此 Google 帳戶已連接至另一個 FUMO 帳戶。", en: "This Google account is already linked to another FUMO account." },
      account_already_linked: { zh: "此 FUMO 帳戶已連接另一個 Google 帳戶；如需更換，請聯絡管理員。", en: "This FUMO account is already linked to a different Google account. Contact an administrator to change it." },
      session_changed: { zh: "連接期間登入狀態已變更或帳戶不存在，請重新登入後再試。", en: "Your sign-in changed during linking or the account no longer exists. Sign in and try again." },
      denied: { zh: "您取消了 Google 授權。", en: "You cancelled Google authorization." },
      not_configured: { zh: "Google 登入尚未設定完成，請聯絡管理員。", en: "Google sign-in is not configured yet. Contact an administrator." },
      invalid_state: { zh: "授權已逾時或驗證狀態無效，請重新開始。", en: "The authorization expired or its state was invalid. Please try again." },
      failed: { zh: "Google 驗證失敗，請稍後再試。", en: "Google verification failed. Please try again later." },
    };
    const message = messages[code] ?? messages.failed;
    return isEnglish ? message.en : message.zh;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90 shrink-0">
            <img src="/fumo-flag.png" alt="FUMO Flag" className="h-10 w-10 object-contain shadow-sm border border-border/50" />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight tracking-wide text-primary">聯微 FUMO</span>
            </div>
          </Link>

          <nav className="hidden lg:flex min-w-0 flex-1 items-center justify-center gap-5" aria-label={isEnglish ? "Main navigation" : "主要導覽"}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`text-sm font-medium transition-colors hover:text-secondary ${location === link.href ? "text-secondary font-bold" : "text-foreground/80"}`}>
                {link.label}
              </Link>
            ))}
            <div
              className="relative flex h-full items-center"
              onMouseEnter={() => setIsDesktopMoreOpen(true)}
              onMouseLeave={() => setIsDesktopMoreOpen(false)}
              onFocusCapture={() => setIsDesktopMoreOpen(true)}
              onBlur={(event) => {
                const nextTarget = event.relatedTarget;
                if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setIsDesktopMoreOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setIsDesktopMoreOpen(false);
              }}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-haspopup="menu"
                aria-expanded={isDesktopMoreOpen}
                onClick={() => setIsDesktopMoreOpen(true)}
                className={`gap-1 whitespace-nowrap px-2 ${moreNavLinks.some((link) => location === link.href) ? "text-secondary font-bold" : "text-foreground/80"}`}
              >
                {isEnglish ? "More" : "更多"}
                <ChevronDown className={`h-4 w-4 transition-transform ${isDesktopMoreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </Button>
              <div className={`absolute right-0 top-full z-50 min-w-52 pt-2 transition-opacity duration-150 ${isDesktopMoreOpen ? "visible opacity-100" : "invisible opacity-0"}`}>
                <div role="menu" aria-label={isEnglish ? "More pages" : "更多頁面"} className="rounded-md border border-border bg-background p-2 shadow-lg">
                  {moreNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      onClick={() => setIsDesktopMoreOpen(false)}
                      className={`block rounded-sm px-3 py-2 text-sm transition-colors hover:bg-muted hover:text-secondary ${location === link.href ? "font-semibold text-secondary" : "text-foreground/80"}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={switchLanguage} aria-label={isEnglish ? "Switch to Traditional Chinese" : "Switch to English"} className="gap-1.5">
              <Languages className="w-4 h-4" /> {isEnglish ? "繁中" : "EN"}
            </Button>
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && <Link href="/admin" className="shrink-0"><Button variant="ghost" size="sm" className="text-secondary text-xs gap-1 whitespace-nowrap"><Shield className="w-3 h-3 shrink-0" />{adminLevelLabel(user.adminLevel)}</Button></Link>}
                <span className="text-sm text-foreground/70 font-medium max-w-[120px] min-w-0 truncate">{user.voterName}</span>
                <Button variant="outline" size="sm" onClick={connectGoogle} className="gap-1.5 whitespace-nowrap"><Link2 className="w-4 h-4" />{isEnglish ? "Connect Google" : "連接 Google"}</Button>
                <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground"><LogOut className="w-4 h-4 mr-1" />{isEnglish ? "Sign out" : "登出"}</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login"><Button variant="ghost" size="sm" className="text-foreground/80"><LogIn className="w-4 h-4 mr-1" />{isEnglish ? "Sign in" : "登入"}</Button></Link>
                <Link href="/register"><Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"><UserPlus className="w-4 h-4 mr-1" />{isEnglish ? "Register" : "註冊"}</Button></Link>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => isMobileMenuOpen ? closeMenu() : setIsMobileMenuOpen(true)} aria-label={isEnglish ? "Open menu" : "開啟選單"}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background py-4 px-4 flex flex-col gap-3 shadow-lg absolute w-full">
            {navLinks.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu} className={`text-sm font-medium py-2 transition-colors hover:text-secondary ${location === link.href ? "text-secondary font-bold" : "text-foreground/80"}`}>{link.label}</Link>)}
            <div className="border-y border-border py-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={isMobileMoreOpen}
                onClick={() => setIsMobileMoreOpen((open) => !open)}
                className="flex w-full items-center justify-between px-2"
              >
                <span>{isEnglish ? "More" : "更多"}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isMobileMoreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </Button>
              {isMobileMoreOpen && (
                <div className="ml-2 flex flex-col border-l border-border pl-3">
                  {moreNavLinks.map((link) => (
                    <Link key={link.href} href={link.href} onClick={closeMenu} className={`py-2 text-sm transition-colors hover:text-secondary ${location === link.href ? "font-bold text-secondary" : "text-foreground/80"}`}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => { switchLanguage(); closeMenu(); }} className="justify-start gap-2"><Languages className="w-4 h-4" />{isEnglish ? "繁體中文" : "English"}</Button>
            <div className="border-t border-border pt-3 flex flex-col gap-2">
              {user ? <>
                <div className="flex items-start gap-2 text-sm font-medium text-foreground min-w-0">
                  <User className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="min-w-0 break-words">{user.voterName}</span>
                  {isAdmin && <span className="text-xs text-secondary ml-auto shrink-0 whitespace-nowrap">({adminLevelLabel(user.adminLevel)})</span>}
                </div>
                {isAdmin && <Link href="/admin" onClick={closeMenu} className="text-sm text-secondary font-medium flex items-center gap-1"><Shield className="w-4 h-4" />{isEnglish ? "Admin panel" : "管理面板"}</Link>}
                <Button variant="outline" size="sm" onClick={() => { connectGoogle(); closeMenu(); }} className="justify-start gap-2 w-full"><Link2 className="w-4 h-4" />{isEnglish ? "Connect Google" : "連接 Google"}</Button>
                <Button variant="ghost" size="sm" onClick={() => { logout(); closeMenu(); }} className="justify-start text-muted-foreground w-fit"><LogOut className="w-4 h-4 mr-1" />{isEnglish ? "Sign out" : "登出"}</Button>
              </> : <>
                <Link href="/login" onClick={closeMenu}><Button variant="ghost" size="sm" className="text-foreground/80 justify-start w-full"><LogIn className="w-4 h-4 mr-1" />{isEnglish ? "Sign in" : "登入"}</Button></Link>
                <Link href="/register" onClick={closeMenu}><Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 justify-start w-full"><UserPlus className="w-4 h-4 mr-1" />{isEnglish ? "Register" : "註冊"}</Button></Link>
              </>}
            </div>
          </div>
        )}
      </header>

      {googleStatus && <div className="container mx-auto px-4 pt-3"><div className={`flex items-start justify-between gap-3 rounded-md border p-3 text-sm ${googleStatus === "connected" || googleStatus === "login" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`} role={googleStatus === "connected" || googleStatus === "login" ? "status" : "alert"}><span>{googleStatusText(googleStatus)}</span><button type="button" onClick={() => setGoogleStatus(null)} aria-label={isEnglish ? "Dismiss" : "關閉提示"} className="shrink-0 font-bold">×</button></div></div>}
      <main className="flex-1 w-full">{children}</main>

      <footer className="bg-primary text-primary-foreground border-t border-primary/20 py-12 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div><div className="flex items-center gap-3 mb-4"><img src="/fumo-flag.png" alt="FUMO Flag" className="h-8 w-8 object-contain" /><h3 className="font-bold text-lg">Federation of United Micronations Organisation</h3></div><p className="text-primary-foreground/70 text-sm max-w-xs">{isEnglish ? "United in determination, advancing together." : "眾志成城，攜手共進。"}</p></div>
          <div><h4 className="font-bold mb-4 text-secondary">{isEnglish ? "Quick links" : "快速連結"}</h4><div className="flex flex-col gap-2">{allNavLinks.map((link) => <Link key={link.href} href={link.href} className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">{link.label}</Link>)}<Link href="/admin" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit flex items-center gap-1"><Shield className="w-3 h-3" />{isEnglish ? "Admin panel" : "管理面板"}</Link></div></div>
          <div><h4 className="font-bold mb-4 text-secondary">{isEnglish ? "Official resources" : "官方資源"}</h4><div className="flex flex-col gap-2"><a href="https://hackmd.io/@C_MoBbG-Q1CbFG1gDVFrcg/HJeBOxjctGl" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">{isEnglish ? "Regulations directory" : "法規目錄"}</a><a href={isEnglish ? charterUrlEn : charterUrlZh} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">{isEnglish ? "Charter" : "憲章"}</a><Link href="/privacy" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">{isEnglish ? "Privacy policy" : "隱私權政策"}</Link><Link href="/terms" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">{isEnglish ? "Terms of use" : "使用條款"}</Link></div></div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-primary-foreground/10 text-center text-sm text-primary-foreground/60"><p>© {new Date().getFullYear()} FUMO. {isEnglish ? "All rights reserved." : "所有權利保留。"}</p><a href="damcurryrice.com" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 hover:text-secondary transition-colors"></a>蛋包咖哩飯與貓娘秘書長</div>
      </footer>
    </div>
  );
}
