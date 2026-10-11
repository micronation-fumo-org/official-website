import { charterUrl } from "@/data/regulations";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Charter() {
  const { isEnglish } = useLanguage();
  return (
    <div className="min-h-screen bg-muted/10 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">{isEnglish ? "Organisation Charter" : "組織憲章"}</h1>
          <p className="text-foreground/70 mb-6 max-w-2xl mx-auto">
            《聯合微國家組織憲章》為本組織之最高規範，確立了組織的宗旨、原則及運作架構。以下為憲章核心條文節錄。
          </p>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <a href={charterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {isEnglish ? "Read the full charter on HackMD" : "在 HackMD 閱讀完整憲章"}
              <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden prose prose-slate max-w-none">
          <div className="p-8 md:p-12">
            
            <div className="text-center mb-12 border-b border-border pb-8">
              <h2 className="text-3xl font-bold text-primary mt-0 mb-2">聯合微國家組織憲章</h2>
              <p className="text-xl text-secondary font-medium m-0">Charter of the Federation of United Micronations Organisation</p>
            </div>

            <div className="space-y-12">
              <section>
                <h3 className="text-2xl font-bold text-primary border-l-4 border-secondary pl-4 py-1 mb-6">第一章：宗旨與原則 <span className="block text-base font-normal text-muted-foreground mt-1">Chapter 1 — Purpose & Principles</span></h3>
                <div className="space-y-6">
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第一條（全名）</h4>
                    <p className="text-foreground/80 m-0">本組織全名為「聯合微國家組織」，英文全名為 Federation of United Micronations Organisation（FUMO）。</p>
                  </div>
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第二條（宗旨）</h4>
                    <p className="text-foreground/80 m-0">本組織之宗旨為維持國際和平與安全、消除對和平之威脅、制止任何歧視行為，並以和平方式調解微國家間之爭端，以促進各國之繁榮、和諧與穩定。</p>
                  </div>
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第三條（主權尊重）</h4>
                    <p className="text-foreground/80 m-0">各成員國應互相尊重彼此之主權與領土完整，並善意履行本憲章所規定之義務。</p>
                  </div>
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第四條（最高規範）</h4>
                    <p className="text-foreground/80 m-0">本憲章為組織之最高規範，具有絕對之效力。任何與本憲章相牴觸之附屬法規或決議皆為無效。</p>
                  </div>
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第五條（組織架構）</h4>
                    <p className="text-foreground/80 m-0">本組織設有下列主要常設機構：議事中心、秘書處、理事會。並設有下列非常設機構：加成委員會、託管委員會。</p>
                  </div>
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第六條（決議門檻）</h4>
                    <p className="text-foreground/80 m-0">
                      <strong>一般決議：</strong>需有三分之一以上未凍結席位之成員國參與投票，且同意票多於反對票。<br/>
                      <strong>特別決議：</strong>需有五分之二以上未凍結席位之成員國參與投票，且同意票達參與投票國之二分之一以上。
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-2xl font-bold text-primary border-l-4 border-secondary pl-4 py-1 mb-6">第二章：成員國與觀察國 <span className="block text-base font-normal text-muted-foreground mt-1">Chapter 2 — Member & Observer States</span></h3>
                <div className="space-y-6">
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第七條至第九條（地位與權利）</h4>
                    <p className="text-foreground/80 m-0">加入本組織之國家即成為成員國或觀察國，享有席位。正式成員國必須具備完整的主權。所有成員國皆享有本憲章賦予之權利，並應履行相應之義務。</p>
                  </div>
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第十條至第十二條（加入與變更）</h4>
                    <p className="text-foreground/80 m-0">申請加入本組織者須依程序先成為觀察國，後可依程序申請升格為正式成員國。如遇國家合併、內戰或分裂等情況，其席位變更須經內部協商並由議事中心處理。</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-2xl font-bold text-primary border-l-4 border-secondary pl-4 py-1 mb-6">第三章：議事中心 <span className="block text-base font-normal text-muted-foreground mt-1">Chapter 3 — Deliberation Center</span></h3>
                <div className="space-y-6">
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第十三條至第十五條（組成與職權）</h4>
                    <p className="text-foreground/80 m-0">議事中心為本組織最高權力與議事機構。每個國家可派 1 至 3 名代表參與。日常運作由理事國管理，設主席一人、副主席一至二人。正式成員國享有提案、表決與發言權；觀察國僅享有發言權。</p>
                  </div>
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第十七條至第十九條（表決與會議）</h4>
                    <p className="text-foreground/80 m-0">議事中心採一國一票制，以公開唱名方式表決。若有緊急狀況，經二分之一以上理事國連署，且距下次常規會議尚有五日以上時，得召開特別會議。</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-2xl font-bold text-primary border-l-4 border-secondary pl-4 py-1 mb-6">第四章：秘書處 <span className="block text-base font-normal text-muted-foreground mt-1">Chapter 4 — Secretariat</span></h3>
                <div className="space-y-6">
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第二十三條至第二十四條（職責）</h4>
                    <p className="text-foreground/80 m-0">秘書長為組織之最高行政首長，對外代表組織，並享有提案權。秘書處之職責包括：維持議事運作、管理組織資產、籌辦文化交流活動、監督憲章之執行及落實各項決議。</p>
                  </div>
                  <div className="pl-4">
                    <h4 className="text-lg font-bold mb-2">第二十五條至第二十六條（任期與選舉）</h4>
                    <p className="text-foreground/80 m-0">秘書長任期為六個月，連選得連任。秘書長由議事中心選舉產生，亦由議事中心依規定程序予以罷免。</p>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
