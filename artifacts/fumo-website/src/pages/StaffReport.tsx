import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Building2, RefreshCw, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toChineseError } from "@/lib/errorMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface StaffEntry {
  name: string;
  roles: string[];
  areas: string[];
  organizations: string[];
}

async function fetchStaffReport(): Promise<{ staff: StaffEntry[]; lastUpdated: string }> {
  const res = await apiFetch("/api/staff-report");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "載入職位報告失敗。");
  return data;
}

export default function StaffReport() {
  const { isEnglish } = useLanguage();
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["staff-report"],
    queryFn: fetchStaffReport,
    staleTime: 5 * 60 * 1000,
  });

  const grouped = useMemo(() => {
    const result = new Map<string, StaffEntry[]>();
    for (const entry of data?.staff ?? []) {
      for (const organization of entry.organizations) {
        result.set(organization, [...(result.get(organization) ?? []), entry]);
      }
    }
    return result;
  }, [data]);

  return (
    <div className="min-h-screen bg-muted/20 py-10 sm:py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-secondary mb-2">
              <BriefcaseBusiness className="w-5 h-5" />
              <span className="text-sm font-semibold tracking-wide">FUMO</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-primary">
              {isEnglish ? "Secretariat position report" : "秘書處職位報告"}
            </h1>
            <p className="text-foreground/70 mt-2 max-w-2xl">
              {isEnglish
                ? "Current public roster of FUMO Secretariat positions, titles, and responsibilities from the official website data sheet. Account IDs are not displayed."
                : "FUMO 官方網站資料表中的秘書處職位、職稱與負責區域。此報告只顯示公開職務資料，不顯示帳號 ID。"}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? (isEnglish ? "Updating..." : "更新中...") : (isEnglish ? "Refresh report" : "重新整理報告")}
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="p-4 text-red-700">{toChineseError(error as Error)}</CardContent>
          </Card>
        )}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">{isEnglish ? "Loading report..." : "載入職位報告中..."}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...grouped.entries()].map(([organization, entries]) => {
              return (
                <Card key={organization} className="border-border/60 bg-white shadow-sm">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Building2 className="w-5 h-5 text-secondary" />
                      {isEnglish ? (organization === "秘書處" ? "Secretariat" : organization) : organization}
                      <Badge variant="secondary" className="ml-auto">{entries.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">{isEnglish ? "No public records." : "目前沒有公開職位資料。"}</p>
                    ) : (
                      <div className="space-y-3">
                        {entries.map((entry, index) => (
                          <div key={`${entry.name}-${index}`} className="rounded-lg border border-border/60 p-4">
                            <div className="flex items-start gap-3">
                              <UserRound className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-primary">{entry.name}</span>
                                  {entry.roles.map((role) => <Badge key={role} variant="outline">{role}</Badge>)}
                                </div>
                                {entry.areas.length > 0 && (
                                  <p className="text-sm text-foreground/70 mt-2">
                                    <span className="font-medium">{isEnglish ? "Responsibilities: " : "負責區域："}</span>{entry.areas.join("、")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {data?.lastUpdated && <p className="text-xs text-muted-foreground text-right mt-4">{isEnglish ? "Fetched: " : "資料擷取時間："}{new Date(data.lastUpdated).toLocaleString("zh-TW")}</p>}
      </div>
    </div>
  );
}
