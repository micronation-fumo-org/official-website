import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileSpreadsheet, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { toChineseError } from "@/lib/errorMessage";
import { useLanguage } from "@/contexts/LanguageContext";

type Kind = "standard" | "special";
interface RecordEntry {
  kind: Kind;
  meeting: string;
  code: string;
  title: string;
  totalVotes: string;
  turnout: string;
  result: string;
  countryVotes: { countryName: string; selection: string }[];
}
interface RecordData {
  standard: RecordEntry[];
  special: RecordEntry[];
  fetchedAt: string;
}

const PAGE_SIZE = 20;
const SOURCES: Record<Kind, string> = {
  standard: "https://docs.google.com/spreadsheets/d/1Iw5EY1LfFF-Ig9tJGVyWNBON20t9oE-0iFVFPPgsjk0/edit?gid=483555265#gid=483555265",
  special: "https://docs.google.com/spreadsheets/d/1Iw5EY1LfFF-Ig9tJGVyWNBON20t9oE-0iFVFPPgsjk0/edit?gid=281957361#gid=281957361",
};

async function fetchRecords(): Promise<RecordData> {
  const response = await apiFetch("/api/vote-records");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "載入歷史投票紀錄失敗。");
  return data;
}

export default function VoteRecords() {
  const { isEnglish } = useLanguage();
  const [kind, setKind] = useState<Kind>("standard");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({ queryKey: ["vote-records"], queryFn: fetchRecords, staleTime: 300000, refetchInterval: 300000 });
  useEffect(() => setPage(1), [kind, search]);

  const records = data?.[kind] ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return records;
    return records.filter((record) => [record.meeting, record.code, record.title, record.totalVotes, record.turnout, record.result,
      ...record.countryVotes.flatMap((entry) => [entry.countryName, entry.selection]),
    ].join(" ").toLocaleLowerCase().includes(query));
  }, [records, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRecords = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const categoryName = kind === "standard" ? (isEnglish ? "Standard proposals" : "標準議案") : (isEnglish ? "Special proposals" : "特殊議案");

  return (
    <main className="min-h-screen bg-muted/20 py-6 sm:py-12">
      <div className="container mx-auto max-w-6xl px-3 sm:px-4">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-secondary"><FileSpreadsheet className="h-5 w-5" /><span className="text-sm font-semibold">{isEnglish ? "Official public archive" : "官方公開檔案"}</span></div>
            <h1 className="text-2xl font-bold text-primary sm:text-3xl">{isEnglish ? "Voting Records" : "投票紀錄"}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">{isEnglish ? "Browse historical standard and special proposal votes. This page is read-only and reflects the public official spreadsheets." : "瀏覽標準與特殊議案的歷史投票紀錄。本頁為唯讀，資料取自官方公開試算表。"}</p>
          </div>
          <a href={SOURCES[kind]} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 self-start rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-muted sm:self-auto"><ExternalLink className="h-4 w-4" />{isEnglish ? "Open source sheet" : "開啟來源試算表"}</a>
        </header>

        <Card className="mb-5 border-border/60 bg-white"><CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={isEnglish ? "Record category" : "紀錄類別"}>
            {(["standard", "special"] as const).map((value) => {
              const label = value === "standard" ? (isEnglish ? "Standard" : "標準議案") : (isEnglish ? "Special" : "特殊議案");
              const selected = kind === value;
              return <button key={value} type="button" role="tab" aria-selected={selected} onClick={() => setKind(value)} className={`min-h-10 rounded-md border px-4 py-2 text-sm font-semibold ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground hover:bg-muted"}`}>{label}{data ? ` (${data[value].length})` : ""}</button>;
            })}
          </div>
          <div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isEnglish ? "Search meeting, ID, proposal, country or choice" : "搜尋例會、代號、議案、國家或投票選項"} aria-label={isEnglish ? "Search vote records" : "搜尋投票紀錄"} className="min-h-11 pl-9" /></div>
        </CardContent></Card>

        <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
          <p>{categoryName}: {isEnglish ? `${filtered.length} records` : `${filtered.length} 筆紀錄`}</p>
          {data?.fetchedAt && <p>{isEnglish ? "Fetched" : "資料讀取時間"}: {new Date(data.fetchedAt).toLocaleString(isEnglish ? "en-US" : "zh-TW")}</p>}
        </div>

        {isLoading ? <p className="py-12 text-center text-muted-foreground">{isEnglish ? "Loading records…" : "正在載入紀錄…"}</p> : null}
        {error ? <Card className="border-red-200 bg-white"><CardContent className="p-5 text-red-700">{isEnglish ? "Could not load the voting records. Please try again later." : toChineseError(error, "歷史投票紀錄載入失敗，請稍後再試。")}</CardContent></Card> : null}
        {!isLoading && !error && (
          <>
            {pageRecords.length ? <div className="space-y-3">
              {pageRecords.map((record, index) => <Card key={`${kind}-${record.code || record.title}-${index}`} className="border-border/60 bg-white"><CardContent className="p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap gap-2">{record.meeting && <Badge variant="outline">{record.meeting}</Badge>}{record.code && <Badge variant="secondary">{isEnglish ? "ID" : "代號"}: {record.code}</Badge>}</div>
                <h2 className="break-words text-base font-bold text-primary sm:text-lg">{record.title || (isEnglish ? "Untitled proposal" : "未命名議案")}</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-md bg-muted/50 p-3 text-sm sm:grid-cols-3">
                  <div><p className="text-xs text-muted-foreground">{kind === "standard" ? (isEnglish ? "Votes" : "總票數") : (isEnglish ? "Countries recorded" : "有紀錄國家")}</p><p className="font-semibold">{record.totalVotes || "—"}</p></div>
                  {kind === "standard" && <div><p className="text-xs text-muted-foreground">{isEnglish ? "Turnout" : "投票率"}</p><p className="font-semibold">{record.turnout || "—"}</p></div>}
                  <div><p className="text-xs text-muted-foreground">{isEnglish ? "Outcome" : "表決結果"}</p><p className="font-semibold">{record.result || "—"}</p></div>
                </div>
                <details className="mt-4 border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold text-primary">{isEnglish ? `Country records (${record.countryVotes.length})` : `各國投票明細（${record.countryVotes.length}）`}</summary>
                  {record.countryVotes.length ? <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{record.countryVotes.map((entry, i) => <div key={`${entry.countryName}-${i}`} className="min-w-0 rounded-md border border-border/60 bg-white p-3 text-sm"><p className="break-words font-semibold text-primary">{entry.countryName}</p><p className="mt-1 break-words">{entry.selection}</p></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">{isEnglish ? "No country entries." : "沒有國家投票明細。"}</p>}
                </details>
              </CardContent></Card>)}
            </div> : <Card className="border-border/60 bg-white"><CardContent className="p-8 text-center text-muted-foreground">{isEnglish ? "No matching records." : "找不到符合條件的投票紀錄。"}</CardContent></Card>}
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button type="button" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{isEnglish ? "Previous" : "上一頁"}</Button>
              <span className="text-sm text-muted-foreground">{currentPage} / {pageCount}</span>
              <Button type="button" variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>{isEnglish ? "Next" : "下一頁"}</Button>
            </div>
          </>
        )}
        <p className="mt-5 text-center text-xs text-muted-foreground">{isEnglish ? "Read-only source data; no changes are made to the spreadsheets. Records refresh from the public sheets approximately every five minutes." : "此頁僅讀取公開試算表，不會修改來源資料；紀錄約每五分鐘更新一次。"}</p>
      </div>
    </main>
  );
}
