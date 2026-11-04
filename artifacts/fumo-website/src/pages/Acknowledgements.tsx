import { HeartHandshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import './css/styles.css'
import { useLanguage } from "@/contexts/LanguageContext";

const acknowledgements = [
  { name: "成田路", contributionZh: "購買網域", contributionEn: "Purchased the domain name" },
  { name: "蛋包飯", contributionZh: "上架設立網站與協助處理網域問題、修改網站與新增功能", contributionEn: "Set up the website and helped with domain issues, modifications, and new features" },
  { name: "霖仙", contributionZh: "建立網站架構與設計", contributionEn: "Built the website structure and design" },
  { name: "FUMO 秘書處", contributionZh: "許可與同意網站架設之情況", contributionEn: "Provided approval and consent for the website setup" },
];

export default function Acknowledgements() {
  const { isEnglish } = useLanguage();
  return (
    <div className="min-h-screen bg-muted/20 py-10 sm:py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-start gap-2 text-secondary">
            <HeartHandshake className="h-6 w-6" />
            <span className="text-sm font-semibold tracking-wide">FUMO</span>
          </div>
          <h1 className="H1">{isEnglish ? "Acknowledgements" : "致謝名單"}</h1>
          <p className="P-subtitle">
            {isEnglish
              ? "Thanks to everyone who helped build, maintain, and develop the FUMO official website."
              : "感謝每一位為 FUMO 官方網站建設、維護與發展提供協助的人員與組織。"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {acknowledgements.map((entry) => (
            <Card key={entry.name} className="Div-base">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-secondary/10 p-2 text-secondary">
                    <HeartHandshake className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="H2">{entry.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-foreground/70">
                      {isEnglish ? entry.contributionEn : entry.contributionZh}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
