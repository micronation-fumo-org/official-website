export interface Regulation {
  name: string;
  nameEn?: string;
  hackmdPath: string;
  hackmdPathEn?: string;
  status: "complete" | "pending" | "draft";
  category: "charter" | "membership" | "governance" | "procedures" | "order";
  description?: string;
}

export const charterUrlZh = "https://hackmd.io/@C_MoBbG-Q1CbFG1gDVFrcg/rJfgOxo5KGx";
export const charterUrlEn = "https://hackmd.io/@C_MoBbG-Q1CbFG1gDVFrcg/ryHGtgtiGg";
export const charterUrl = charterUrlZh;
export const regulationsDirectoryUrl = "https://hackmd.io/@C_MoBbG-Q1CbFG1gDVFrcg/HJeBOxjctGl";

export const regulations: Regulation[] = [
  {
    name: "聯合微國家組織憲章（第七版）",
    nameEn: "FUMO Charter (Version 7)",
    hackmdPath: "@C_MoBbG-Q1CbFG1gDVFrcg/rJfgOxo5KGx",
    hackmdPathEn: "@C_MoBbG-Q1CbFG1gDVFrcg/ryHGtgtiGg",
    status: "complete",
    category: "charter",
    description: "本組織之最高規範，規定組織宗旨、架構及成員國之基本權利義務。",
  },
  {
    name: "成員國主權通則",
    nameEn: "General Principles of Member State Sovereignty",
    hackmdPath: "5_AQLKXFQkWoizlJKlQZTQ",
    status: "complete",
    category: "membership",
    description: "規範成員國主權完整性之要求及標準。",
  },
  {
    name: "會員國權利及義務法",
    nameEn: "Law on Rights and Obligations of Member States",
    hackmdPath: "grXsyTbxT0iq5DnYSvTqTQ",
    status: "complete",
    category: "membership",
    description: "詳細規定成員國及觀察國之各項權利與應盡義務。",
  },
  {
    name: "入聯申請辦法",
    nameEn: "Application Procedures for Joining",
    hackmdPath: "uxj8LAY7Rmy1sNGE1zs6qg",
    status: "complete",
    category: "membership",
    description: "規範欲加入組織之國家申請觀察國席位之程序與要求。",
  },
  {
    name: "升格成員國家辦法",
    nameEn: "Procedures for Upgrading to Member State",
    hackmdPath: "9LOocmIZTJeV1jH8HbWPYg",
    status: "complete",
    category: "membership",
    description: "規範觀察國升格為成員國之申請程序與表決標準。",
  },
  {
    name: "席位更動及變遷辦法",
    nameEn: "Procedures for Seat Changes and Transitions",
    hackmdPath: "ITPbTCbgR5WB83_XHpdtVA",
    status: "complete",
    category: "membership",
    description: "處理國家合併、分裂、退出等導致席位變動之相關規範。",
  },
  {
    name: "議事中心設立辦法",
    nameEn: "Procedures for Establishing the Deliberation Center",
    hackmdPath: "fy9G1VLNS3qa89fXkcUzqA",
    status: "complete",
    category: "governance",
    description: "規範議事中心之設立、組成、職責及運作方式。",
  },
  {
    name: "秘書處義務法",
    nameEn: "Secretariat Obligations Law",
    hackmdPath: "tfmBntfKTdOfGBYkTMhZ_Q",
    status: "complete",
    category: "governance",
    description: "規定秘書處及秘書長之職責、義務與行政職能。",
  },
  {
    name: "秘書長職權受阻及出缺處理辦法",
    nameEn: "Procedures for Secretary-General Obstruction and Vacancy",
    hackmdPath: "0izQ5UbmQ8icX-KLXSWBnA",
    status: "complete",
    category: "governance",
    description: "規範秘書長無法行使職權或職位出缺時之處理機制。",
  },
  {
    name: "理事國義務法",
    nameEn: "Council State Obligations Law",
    hackmdPath: "QC3ySU5BTgSTCGMTWf6Wmg",
    status: "complete",
    category: "governance",
    description: "規定理事國之權利、義務與在組織中之職責。",
  },
  {
    name: "秘書長選舉及罷免法",
    nameEn: "Secretary-General Election and Recall Law",
    hackmdPath: "3TZ4ijgaRYGGy5EJY3GMsg",
    status: "complete",
    category: "procedures",
    description: "詳細規範秘書長選舉流程、罷免程序及相關標準。",
  },
  {
    name: "理事國選舉及罷免法",
    nameEn: "Council State Election and Recall Law",
    hackmdPath: "nh7NhxJPSSCy79qLb4frCg",
    status: "complete",
    category: "procedures",
    description: "詳細規範理事國選舉流程、罷免程序及相關標準。",
  },
  {
    name: "無活躍國家降格辦法",
    nameEn: "Procedures for Downgrading Inactive States",
    hackmdPath: "Xn5xdochSKqWN0qCJa9yXQ",
    status: "complete",
    category: "membership",
    description: "規範無活躍國家降格處理之認定標準與操作程序。",
  },
  {
    name: "國家席位自主凍結辦法",
    nameEn: "Procedures for Voluntary Seat Freeze",
    hackmdPath: "UxSV5ECrR5ujRf0PL6rS6A",
    status: "complete",
    category: "membership",
    description: "允許成員國依自身意願申請凍結席位之程序與規範。",
  },
  {
    name: "維護組織中立與實行調解制度規章",
    nameEn: "Regulations on Maintaining Organizational Neutrality and Mediation",
    hackmdPath: "9iVjSUjtSmuZMd294eDMAw",
    status: "complete",
    category: "order",
    description: "規範組織保持中立立場及處理成員國間爭端之調解機制。",
  },
  {
    name: "議事規則",
    nameEn: "Rules of Procedure",
    hackmdPath: "kW-rNFQIQ26pg0NJV1ariA",
    status: "complete",
    category: "governance",
    description: "詳細規定議事中心會議流程、議案提交與表決之操作規則。",
  },
  {
    name: "虛構人事死亡處分條例",
    nameEn: "Ordinance on Disposition of Fictional Personnel Deaths",
    hackmdPath: "r6dUFHsYSVOrPAsHNc0qWw",
    status: "complete",
    category: "order",
    description: "規範組織內虛構人物死亡事件之處理方式與相關程序。",
  },
  {
    name: "入聯國家國旗規範",
    nameEn: "Flag Standards for Member States",
    hackmdPath: "-WkzEZswQ8-gSo18I6m4zA",
    status: "complete",
    category: "membership",
    description: "規定加入組織之國家國旗設計應符合之標準與規範。",
  },
  {
    name: "組織秩序管理規章",
    nameEn: "Organizational Order Management Regulations",
    hackmdPath: "tBiDR8ULTrGjvatfgI62nA",
    status: "complete",
    category: "order",
    description: "維護組織內部秩序、處理違規行為之相關管理規範。",
  },
];

export const regulationCategories = {
  charter: { label: "憲章", labelEn: "Charter", color: "gold" },
  membership: { label: "成員資格", labelEn: "Membership", color: "blue" },
  governance: { label: "治理架構", labelEn: "Governance", color: "purple" },
  procedures: { label: "選舉程序", labelEn: "Procedures", color: "green" },
  order: { label: "秩序管理", labelEn: "Order & Discipline", color: "orange" },
};
