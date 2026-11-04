export interface SiteNavigationLink {
  href: string;
  label: string;
}

export function getSiteNavigationLinks(isEnglish: boolean): SiteNavigationLink[] {
  return isEnglish
    ? [
        { href: "/", label: "Home" },
        { href: "/members", label: "Member States" },
        { href: "/staff", label: "Positions" },
        { href: "/vote-records", label: "Vote records" },
        { href: "/attendance", label: "Attendance" },
        { href: "/votes", label: "Voting" },
        { href: "/regulations", label: "Regulations" },
        { href: "/charter", label: "Charter" },
        { href: "/partners", label: "Partner Organizations" },
        { href: "/acknowledgements", label: "Acknowledgements" },
        { href: "/documents", label: "Member documents" },
      ]
    : [
        { href: "/", label: "首頁" },
        { href: "/members", label: "會員國" },
        { href: "/staff", label: "職位報告" },
        { href: "/vote-records", label: "投票紀錄" },
        { href: "/attendance", label: "出席簽到" },
        { href: "/votes", label: "投票" },
        { href: "/regulations", label: "法規" },
        { href: "/charter", label: "憲章" },
        { href: "/partners", label: "合作組織" },
        { href: "/acknowledgements", label: "致謝名單" },
        { href: "/documents", label: "文件工作區" },
      ];
}
