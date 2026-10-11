import { useLanguage } from "@/contexts/LanguageContext";

export default function Terms() {
  const { isEnglish } = useLanguage();
  const t = (zh: string, en: string) => isEnglish ? en : zh;
  return (
    <div className="min-h-screen bg-muted/10 py-12">
      <article className="container mx-auto px-4 max-w-4xl">
        <header className="mb-10"><h1 className="text-4xl font-bold text-primary mb-3">{t("使用條款", "Terms of Use")}</h1><p className="text-muted-foreground">{t("最後更新：2026 年 10 月 11 日", "Last updated: October 11, 2026")}</p></header>
        <div className="bg-white rounded-lg border border-border/60 shadow-sm p-6 md:p-10 space-y-8 text-foreground/85 leading-7">
          <p>{t("歡迎使用聯合微國家組織（FUMO）網站。使用本網站即表示您同意遵守以下條款；若您不同意，請停止使用本網站。", "Welcome to the Federation of United Micronations Organisation (FUMO) website. By using this website, you agree to these terms. If you do not agree, please stop using the website.")}</p>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("一、服務內容", "1. Service description")}</h2><p>{t("本網站提供微國家組織的資訊、會員資料、法規文件、投票及相關管理功能。網站內容可能因組織決議、資料更新或維護作業而變更。", "The website provides information about FUMO, membership data, regulatory documents, voting and related administration features. Content may change due to organisational decisions, data updates or maintenance.")}</p></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("二、帳戶與使用者責任", "2. Accounts and user responsibilities")}</h2><ul className="list-disc pl-6 space-y-2"><li>{t("您應提供真實、準確且最新的帳戶資訊。", "You must provide accurate and current account information.")}</li><li>{t("您應妥善保管密碼，不得與他人分享帳戶或冒用他人身份。", "You must protect your password and must not share an account or impersonate another person.")}</li><li>{t("您只能代表您獲授權的國家、組織或身份進行操作。", "You may act only for a state, organisation or identity you are authorised to represent.")}</li></ul></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("三、投票規則", "3. Voting rules")}</h2><p>{t("投票結果、投票資格、表決門檻及議事程序依組織憲章與相關法規辦理。您不得重複投票、操縱結果、提交虛假資料或以技術方式干擾投票服務。管理員得依規定處理違規投票或關閉投票。", "Voting results, eligibility, thresholds and procedures are governed by the FUMO Charter and applicable regulations. You must not vote repeatedly, manipulate results, submit false information or technically interfere with the voting service. Administrators may handle invalid ballots or close votes according to the rules.")}</p></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("四、禁止行為", "4. Prohibited conduct")}</h2><p>{t("您不得違法使用本網站、侵害他人權利、散布惡意程式、未經授權存取系統、破壞服務、干擾其他使用者，或發布具威脅、歧視、欺騙或侵害性的內容。", "You must not use the website unlawfully, infringe others' rights, distribute malware, access systems without authorisation, damage the service, interfere with other users or publish threatening, discriminatory, deceptive or abusive content.")}</p></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("五、智慧財產權", "5. Intellectual property")}</h2><p>{t("本網站程式碼依專案根目錄的 MIT License 授權。組織名稱、標誌、憲章、法規文件及第三方內容可能受其他權利或授權條款限制，使用前請確認相應權利。", "The website code is licensed under the MIT License in the project root. The organisation name, logos, Charter, regulatory documents and third-party content may be subject to other rights or licence terms; verify the applicable rights before using them.")}</p></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("六、服務中斷與責任限制", "6. Availability and limitation of liability")}</h2><p>{t("本網站依現況提供，不保證服務永遠不中斷、沒有錯誤或完全符合特定需求。法律允許的最大範圍內，網站維護者不對因使用或無法使用本網站所造成的間接、附帶或衍生損害負責。", "The website is provided as available, without a guarantee that it will always be uninterrupted, error-free or fit for a particular purpose. To the maximum extent permitted by law, the maintainer is not liable for indirect, incidental or consequential damages arising from use of or inability to use the website.")}</p></section>
          <section><h2 className="text-2xl font-bold text-primary mb-3">{t("七、條款變更與終止", "7. Changes and termination")}</h2><p>{t("我們可能更新本條款或限制、暫停及終止部分服務。更新後會在本頁公布新的生效日期；繼續使用網站即表示您接受更新後的條款。", "We may update these terms or restrict, suspend or terminate parts of the service. Updates will be posted on this page with a new effective date. Continued use means you accept the updated terms.")}</p></section>
          <p className="text-sm text-muted-foreground border-t border-border pt-6">{t("本頁內容為一般使用條款草案，不構成法律意見；如有特定法律需求，請諮詢合格的法律專業人士。", "These general terms are provided for website use and do not constitute legal advice. Consult a qualified legal professional for specific legal needs.")}</p>
        </div>
      </article>
    </div>
  );
}
