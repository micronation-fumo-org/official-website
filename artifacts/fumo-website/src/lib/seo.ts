export interface SeoMetadata {
  title: string;
  description: string;
  path: string;
  language?: "zh-Hant" | "en";
  robots?: string;
  keywords?: string;
  type?: "website" | "article";
}

export const SITE_ORIGIN = "https://www.micronationfumo.org";
const SITE_NAME = "聯合微國家組織 F.U.M.O.";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/opengraph.jpg`;

const routeMetadata: Record<string, { zh: Omit<SeoMetadata, "path">; en: Omit<SeoMetadata, "path"> }> = {
  "/": {
    zh: {
      title: "聯合微國家組織 F.U.M.O.｜會員國交流、組織治理與國際合作",
      description: "聯合微國家組織（F.U.M.O.）是以微國家交流、國際合作與和平治理為宗旨的組織。瀏覽會員國與觀察國名錄、組織憲章、法規、職位報告及公開投票資訊。",
      keywords: "聯合微國家組織,FUMO,微國家,國際組織,微國家外交,會員國合作",
    },
    en: {
      title: "FUMO｜Federation of United Micronations Organisation Official Website",
      description: "Explore the Federation of United Micronations Organisation (FUMO), its member and observer states, charter, regulations, public offices, and voting information.",
      keywords: "FUMO,micronations,international organization,member states,micronational diplomacy",
    },
  },
  "/members": {
    zh: {
      title: "FUMO 聯合微國家組織會員國與觀察國名錄｜成員國資訊",
      description: "瀏覽聯合微國家組織（FUMO）公開會員國與觀察國名錄，了解各成員的正式名稱、國家簡稱、國家體制與組織成員身分，認識以外交與合作為核心的微國家社群。",
      keywords: "FUMO會員國,觀察國,微國家名錄,成員國資訊,微國家外交",
    },
    en: {
      title: "FUMO Member and Observer States｜Official State Directory",
      description: "Browse FUMO's public directory of member and observer states, including official names, short names, and government types.",
      keywords: "FUMO member states,observer states,micronation directory,state membership",
    },
  },
  "/staff": {
    zh: {
      title: "FUMO 秘書處與議事中心現任職位名錄｜聯合微國家組織",
      description: "查看聯合微國家組織 FUMO 秘書處與議事中心目前公開職位、職稱與職責分工。名錄只展示公開職務資訊，不公開私人帳號識別碼。",
      keywords: "FUMO秘書處,議事中心,組織職位,微國家職務名錄,秘書處成員",
    },
    en: {
      title: "FUMO Secretariat and Deliberation Center｜Public Office Directory",
      description: "See the public office directory for FUMO's Secretariat and Deliberation Center, including titles and areas of responsibility.",
      keywords: "FUMO Secretariat,Deliberation Center,public offices,organization directory",
    },
  },
  "/partners": {
    zh: {
      title: "FUMO 合作組織名錄｜聯合微國家組織合作夥伴",
      description: "瀏覽與聯合微國家組織 FUMO 建立合作關係的組織及合作日期，名錄唯讀同步自官方 Google 試算表。",
      keywords: "FUMO合作組織,合作夥伴,微國家組織合作,國際合作名錄",
    },
    en: {
      title: "FUMO Partner Organizations｜Official Cooperation Directory",
      description: "Browse organizations that have established cooperation with FUMO and their cooperation dates, read-only synchronized from the official Google Sheet.",
      keywords: "FUMO partners,partner organizations,international cooperation,micronation partnerships",
    },
  },
  "/regulations": {
    zh: {
      title: "FUMO 組織法規及成員國規範｜聯合微國家組織法規目錄",
      description: "查閱聯合微國家組織的憲章、成員資格、組織治理、選舉程序與秩序管理等公開法規，並前往官方文件來源閱讀完整條文。",
      keywords: "FUMO法規,組織憲章,成員國規範,議事規則,微國家治理",
    },
    en: {
      title: "FUMO Regulations and Member State Rules｜Official Document Directory",
      description: "Find FUMO's public charter, membership rules, governance documents, election procedures, and organizational regulations.",
      keywords: "FUMO regulations,charter,membership rules,governance,procedures",
    },
  },
  "/charter": {
    zh: {
      title: "聯合微國家組織憲章第七版｜FUMO 宗旨、架構與權利義務",
      description: "閱讀聯合微國家組織（FUMO）憲章第七版，了解組織宗旨與原則、會員國及觀察國、議事中心、秘書處、理事國，以及憲章修正規定。",
      keywords: "FUMO憲章,聯合微國家組織憲章,第七版,組織宗旨,會員國權利義務",
    },
    en: {
      title: "FUMO Charter Version 7｜Purpose, Governance and Membership",
      description: "Read the seventh edition of the FUMO Charter, covering organizational principles, membership, the Deliberation Center, Secretariat, Council, and amendments.",
      keywords: "FUMO Charter,governance,membership,micronations,organization principles",
    },
  },
  "/votes": {
    zh: {
      title: "FUMO 組織正式投票與決議｜聯合微國家組織投票公告",
      description: "瀏覽聯合微國家組織 FUMO 公開投票、議案狀態、投票期限與彙總結果。投票者須登入並確認帳戶密碼；公開頁面不會顯示進行中投票的個人選擇。",
      keywords: "FUMO投票,組織決議,微國家投票,公開議案,投票結果",
    },
    en: {
      title: "FUMO Public Votes and Resolutions｜Organization Voting Notices",
      description: "View FUMO public votes, proposal status, deadlines, and aggregate results. Individual choices are not shown while a vote is open.",
      keywords: "FUMO votes,resolutions,micronation voting,public proposals,aggregate results",
    },
  },
  "/vote-records": {
    zh: {
      title: "FUMO 歷史投票紀錄｜標準與特殊議案表決結果",
      description: "瀏覽聯合微國家組織 FUMO 標準與特殊議案的歷史投票紀錄，可搜尋議案、代號、例會、國家與選項。資料唯讀取自官方公開試算表。",
      keywords: "FUMO投票紀錄,歷史投票,標準議案,特殊議案,議案表決,國家投票",
    },
    en: {
      title: "FUMO Historical Voting Records｜Standard and Special Proposals",
      description: "Browse and search FUMO historical standard and special proposal votes by proposal, ID, meeting, country, or choice. Read-only data from official public spreadsheets.",
      keywords: "FUMO voting records,historical votes,standard proposals,special proposals,resolutions",
    },
  },
  "/attendance": {
    zh: {
      title: "出席簽到｜FUMO 聯合微國家組織",
      description: "管理並查看聯合微國家組織 FUMO 的獨立出席場次，成員國與觀察國可分組簽到。",
      robots: "noindex, nofollow",
    },
    en: {
      title: "Attendance｜FUMO Federation of United Micronations Organisation",
      description: "Manage and view FUMO attendance sessions, with separate check-in lists for member and observer states.",
      robots: "noindex, nofollow",
    },
  },
  "/privacy": {
    zh: {
      title: "隱私權政策｜聯合微國家組織 FUMO 官方網站資料使用說明",
      description: "閱讀 FUMO 官方網站的隱私權政策，了解帳戶、登入及投票資料如何用於網站服務與組織作業。",
      keywords: "FUMO隱私權政策,資料使用,帳戶隱私,網站資料保護",
    },
    en: {
      title: "Privacy Policy｜FUMO Official Website Data Practices",
      description: "Learn how the FUMO official website handles account, sign-in, and voting data to provide its services.",
      keywords: "FUMO privacy policy,data practices,account privacy",
    },
  },
  "/terms": {
    zh: {
      title: "使用條款｜聯合微國家組織 FUMO 官方網站服務規範",
      description: "查看使用聯合微國家組織 FUMO 官方網站、帳戶功能及公開投票服務時應遵守的使用條款。",
      keywords: "FUMO使用條款,網站規範,投票服務,帳戶服務",
    },
    en: {
      title: "Terms of Use｜FUMO Official Website Service Rules",
      description: "Review the terms governing use of the FUMO official website, account features, and public voting services.",
      keywords: "FUMO terms of use,website terms,voting service,account service",
    },
  },
};

export function getRouteSeo(path: string, isEnglish = false): SeoMetadata {
  const normalized = path.replace(/\/$/, "") || "/";
  const language = isEnglish ? "en" : "zh-Hant";
  const fixed = routeMetadata[normalized];
  if (fixed) return { ...fixed[isEnglish ? "en" : "zh"], path: normalized, language };
  if (normalized === "/admin" || normalized === "/login" || normalized === "/register" || normalized === "/votes/create") {
    return {
      title: isEnglish ? `Account service｜${SITE_NAME}` : `帳戶服務｜${SITE_NAME}`,
      description: isEnglish ? "Sign-in and account administration." : "登入與帳戶管理頁面。",
      path: normalized,
      language,
      robots: "noindex, nofollow",
    };
  }
  if (/^\/votes\/\d+$/.test(normalized)) {
    return {
      title: isEnglish ? `Public vote｜${SITE_NAME}` : `公開投票｜${SITE_NAME}`,
      description: isEnglish ? "View the public proposal, options, deadline, and aggregate result." : "查看公開議案、投票選項、截止時間與彙總結果。",
      path: normalized,
      language,
      keywords: "FUMO投票,公開議案,投票結果,微國家組織",
      type: "article",
    };
  }
  return {
    title: isEnglish ? `Page not found｜${SITE_NAME}` : `找不到頁面｜${SITE_NAME}`,
    description: isEnglish ? "The requested page is not available." : "找不到所要求的頁面。",
    path: normalized,
    language,
    robots: "noindex, nofollow",
  };
}

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

export function applySeoMetadata(metadata: SeoMetadata) {
  if (typeof document === "undefined") return;
  const canonicalUrl = `${SITE_ORIGIN}${metadata.path}`;
  document.documentElement.lang = metadata.language ?? "zh-Hant";
  document.title = metadata.title;
  upsertMeta("name", "description", metadata.description);
  upsertMeta("name", "robots", metadata.robots ?? "index, follow");
  if (metadata.keywords) upsertMeta("name", "keywords", metadata.keywords);
  upsertMeta("property", "og:title", metadata.title);
  upsertMeta("property", "og:description", metadata.description);
  upsertMeta("property", "og:type", metadata.type ?? "website");
  upsertMeta("property", "og:url", canonicalUrl);
  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:locale", document.documentElement.lang === "en" ? "en_US" : "zh_TW");
  upsertMeta("property", "og:image", DEFAULT_IMAGE);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", metadata.title);
  upsertMeta("name", "twitter:description", metadata.description);
  upsertMeta("name", "twitter:image", DEFAULT_IMAGE);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = canonicalUrl;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: "聯合微國家組織",
        alternateName: ["F.U.M.O.", "Federation of United Micronations Organisation"],
        url: SITE_ORIGIN,
        logo: DEFAULT_IMAGE,
        sameAs: ["https://discord.gg/MuSM3yXrQh"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        inLanguage: ["zh-Hant", "en"],
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      {
        "@type": "WebPage",
        name: metadata.title,
        description: metadata.description,
        url: canonicalUrl,
        inLanguage: document.documentElement.lang,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        about: { "@id": `${SITE_ORIGIN}/#organization` },
      },
    ],
  };
  let script = document.head.querySelector<HTMLScriptElement>("#seo-jsonld");
  if (!script) {
    script = document.createElement("script");
    script.id = "seo-jsonld";
    script.type = "application/ld+json";
    document.head.append(script);
  }
  script.textContent = JSON.stringify(jsonLd);
}
