import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Shield, LogIn, UserPlus, LogOut, User, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface LayoutProps { children: ReactNode; }

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { language, setLanguage, isEnglish } = useLanguage();

  const navLinks = isEnglish
    ? [
        { href: "/", label: "Home" },
        { href: "/members", label: "Member States" },
        { href: "/staff", label: "Positions" },
        { href: "/votes", label: "Voting" },
        { href: "/regulations", label: "Regulations" },
        { href: "/charter", label: "Charter" },
      ]
    : [
        { href: "/", label: "首頁" },
        { href: "/members", label: "會員國" },
        { href: "/staff", label: "職位報告" },
        { href: "/votes", label: "投票" },
        { href: "/regulations", label: "法規" },
        { href: "/charter", label: "憲章" },
      ];

  const adminLevelLabel = (level: number) => {
    if (level >= 9) return isEnglish ? "Super Admin" : "最高管理員";
    if (level >= 2) return isEnglish ? "Tier 2 Admin" : "二階管理員";
    if (level >= 1) return isEnglish ? "Tier 1 Admin" : "一階管理員";
    return "";
  };

  const switchLanguage = () => setLanguage(language === "zh" ? "en" : "zh");
  const closeMenu = () => setIsMobileMenuOpen(false);

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

          <nav className="hidden lg:flex items-center gap-5 flex-1 justify-center" aria-label={isEnglish ? "Main navigation" : "主要導覽"}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`text-sm font-medium transition-colors hover:text-secondary ${location === link.href ? "text-secondary font-bold" : "text-foreground/80"}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={switchLanguage} aria-label={isEnglish ? "Switch to Traditional Chinese" : "Switch to English"} className="gap-1.5">
              <Languages className="w-4 h-4" /> {isEnglish ? "繁中" : "EN"}
            </Button>
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && <Link href="/admin"><Button variant="ghost" size="sm" className="text-secondary text-xs gap-1"><Shield className="w-3 h-3" />{adminLevelLabel(user.adminLevel)}</Button></Link>}
                <span className="text-sm text-foreground/70 font-medium max-w-[120px] truncate">{user.voterName}</span>
                <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground"><LogOut className="w-4 h-4 mr-1" />{isEnglish ? "Sign out" : "登出"}</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login"><Button variant="ghost" size="sm" className="text-foreground/80"><LogIn className="w-4 h-4 mr-1" />{isEnglish ? "Sign in" : "登入"}</Button></Link>
                <Link href="/register"><Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"><UserPlus className="w-4 h-4 mr-1" />{isEnglish ? "Register" : "註冊"}</Button></Link>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label={isEnglish ? "Open menu" : "開啟選單"}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background py-4 px-4 flex flex-col gap-3 shadow-lg absolute w-full">
            {navLinks.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu} className={`text-sm font-medium py-2 transition-colors hover:text-secondary ${location === link.href ? "text-secondary font-bold" : "text-foreground/80"}`}>{link.label}</Link>)}
            <Button variant="outline" size="sm" onClick={() => { switchLanguage(); closeMenu(); }} className="justify-start gap-2"><Languages className="w-4 h-4" />{isEnglish ? "繁體中文" : "English"}</Button>
            <div className="border-t border-border pt-3 flex flex-col gap-2">
              {user ? <>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground"><User className="w-4 h-4" />{user.voterName}{isAdmin && <span className="text-xs text-secondary ml-1">({adminLevelLabel(user.adminLevel)})</span>}</div>
                {isAdmin && <Link href="/admin" onClick={closeMenu} className="text-sm text-secondary font-medium flex items-center gap-1"><Shield className="w-4 h-4" />{isEnglish ? "Admin panel" : "管理面板"}</Link>}
                <Button variant="ghost" size="sm" onClick={() => { logout(); closeMenu(); }} className="justify-start text-muted-foreground w-fit"><LogOut className="w-4 h-4 mr-1" />{isEnglish ? "Sign out" : "登出"}</Button>
              </> : <>
                <Link href="/login" onClick={closeMenu}><Button variant="ghost" size="sm" className="text-foreground/80 justify-start w-full"><LogIn className="w-4 h-4 mr-1" />{isEnglish ? "Sign in" : "登入"}</Button></Link>
                <Link href="/register" onClick={closeMenu}><Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 justify-start w-full"><UserPlus className="w-4 h-4 mr-1" />{isEnglish ? "Register" : "註冊"}</Button></Link>
              </>}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="bg-primary text-primary-foreground border-t border-primary/20 py-12 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div><div className="flex items-center gap-3 mb-4"><img src="/fumo-flag.png" alt="FUMO Flag" className="h-8 w-8 object-contain" /><h3 className="font-bold text-lg">Federation of United Micronations Organisation</h3></div><p className="text-primary-foreground/70 text-sm max-w-xs">{isEnglish ? "United in determination, advancing together." : "眾志成城，攜手共進。"}</p></div>
          <div><h4 className="font-bold mb-4 text-secondary">{isEnglish ? "Quick links" : "快速連結"}</h4><div className="flex flex-col gap-2">{navLinks.map((link) => <Link key={link.href} href={link.href} className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">{link.label}</Link>)}<Link href="/admin" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit flex items-center gap-1"><Shield className="w-3 h-3" />{isEnglish ? "Admin panel" : "管理面板"}</Link></div></div>
          <div><h4 className="font-bold mb-4 text-secondary">{isEnglish ? "Official resources" : "官方資源"}</h4><div className="flex flex-col gap-2"><a href="https://hackmd.io/@C_MoBbG-Q1CbFG1gDVFrcg/HJeBOxjctGl" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">{isEnglish ? "Regulations directory" : "法規目錄"}</a><a href="https://hackmd.io/hXuHNG-nSMKFX-9Psp1uug" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">{isEnglish ? "Charter" : "憲章"}</a><Link href="/privacy" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">{isEnglish ? "Privacy policy" : "隱私權政策"}</Link><Link href="/terms" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">{isEnglish ? "Terms of use" : "使用條款"}</Link></div></div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-primary-foreground/10 text-center text-sm text-primary-foreground/60"><p>© {new Date().getFullYear()} FUMO. {isEnglish ? "All rights reserved." : "所有權利保留。"}</p><a href="damcurryrice.com" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 hover:text-secondary transition-colors"></a>蛋包咖哩飯與貓娘秘書長</div>
      </footer>
    </div>
  );
}
