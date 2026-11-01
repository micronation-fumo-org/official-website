import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowDown,
  ArrowUpRight,
  Link2,
  LogIn,
  LogOut,
  Menu,
  Shield,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { googleOAuthStartUrl } from "@/lib/api";
import "./Home.css";

type PageLink = { href: string; zh: string; en: string; external?: boolean };

const mainNav: PageLink[] = [
  { href: "#about", zh: "組織", en: "About" },
  { href: "#pillars", zh: "核心支柱", en: "Pillars" },
  { href: "#organs", zh: "主要機構", en: "Organs" },
  { href: "/members", zh: "會員國", en: "Members" },
  { href: "/charter", zh: "憲章", en: "Charter" },
];

const allPageLinks: PageLink[] = [
  { href: "/members", zh: "會員國", en: "Member states" },
  { href: "/staff", zh: "職位報告", en: "Positions" },
  { href: "/partners", zh: "合作組織", en: "Partner organisations" },
  { href: "/acknowledgements", zh: "致謝名單", en: "Acknowledgements" },
  { href: "/documents/", zh: "文件工作區", en: "Member documents" },
  { href: "/votes", zh: "投票", en: "Voting" },
  { href: "/vote-records", zh: "投票紀錄", en: "Vote records" },
  { href: "/attendance", zh: "出席簽到", en: "Attendance" },
  { href: "/regulations", zh: "法規", en: "Regulations" },
  { href: "/charter", zh: "憲章", en: "Charter" },
  { href: "/login", zh: "登入", en: "Sign in" },
  { href: "/register", zh: "註冊", en: "Register" },
  { href: "/admin", zh: "管理員入口", en: "Admin panel" },
  { href: "/bot-admin", zh: "Discord Bot 後台", en: "Discord Bot admin" },
  { href: "/votes/create", zh: "建立投票", en: "Create a vote" },
  { href: "/privacy", zh: "隱私權政策", en: "Privacy policy" },
  { href: "/terms", zh: "服務條款", en: "Terms of use" },
];

const pillars = [
  { number: "01", zhTitle: "維護和平", enTitle: "Peace", zh: "消弭威脅，防止衝突，維護微國家間的和諧。", en: "Prevent conflict and preserve harmony among micronations." },
  { number: "02", zhTitle: "促進合作", enTitle: "Cooperation", zh: "推動經濟、文化及社會領域的跨國合作。", en: "Advance cooperation across economic, cultural and social affairs." },
  { number: "03", zhTitle: "尊重主權", enTitle: "Sovereignty", zh: "保障各成員國的主權完整與平等地位。", en: "Protect every member's sovereignty and equal standing." },
  { number: "04", zhTitle: "調解爭端", enTitle: "Mediation", zh: "提供中立平台，以和平方式解決國際爭端。", en: "Offer a neutral forum for peaceful dispute resolution." },
];

const organs = [
  {
    number: "01 / DELIBERATION",
    zhTitle: "議事中心",
    enTitle: "Deliberation Center",
    zh: "組織的最高權力與議事機構。成員國代表得提案、表決與發言，共同決定重大方針與決議。",
    en: "The organisation's highest deliberative body, where member-state representatives propose, vote and shape major resolutions.",
    zhPoints: ["一國一票，公開唱名表決", "選舉及罷免秘書長", "處理成員國入聯與升格申請"],
    enPoints: ["One state, one vote by public roll call", "Elect and recall the Secretary-General", "Process membership applications"],
  },
  {
    number: "02 / SECRETARIAT",
    zhTitle: "秘書處",
    enTitle: "Secretariat",
    zh: "由秘書長領導的常設行政機構，負責對外代表組織、維持議事運作並執行決議。",
    en: "The permanent administrative organ led by the Secretary-General, representing FUMO and implementing its decisions.",
    zhPoints: ["維持議事運作與檔案管理", "組織文化及交流活動", "維護組織秩序與憲章執行"],
    enPoints: ["Maintain deliberations and records", "Organise cultural and exchange activities", "Uphold the Charter and organisational order"],
  },
  {
    number: "03 / COUNCIL",
    zhTitle: "理事會",
    enTitle: "Council",
    zh: "維持議事中心的秩序與流程；理事國主持會議，並可於必要時要求召開特別會議。",
    en: "Maintains the order and procedures of the Deliberation Center; council states chair meetings and may call special sessions.",
    zhPoints: ["指派議事中心主席與副主席", "處理突發危機與緊急事務", "協助秘書處執行決議"],
    enPoints: ["Appoint the chair and vice-chairs", "Handle crises and emergencies", "Assist with implementing resolutions"],
  },
];

function LinkLabel({ item, english }: { item: PageLink; english: boolean }) {
  return <>{english ? item.en : item.zh}</>;
}

export default function Home() {
  const { isEnglish, toggleLanguage } = useLanguage();
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const text = (zh: string, en: string) => (isEnglish ? en : zh);
  const closeMenu = () => setMenuOpen(false);
  const connectGoogle = () => window.location.assign(googleOAuthStartUrl("link"));
  const documentsUrl = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/documents/`;

  const footerGroups = [
    { title: text("組織資訊", "Organisation"), links: allPageLinks.slice(0, 5) },
    { title: text("議事與投票", "Deliberation"), links: allPageLinks.slice(5, 10) },
    { title: text("帳戶與其他", "Account & more"), links: allPageLinks.slice(10) },
  ];

  return (
    <div className="fumo-home">
      <header className="fumo-global-nav">
        <div className="fumo-nav-inner">
          <a className="fumo-brand" href="#top" aria-label={text("FUMO 首頁", "FUMO home")}>
            <span className="fumo-brand-mark">FUMO</span>
            <span className="fumo-brand-name">{text("聯合微國家組織", "Federation of United Micronations Organisation")}</span>
          </a>
          <nav className="fumo-nav-links" aria-label={text("主要導覽", "Main navigation")}>
            {mainNav.map((item) => item.href.startsWith("#") ? (
              <a key={item.href} href={item.href}><LinkLabel item={item} english={isEnglish} /></a>
            ) : (
              <Link key={item.href} href={item.href}><LinkLabel item={item} english={isEnglish} /></Link>
            ))}
          </nav>
          <div className="fumo-nav-actions">
            <button className="fumo-language-button" id="language-toggle" type="button" onClick={toggleLanguage} aria-label={text("切換至英文", "Switch to Traditional Chinese")}>
              {isEnglish ? "繁中" : "EN"}
            </button>
            {user ? (
              <div className="fumo-account-actions">
                {isAdmin && <Link className="fumo-account-link" href="/admin" aria-label={text("管理員入口", "Admin panel")}><Shield size={14} />{text("管理", "Admin")}</Link>}
                <span className="fumo-user-name">{user.voterName}</span>
                <button className="fumo-account-link" type="button" onClick={connectGoogle} aria-label={text("連接 Google", "Connect Google")}><Link2 size={14} />{text("連接 Google", "Connect Google")}</button>
                <button className="fumo-account-link" type="button" onClick={logout}><LogOut size={14} />{text("登出", "Sign out")}</button>
              </div>
            ) : (
              <div className="fumo-account-actions">
                <Link className="fumo-account-link" href="/login"><LogIn size={14} />{text("登入", "Sign in")}</Link>
                <Link className="fumo-register-link" href="/register"><UserPlus size={14} />{text("註冊", "Register")}</Link>
              </div>
            )}
            <button className="fumo-menu-button" id="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? text("關閉選單", "Close menu") : text("開啟選單", "Open menu")} aria-expanded={menuOpen} aria-controls="fumo-mobile-menu">
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>
        <nav className={`fumo-mobile-menu${menuOpen ? " open" : ""}`} id="fumo-mobile-menu" aria-label={text("行動版導覽", "Mobile navigation")}>
          <div className="fumo-mobile-anchor-links">
            {mainNav.slice(0, 3).map((item) => <a key={item.href} href={item.href} onClick={closeMenu}><LinkLabel item={item} english={isEnglish} /></a>)}
          </div>
          {user && (
            <div className="fumo-mobile-account">
              {isAdmin && <Link href="/admin" onClick={closeMenu}><Shield size={14} />{text("管理員入口", "Admin panel")}</Link>}
              <button type="button" onClick={() => { closeMenu(); connectGoogle(); }}><Link2 size={14} />{text("連接 Google", "Connect Google")}</button>
              <button type="button" onClick={() => { closeMenu(); logout(); }}><LogOut size={14} />{text("登出", "Sign out")}</button>
            </div>
          )}
          {allPageLinks.map((item) => item.href === "/documents/" ? (
            <a key={item.href} href={documentsUrl} onClick={closeMenu}><LinkLabel item={item} english={isEnglish} /></a>
          ) : (
            <Link key={item.href} href={item.href} onClick={closeMenu}><LinkLabel item={item} english={isEnglish} /></Link>
          ))}
          <a href="https://discord.com/invite/MuSM3yXrQh" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>{text("加入 Discord", "Join Discord")}</a>
        </nav>
      </header>

      <main id="top">
        <section className="fumo-hero">
          <div className="fumo-wrap fumo-hero-grid">
            <div className="fumo-hero-copy">
              <p className="fumo-eyebrow">{text("FEDERATION OF UNITED MICRONATIONS ORGANISATION", "A PEACEFUL FORUM FOR MICRONATIONS")}</p>
              <h1>{text("聯合微國家組織", "Federation of United Micronations Organisation")}</h1>
              <p className="fumo-hero-tagline">{text("眾志成城，攜手共進", "United in determination, advancing together")}</p>
              <p className="fumo-hero-description">{text("一個為微國家建立的和平對話平台，讓多元的主權實體在平等中合作、交流與共創未來。", "A peaceful forum for micronations to meet as equals, exchange ideas and build a future through cooperation.")}</p>
              <div className="fumo-hero-links">
                <a className="fumo-text-link fumo-down-link" href="#about">{text("認識 FUMO", "Discover FUMO")}<ArrowDown size={14} aria-hidden="true" /></a>
                <Link className="fumo-text-link" href="/members">{text("瀏覽會員國", "Explore member states")}<ArrowUpRight size={14} aria-hidden="true" /></Link>
                <Link className="fumo-text-link" href="/charter">{text("閱讀憲章", "Read the Charter")}<ArrowUpRight size={14} aria-hidden="true" /></Link>
                <a className="fumo-text-link" href="https://discord.com/invite/MuSM3yXrQh" target="_blank" rel="noopener noreferrer">{text("加入 Discord", "Join Discord")}<ArrowUpRight size={14} aria-hidden="true" /></a>
              </div>
            </div>
            <aside className="fumo-hero-aside" aria-label={text("組織規模", "Organisation at a glance")}>
              <p className="fumo-hero-stat">{text("近百", "~100")}</p>
              <p className="fumo-stat-caption">{text("個成員國與觀察國，涵蓋多元政治體制與文化背景。", "member and observer states, representing diverse systems and cultures.")}</p>
              <div className="fumo-stat-rule" />
            </aside>
          </div>
        </section>

        <section className="fumo-section" id="about">
          <div className="fumo-wrap">
            <div className="fumo-section-head">
              <p className="fumo-section-index"><span>01</span><span>{text("關於組織", "ABOUT FUMO")}</span></p>
              <h2>{text("平等對話，促成合作。", "Equal dialogue. Stronger cooperation.")}</h2>
              <p className="fumo-section-intro">{text("聯合微國家組織（FUMO）致力於維護微國家間的和平、促進合作與交流。我們提供公正、客觀的平台，讓各個主權實體平等對話、調解爭端，並共同推動社群的繁榮與穩定。", "The Federation of United Micronations Organisation (FUMO) is dedicated to peace, cooperation and exchange among micronations. We provide a fair forum for sovereign entities to engage in dialogue, mediate disputes and build a stable, thriving community.")}</p>
            </div>
            <div className="fumo-about-grid">
              <div className="fumo-about-copy">
                <p className="fumo-about-label">{text("創立初衷", "Why we were founded")}</p>
                <p>{text("FUMO 為微國家建立一個公平、和平且具建設性的對話空間。透過尊重每個參與實體的平等地位，組織希望減少誤解、調解爭端，並將多元的微國家社群連結成持久合作的網絡。", "FUMO was founded to give micronations a fair, peaceful and constructive space for dialogue. By recognising the equal standing of every participant, we seek to reduce misunderstanding, mediate disputes and connect a diverse community through lasting cooperation.")}</p>
                <a className="fumo-text-link" href="https://www.micropedia.site/wiki/聯合微國家組織" target="_blank" rel="noopener noreferrer">{text("在 Micropedia 閱讀組織介紹", "Read the organisation profile on Micropedia")}<ArrowUpRight size={14} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
        </section>

        <section className="fumo-section fumo-section-soft" id="pillars">
          <div className="fumo-wrap">
            <div className="fumo-section-head">
              <p className="fumo-section-index"><span>02</span><span>{text("核心支柱", "CORE PILLARS")}</span></p>
              <h2>{text("以四項原則，守護共同的未來。", "Four principles. A shared future.")}</h2>
              <p className="fumo-section-intro">{text("在尊重差異的前提下，建立互信、穩定且持久的國際合作。", "Building trust and enduring cooperation while respecting our differences.")}</p>
            </div>
            <div className="fumo-pillar-grid">
              {pillars.map((pillar) => (
                <article className="fumo-pillar" key={pillar.number}>
                  <p className="fumo-pillar-number">{pillar.number}</p>
                  <h3>{text(pillar.zhTitle, pillar.enTitle)}</h3>
                  <p>{text(pillar.zh, pillar.en)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="fumo-section" id="organs">
          <div className="fumo-wrap">
            <div className="fumo-section-head">
              <p className="fumo-section-index"><span>03</span><span>{text("主要機構", "MAIN ORGANS")}</span></p>
              <h2>{text("共同議事，穩健運作。", "Deliberate together. Work with purpose.")}</h2>
              <p className="fumo-section-intro">{text("依據《聯合微國家組織憲章》，三大常設機構共同支持日常運作與決策。", "Under the FUMO Charter, three permanent organs support daily operations and decision-making.")}</p>
            </div>
            <div className="fumo-organ-grid">
              {organs.map((organ) => (
                <article className="fumo-organ" key={organ.number}>
                  <p className="fumo-organ-number">{organ.number}</p>
                  <h3>{text(organ.zhTitle, organ.enTitle)}</h3>
                  <p className="fumo-organ-english-name">{organ.enTitle}</p>
                  <p className="fumo-organ-description">{text(organ.zh, organ.en)}</p>
                  <ul>{(isEnglish ? organ.enPoints : organ.zhPoints).map((point) => <li key={point}>{point}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="fumo-join">
          <div className="fumo-wrap fumo-join-grid">
            <p className="fumo-section-index"><span>04</span><span>{text("加入社群", "JOIN THE COMMUNITY")}</span></p>
            <div>
              <h2>{text("讓更多聲音，參與共同對話。", "Every voice belongs in the conversation.")}</h2>
              <p>{text("無論是成熟的微國家還是新興的主權實體，FUMO 都歡迎您加入這個多元、包容的國際社群。", "Whether you represent an established micronation or a new sovereign entity, FUMO welcomes you to a diverse and inclusive international community.")}</p>
              <div className="fumo-hero-links">
                <Link className="fumo-text-link" href="/regulations">{text("查閱入聯法規", "Review membership regulations")}<ArrowUpRight size={14} aria-hidden="true" /></Link>
                <Link className="fumo-text-link" href="/register">{text("開始申請", "Begin an application")}<ArrowUpRight size={14} aria-hidden="true" /></Link>
                <a className="fumo-text-link" href="https://discord.com/invite/MuSM3yXrQh" target="_blank" rel="noopener noreferrer">{text("加入 Discord", "Join the FUMO Discord")}<ArrowUpRight size={14} aria-hidden="true" /></a>
                <a className="fumo-text-link" href="https://www.instagram.com/mn_fumo" target="_blank" rel="noopener noreferrer">Instagram<ArrowUpRight size={14} aria-hidden="true" /></a>
                <a className="fumo-text-link" href="https://www.threads.com/@mn_fumo" target="_blank" rel="noopener noreferrer">Threads<ArrowUpRight size={14} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="fumo-site-footer">
        <div className="fumo-wrap">
          <div className="fumo-footer-top">
            <div>
              <a className="fumo-footer-brand" href="#top">FUMO</a>
              <p className="fumo-footer-tagline">{text("眾志成城，攜手共進", "United in determination, advancing together")}</p>
            </div>
            <div className="fumo-footer-groups">
              {footerGroups.map((group) => (
                <div className="fumo-footer-group" key={group.title}>
                  <h3>{group.title}</h3>
                  {group.links.map((item) => item.href === "/documents/" ? (
                    <a key={item.href} href={documentsUrl}><LinkLabel item={item} english={isEnglish} /></a>
                  ) : (
                    <Link key={item.href} href={item.href}><LinkLabel item={item} english={isEnglish} /></Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="fumo-footer-bottom">
            <span className="fumo-copyright">© FUMO · Federation of United Micronations Organisation</span>
            <a href="https://www.micronationfumo.org/" target="_blank" rel="noopener noreferrer">micronationfumo.org</a>
            <a className="fumo-credit" href="https://damcurryrice.com" target="_blank" rel="noopener noreferrer"><Link2 size={13} aria-hidden="true" />{text("FUMO × 蛋包咖哩飯", "FUMO × Dam Curry Rice")}</a>
            {isAdmin && <Link className="fumo-admin-link" href="/bot-admin"><Shield size={13} aria-hidden="true" />{text("Discord Bot 後台", "Discord Bot admin")}</Link>}
            <p className="fumo-footer-disclaimer">{text("和平交流，合作共創。", "Peace, dialogue and cooperation.")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
