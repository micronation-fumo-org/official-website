import { useLanguage } from "@/contexts/LanguageContext";

export default function Privacy() {
  const { isEnglish } = useLanguage();
  const t = (zh: string, en: string) => isEnglish ? en : zh;
  return (
    <div className="min-h-screen bg-muted/10 py-12">
      <article className="container mx-auto px-4 max-w-4xl">
        <header className="mb-10"><h1 className="text-4xl font-bold text-primary mb-3">{t("隱私權政策", "Privacy Policy")}</h1><p className="text-muted-foreground">{t("最後更新：2026 年 10 月 11 日", "Last updated: October 11, 2026")}</p></header>
        <div className="bg-white rounded-lg border border-border/60 shadow-sm p-6 md:p-10 space-y-8 text-foreground/85 leading-7">
          <p>{t("本隱私權政策說明聯合微國家組織（FUMO）網站如何處理您使用服務時提供或產生的資訊。本政策適用於本網站及其相關投票與會員功能。", "This Privacy Policy explains how the Federation of United Micronations Organisation (FUMO) handles information provided or generated when you use this website, including its voting and membership features.")}</p>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("一、我們收集的資訊", "1. Information we collect")}</h2><ul className="list-disc pl-6 space-y-2"><li>{t("帳戶資訊：例如 Discord ID、代表名稱、國家名稱及帳戶權限。", "Account information, such as your Discord ID, representative name, country name and account role.")}</li><li>{t("使用資料：例如投票紀錄、投票時間及網站操作所需的技術紀錄。", "Usage data, such as ballot records, timestamps and technical logs needed to operate the website.")}</li><li>{t("您主動提交的內容：例如投票名稱、說明及選項。", "Content you submit, such as vote names, descriptions and options.")}</li></ul></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("二、資訊的使用方式", "2. How we use information")}</h2><p>{t("我們使用上述資訊提供登入、會員管理、投票、權限控制、網站安全、錯誤排查及服務改善功能。我們不會將您的個人資訊出售給第三方。", "We use this information to provide sign-in, membership management, voting, access control, security, troubleshooting and service improvement. We do not sell your personal information to third parties.")}</p></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("三、資料分享與第三方服務", "3. Sharing and third-party services")}</h2><p>{t("只有在提供網站功能、遵守法律要求、保護網站安全或取得您同意時，我們才會分享必要資訊。網站可能連結至 HackMD、Discord 或其他第三方服務；這些服務有各自的隱私政策，請在使用前查閱。", "We share necessary information only to provide website functionality, comply with legal requirements, protect security or with your consent. The website may link to HackMD, Discord or other third-party services, which have their own privacy policies.")}</p></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("四、資料保存與安全", "4. Retention and security")}</h2><p>{t("我們會在提供服務所需期間保存資料，並採取合理措施防止未經授權的存取、修改或洩漏。但網路傳輸與電子儲存均無法保證絕對安全。", "We retain information for as long as needed to provide the service and take reasonable measures against unauthorised access, alteration or disclosure. However, no internet transmission or electronic storage can be guaranteed completely secure.")}</p></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("五、您的權利", "5. Your rights")}</h2><p>{t("您可以要求查閱、更正或刪除與您相關的帳戶資料；如需提出要求，請透過專案維護者提供的聯絡方式聯繫我們。我們可能需要先確認您的身份。", "You may request access to, correction of or deletion of account information related to you. Contact the project maintainer through the available project contact channels; we may need to verify your identity first.")}</p></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("六、政策變更", "6. Changes to this policy")}</h2><p>{t("我們可能因法律、技術或服務變更更新本政策。更新後會在本頁公布新的生效日期；繼續使用網站即表示您了解更新內容。", "We may update this policy due to legal, technical or service changes. Updates will be posted on this page with a new effective date. Continued use of the website means you acknowledge the updated policy.")}</p></section>
          <p className="text-sm text-muted-foreground border-t border-border pt-6">{t("本頁內容為網站使用說明，不構成法律意見；如有特定法律需求，請諮詢合格的法律專業人士。", "This page is general website information and does not constitute legal advice. Consult a qualified legal professional for specific legal needs.")}</p>
        </div>
      </article>
    </div>
  );
}
