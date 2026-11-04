import { Link } from "wouter";
import { Link2, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { charterUrlEn, charterUrlZh } from "@/data/regulations";

interface FooterLink {
  href: string;
  label: string;
}

export function SiteFooter() {
  const { isEnglish } = useLanguage();
  const { isAdmin } = useAuth();
  const documentsUrl = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/documents/`;
  const footerGroups: { title: string; links: FooterLink[] }[] = [
    {
      title: isEnglish ? "Main pages" : "主要頁面",
      links: [
        { href: "/", label: isEnglish ? "Home" : "首頁" },
        { href: "/members", label: isEnglish ? "Member States" : "會員國" },
        { href: "/staff", label: isEnglish ? "Positions" : "職位報告" },
        { href: "/partners", label: isEnglish ? "Partner Organizations" : "合作組織" },
        { href: "/acknowledgements", label: isEnglish ? "Acknowledgements" : "致謝名單" },
        { href: "/documents", label: isEnglish ? "Member documents" : "文件工作區" },
      ],
    },
    {
      title: isEnglish ? "Deliberation" : "議事與投票",
      links: [
        { href: "/votes", label: isEnglish ? "Voting" : "投票" },
        { href: "/vote-records", label: isEnglish ? "Vote records" : "投票紀錄" },
        { href: "/attendance", label: isEnglish ? "Attendance" : "出席簽到" },
        { href: "/votes/create", label: isEnglish ? "Create a vote" : "建立投票" },
      ],
    },
    {
      title: isEnglish ? "Policy & account" : "政策與帳戶",
      links: [
        { href: "/regulations", label: isEnglish ? "Regulations" : "法規" },
        { href: "/charter", label: isEnglish ? "Charter" : "憲章" },
        { href: "/privacy", label: isEnglish ? "Privacy policy" : "隱私權政策" },
        { href: "/terms", label: isEnglish ? "Terms of use" : "使用條款" },
        { href: "/login", label: isEnglish ? "Sign in" : "登入" },
        { href: "/register", label: isEnglish ? "Register" : "註冊" },
        { href: "/admin", label: isEnglish ? "Admin panel" : "管理面板" },
      ],
    },
  ];

  return (
    <footer className="fumo-shell-footer">
      <div className="fumo-shell-footer-inner">
        <div className="fumo-shell-footer-top">
          <div className="fumo-shell-footer-brand-block">
            <Link href="/" className="fumo-shell-footer-brand-mark" aria-label="FUMO home">FUMO</Link>
            <h3>{isEnglish ? "Federation of United Micronations Organisation" : "聯合微國家組織"}</h3>
            <p>{isEnglish ? "United in determination, advancing together." : "眾志成城，攜手共進。"}</p>
          </div>
          <div className="fumo-shell-footer-navigation">
            <h4>{isEnglish ? "Site navigation" : "網站導覽"}</h4>
            <div className="fumo-shell-footer-groups">
              {footerGroups.map((group) => (
                <div key={group.title}>
                  <h5>{group.title}</h5>
                  <div className="fumo-shell-footer-links">
                    {group.links.map((link) => link.href === "/documents" ? (
                      <a key={link.href} href={documentsUrl}>{link.label}</a>
                    ) : (
                      <Link key={link.href} href={link.href}>{link.label}</Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="fumo-shell-footer-resources">
            <h4>{isEnglish ? "Official resources" : "官方資源"}</h4>
            <div className="fumo-shell-footer-links">
              <a href="https://hackmd.io/@C_MoBbG-Q1CbFG1gDVFrcg/HJeBOxjctGl" target="_blank" rel="noopener noreferrer">{isEnglish ? "Regulations directory" : "法規目錄"}</a>
              <a href={isEnglish ? charterUrlEn : charterUrlZh} target="_blank" rel="noopener noreferrer">{isEnglish ? "Charter" : "憲章"}</a>
              <a href="https://discord.com/invite/MuSM3yXrQh" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
            <h4 className="fumo-shell-footer-social-title">{isEnglish ? "Social" : "社群"}</h4>
            <div className="fumo-shell-footer-links">
              <a href="https://www.instagram.com/mn_fumo" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://www.threads.com/@mn_fumo" target="_blank" rel="noopener noreferrer">Threads</a>
            </div>
          </div>
        </div>
        <div className="fumo-shell-footer-bottom">
          <div className="fumo-shell-footer-bottom-meta">
            <span>© {new Date().getFullYear()} FUMO · {isEnglish ? "All rights reserved." : "所有權利保留。"}</span>
            <a href="https://www.micronationfumo.org/" target="_blank" rel="noopener noreferrer">micronationfumo.org</a>
            <a href="https://damcurryrice.com" target="_blank" rel="noopener noreferrer"><Link2 aria-hidden="true" />{isEnglish ? "Website by FUMO & Dam Curry Rice" : "FUMO × 蛋包咖哩飯"}</a>
            {isAdmin && <Link href="/bot-admin"><Shield aria-hidden="true" />{isEnglish ? "Discord Bot admin" : "Discord Bot 後台"}</Link>}
          </div>
          <p>{isEnglish ? "Peace, dialogue and cooperation." : "和平交流，合作共創。"}</p>
        </div>
      </div>
    </footer>
  );
}
