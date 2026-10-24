import { HeartHandshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const acknowledgements = [
  { name: "成田路", contribution: "購買網域" },
  { name: "蛋包飯", contribution: "上架設立網站與協助處理網域問題、修改網站與新增功能" },
  { name: "霖仙", contribution: "建立網站架構與設計" },
  { name: "FUMO 秘書處", contribution: "許可與同意網站架設之情況" },
];

export default function Acknowledgements() {
  return (
    <div className="min-h-screen bg-muted/20 py-10 sm:py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-secondary">
            <HeartHandshake className="h-6 w-6" />
            <span className="text-sm font-semibold tracking-wide">FUMO</span>
          </div>
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">致謝名單</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-foreground/70 sm:text-base">
            感謝每一位為 FUMO 官方網站建設、維護與發展提供協助的人員與組織。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {acknowledgements.map((entry) => (
            <Card key={entry.name} className="border-border/60 bg-background shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-secondary/10 p-2 text-secondary">
                    <HeartHandshake className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-semibold text-primary">{entry.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-foreground/70">{entry.contribution}</p>
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
