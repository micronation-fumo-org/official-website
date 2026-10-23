import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Handshake, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { toChineseError } from "@/lib/errorMessage";
import { useLanguage } from "@/contexts/LanguageContext";

interface PartnerOrganization {
  name: string;
  cooperationDate: string;
}

interface PartnerOrganizationsResponse {
  organizations: PartnerOrganization[];
  fetchedAt: string;
}

async function fetchPartnerOrganizations(): Promise<PartnerOrganizationsResponse> {
  const response = await apiFetch("/api/partners");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "載入合作組織名錄失敗。");
  return data;
}

export default function Partners() {
  const { isEnglish } = useLanguage();
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["partner-organizations"],
    queryFn: fetchPartnerOrganizations,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  const organizations = data?.organizations ?? [];

  return (
    <main className="min-h-screen bg-muted/20 py-8 sm:py-12">
      <div className="container mx-auto max-w-5xl px-4">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-secondary">
              <Handshake className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-wide">
                {isEnglish ? "Official partner directory" : "官方合作名錄"}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-primary sm:text-4xl">
              {isEnglish ? "Partner Organizations" : "合作組織"}
            </h1>
            <p className="mt-2 max-w-2xl text-foreground/70">
              {isEnglish
                ? "Organizations that have established cooperation with the Federation of United Micronations Organisation."
                : "本頁列出與聯合微國家組織建立合作關係的組織及合作日期。"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-full gap-2 sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching
              ? (isEnglish ? "Updating…" : "更新中…")
              : (isEnglish ? "Refresh directory" : "重新整理名錄")}
          </Button>
        </header>

        {data && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {isEnglish ? `${organizations.length} organizations` : `${organizations.length} 個合作組織`}
            </Badge>
            {data.fetchedAt && (
              <span>
                {isEnglish ? "Last synchronized" : "資料同步時間"}: {new Date(data.fetchedAt).toLocaleString(isEnglish ? "en-US" : "zh-TW")}
              </span>
            )}
          </div>
        )}

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4 text-red-700">
              {isEnglish
                ? "Could not load the partner directory. Please try again later."
                : toChineseError(error as Error, "合作組織名錄載入失敗，請稍後再試。")}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="py-16 text-center text-muted-foreground">
            {isEnglish ? "Loading partner organizations…" : "正在載入合作組織…"}
          </p>
        ) : !error && organizations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {organizations.map((organization, index) => (
              <Card key={`${organization.name}-${organization.cooperationDate}-${index}`} className="border-border/60 bg-white shadow-sm">
                <CardContent className="flex min-w-0 items-start gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-secondary">
                    <Handshake className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-lg font-semibold text-primary">{organization.name}</h2>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{isEnglish ? "Cooperation date" : "合作日期"}</span>
                      <span className="font-medium text-foreground">{organization.cooperationDate || "—"}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !error ? (
          <Card className="border-border/60 bg-white">
            <CardContent className="p-8 text-center text-muted-foreground">
              {isEnglish ? "No partner organizations are currently listed." : "目前尚無公開的合作組織資料。"}
            </CardContent>
          </Card>
        ) : null}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {isEnglish
            ? "Read-only directory synchronized from FUMO’s official Google Sheet; updates usually appear within five minutes."
            : "本名錄以唯讀方式同步自 FUMO 官方 Google 試算表，不會修改來源資料；更新通常於五分鐘內反映。"}
        </p>
      </div>
    </main>
  );
}
