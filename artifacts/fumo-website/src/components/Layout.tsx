import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Shield, LogIn, UserPlus, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
}

function AdminPromotionForm() {
  const [voterId, setVoterId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!voterId.trim() || !code.trim()) {
      setError("請輸入 Discord ID 和驗證碼");
      return;
    }
    try {
      const res = await fetch("/api/admin/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: voterId.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提升失敗");
      setSuccess(data.message || "帳戶已提升為管理員");
      setVoterId("");
      setCode("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="container mx-auto px-4 mt-6">
      <div className="border-t border-primary-foreground/20 pt-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm text-primary-foreground/60 hover:text-primary-foreground/80 transition-colors"
        >
          <Shield className="w-3 h-3" />
          {isOpen ? "收起管理員驗證模式 ▲" : "管理員驗證碼提升管理員 ▼"}
        </button>
        {isOpen && (
          <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl">
            <Input
              value={voterId}
              onChange={(e) => setVoterId(e.target.value)}
              placeholder="Discord ID"
              className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
            />
            <Input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="驗證碼 Verification Code"
              className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
            />
            <Button
              type="submit"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Shield className="w-4 h-4 mr-1" />
              提升管理員 Promote
            </Button>
            {error && <p className="text-sm text-red-300 col-span-full">{error}</p>}
            {success && <p className="text-sm text-green-300 col-span-full">{success}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();

  const navLinks = [
    { href: "/", label: "首頁 Home" },
    { href: "/members", label: "成員國 Members" },
    { href: "/votes", label: "投票 Voting" },
    { href: "/regulations", label: "法規 Regulations" },
    { href: "/charter", label: "憲章 Charter" },
  ];

  const adminLevelLabel = (level: number) => {
    if (level >= 9) return "最高管理員";
    if (level >= 2) return "二階管理員";
    if (level >= 1) return "一階管理員";
    return "";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90 shrink-0">
            <img src="/fumo-flag.png" alt="FUMO Flag" className="h-10 w-10 object-contain shadow-sm border border-border/50 bg-white" />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight tracking-wide text-primary">聯微 FUMO</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-secondary ${
                  location === link.href ? "text-secondary font-bold" : "text-foreground/80"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth area */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="text-secondary text-xs gap-1">
                      <Shield className="w-3 h-3" />
                      {adminLevelLabel(user.adminLevel)}
                    </Button>
                  </Link>
                )}
                <span className="text-sm text-foreground/70 font-medium max-w-[120px] truncate">
                  {user.voterName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  登出
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-foreground/80">
                    <LogIn className="w-4 h-4 mr-1" />
                    登入 Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <UserPlus className="w-4 h-4 mr-1" />
                    註冊 Register
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background py-4 px-4 flex flex-col gap-3 shadow-lg absolute w-full">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-medium py-2 transition-colors hover:text-secondary ${
                  location === link.href ? "text-secondary font-bold" : "text-foreground/80"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-border pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <User className="w-4 h-4" />
                    {user.voterName}
                    {isAdmin && <span className="text-xs text-secondary ml-1">({adminLevelLabel(user.adminLevel)})</span>}
                  </div>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-secondary font-medium flex items-center gap-1">
                      <Shield className="w-4 h-4" /> 管理面板 Admin
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="justify-start text-muted-foreground w-fit">
                    <LogOut className="w-4 h-4 mr-1" /> 登出 Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="text-foreground/80 justify-start w-full">
                      <LogIn className="w-4 h-4 mr-1" /> 登入 Login
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 justify-start w-full">
                      <UserPlus className="w-4 h-4 mr-1" /> 註冊 Register
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full">
        {children}
      </main>

      <footer className="bg-primary text-primary-foreground border-t border-primary/20 py-12 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/fumo-flag.png" alt="FUMO Flag" className="h-8 w-8 object-contain" />
              <h3 className="font-bold text-lg">聯合微國家組織<br/><span className="text-sm font-normal text-primary-foreground/80">Federation of United Micronations Organisation</span></h3>
            </div>
            <p className="text-primary-foreground/70 text-sm max-w-xs">
              維護和平，促進合作 (Maintaining Peace, Promoting Cooperation).
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-secondary">快速連結 Quick Links</h4>
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">
                  {link.label}
                </Link>
              ))}
              <Link href="/admin" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit flex items-center gap-1">
                <Shield className="w-3 h-3" /> 管理面板 Admin
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-secondary">官方資源 Resources</h4>
            <div className="flex flex-col gap-2">
              <a href="https://hackmd.io/@Linxian3301/rJaDkwWsbl" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">
                法規目錄 Regulations Directory
              </a>
              <a href="https://hackmd.io/hXuHNG-nSMKFX-9Psp1uug" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors w-fit">
                憲章 Charter
              </a>
            </div>
          </div>
        </div>

        <AdminPromotionForm />

        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-primary-foreground/10 text-center text-sm text-primary-foreground/60">
          <p>© {new Date().getFullYear()} Federation of United Micronations Organisation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
