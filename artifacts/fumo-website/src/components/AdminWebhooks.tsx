import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  KeyRound,
  Lock,
  Pencil,
  PlayCircle,
  Power,
  RefreshCw,
  Send,
  ShieldCheck,
  Timer,
  Trash2,
  Vote,
  Webhook,
  X,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toChineseError } from "@/lib/errorMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type EventKey = "vote.created" | "vote.published" | "vote.started" | "vote.closing_soon" | "vote.closed" | "ballot.cast";

interface WebhookItem {
  id: number;
  name: string;
  /** The server masks the endpoint path because it may contain a bearer token. */
  url: string;
  events: EventKey[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
interface WebhookList { events: EventKey[]; items: WebhookItem[]; }
interface DeliveryItem {
  id: number;
  event: string;
  vote_id: number | null;
  status_code: number | null;
  ok: number;
  error: string;
  created_at: string;
}

const EVENT_OPTIONS: { id: EventKey; zh: string; en: string; hintZh: string; hintEn: string; Icon: typeof FileText }[] = [
  { id: "vote.created", zh: "投票建立", en: "Vote created", hintZh: "建立投票時（草稿、預約或立即）", hintEn: "A vote is created (draft, scheduled or live)", Icon: FileText },
  { id: "vote.published", zh: "草稿發布", en: "Draft published", hintZh: "草稿被正式發布時", hintEn: "A draft is published", Icon: PlayCircle },
  { id: "vote.started", zh: "投票開始", en: "Voting started", hintZh: "開放投票的那一刻", hintEn: "Voting becomes available", Icon: BellRing },
  { id: "vote.closing_soon", zh: "即將截止", en: "Closing soon", hintZh: "截止前 24 小時內提醒一次", hintEn: "One reminder within the final 24 hours", Icon: Timer },
  { id: "vote.closed", zh: "投票結束", en: "Vote closed", hintZh: "手動關閉或截止時間到期", hintEn: "Closed manually or the deadline passed", Icon: Lock },
  { id: "ballot.cast", zh: "收到選票", en: "Ballot cast", hintZh: "有國家完成投票（不含選項）", hintEn: "A country voted (never the choices)", Icon: Vote },
];
const DEFAULT_EVENTS: EventKey[] = ["vote.created", "vote.published", "vote.started", "vote.closing_soon", "vote.closed"];

const VERIFY_SAMPLE = [
  'const timestamp = req.headers["x-fumo-timestamp"];',
  'const signature = req.headers["x-fumo-signature"];',
  'const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET)',
  '  .update(timestamp + "." + rawBody) // rawBody 必須是未解析的原始 JSON 字串',
  '  .digest("hex");',
  'const valid = signature?.length === expected.length &&',
  '  timingSafeEqual(Buffer.from(expected), Buffer.from(signature));',
].join("\n");

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = (data as { error?: string }).error;
    const code = (data as { statusCode?: number }).statusCode;
    throw new Error(`${error || `HTTP ${response.status}`}${code ? ` (${code})` : ""}`);
  }
  return data as T;
}

async function fetchWebhooks(): Promise<WebhookList> {
  return readResponse<WebhookList>(await apiFetch("/api/admin/webhooks"));
}

async function fetchDeliveries(id: number): Promise<{ items: DeliveryItem[] }> {
  return readResponse<{ items: DeliveryItem[] }>(await apiFetch(`/api/admin/webhooks/${id}/deliveries?limit=10`));
}

function eventMeta(event: string) {
  return EVENT_OPTIONS.find(item => item.id === event);
}

function eventLabel(event: string, isEnglish: boolean) {
  const option = eventMeta(event);
  if (option) return isEnglish ? option.en : option.zh;
  if (event === "webhook.test") return isEnglish ? "Test" : "測試通知";
  return event;
}

function formatUtc(value: string, isEnglish: boolean) {
  const parsed = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(isEnglish ? "en-US" : "zh-TW", { timeZone: "UTC" });
}

/** Small visual "how it works" strip: event → signed request → receiver. */
function FlowStrip({ isEnglish }: { isEnglish: boolean }) {
  const steps = [
    { Icon: Vote, zh: "投票事件", en: "Vote event", zhHint: "建立、開始、截止", enHint: "created, started, closed" },
    { Icon: ShieldCheck, zh: "簽章封裝", en: "Signed request", zhHint: "HMAC-SHA256 標頭", enHint: "HMAC-SHA256 headers" },
    { Icon: Webhook, zh: "你的接收端", en: "Your receiver", zhHint: "Discord、Slack 或自有 API", enHint: "Discord, Slack or your API" },
  ];
  return (
    <div className="flex flex-col items-stretch gap-2 rounded-lg border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center">
      {steps.map((step, index) => (
        <div key={step.zh} className="flex flex-1 items-center gap-2">
          <div className="flex flex-1 items-center gap-3 rounded-md border border-border/60 bg-white px-3 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <step.Icon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-primary">{isEnglish ? step.en : step.zh}</span>
              <span className="block text-xs text-muted-foreground">{isEnglish ? step.enHint : step.zhHint}</span>
            </span>
          </div>
          {index < steps.length - 1 && <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />}
        </div>
      ))}
    </div>
  );
}

function StatTile({ Icon, label, value, tone = "default" }: { Icon: typeof Activity; label: string; value: string; tone?: "default" | "green" | "amber" }) {
  const tones = {
    default: "border-border/60 bg-white text-primary",
    green: "border-green-200 bg-green-50 text-green-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  } as const;
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${tones[tone]}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function DeliveryTimeline({ webhookId, isEnglish }: { webhookId: number; isEnglish: boolean }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin-webhook-deliveries", webhookId],
    queryFn: () => fetchDeliveries(webhookId),
    staleTime: 5_000,
  });
  if (isLoading) return <p className="py-3 text-xs text-muted-foreground">{isEnglish ? "Loading delivery history…" : "載入投遞紀錄中…"}</p>;
  if (error) return <p className="py-3 text-xs text-red-600">{toChineseError(error, isEnglish ? "Could not load delivery history." : "無法載入投遞紀錄。")}</p>;
  if (!data?.items.length) {
    return (
      <div className="mt-3 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {isEnglish ? "No deliveries yet." : "尚無投遞紀錄。"}
      </div>
    );
  }
  const succeeded = data.items.filter(item => item.ok).length;
  return (
    <div className="mt-3 border-t pt-3">
      <p className="mb-3 text-xs text-muted-foreground">
        {isEnglish ? `Last ${data.items.length} attempts · ${succeeded} delivered` : `最近 ${data.items.length} 次投遞 · 成功 ${succeeded} 次`}
      </p>
      <ol className="relative space-y-3 border-l border-border/70 pl-5">
        {data.items.map(item => (
          <li key={item.id} className="relative">
            <span className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${item.ok ? "bg-green-500" : "bg-red-500"}`} aria-hidden />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium">{eventLabel(item.event, isEnglish)}</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${item.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                {item.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {item.ok ? (isEnglish ? "Delivered" : "成功") : `${isEnglish ? "Failed" : "失敗"}${item.status_code ? ` · HTTP ${item.status_code}` : ""}`}
              </span>
              <time className="text-muted-foreground" dateTime={item.created_at}>{formatUtc(item.created_at, isEnglish)} UTC</time>
            </div>
            {!item.ok && item.error && <p className="mt-1 break-words text-[11px] text-red-600">{item.error}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function AdminWebhooks({ isEnglish }: { isEnglish: boolean }) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["admin-webhooks"],
    queryFn: fetchWebhooks,
    staleTime: 5_000,
  });
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<EventKey[]>(DEFAULT_EVENTS);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [shownSecret, setShownSecret] = useState("");
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [showVerify, setShowVerify] = useState(false);

  const items = data?.items ?? [];
  const enabledCount = items.filter(item => item.isEnabled).length;
  const subscribedEvents = new Set(items.flatMap(item => item.events)).size;

  const clearForm = () => {
    setName("");
    setUrl("");
    setEvents(DEFAULT_EVENTS);
    setEditingId(null);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    if (!name.trim()) {
      setNotice({ type: "error", text: isEnglish ? "Enter a webhook name." : "請輸入 Webhook 名稱。" });
      return;
    }
    if (!editingId && !url.trim()) {
      setNotice({ type: "error", text: isEnglish ? "Enter an HTTPS webhook URL." : "請輸入 HTTPS Webhook 網址。" });
      return;
    }
    if (!events.length) {
      setNotice({ type: "error", text: isEnglish ? "Select at least one event." : "請至少選擇一個事件。" });
      return;
    }
    setBusy("form");
    try {
      const payload: Record<string, unknown> = { name: name.trim(), events };
      if (url.trim()) payload.url = url.trim();
      const path = editingId ? `/api/admin/webhooks/${editingId}` : "/api/admin/webhooks";
      const response = await apiFetch(path, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readResponse<{ secret?: string }>(response);
      if (result.secret) setShownSecret(result.secret);
      setNotice({ type: "success", text: editingId ? (isEnglish ? "Webhook updated." : "Webhook 設定已更新。") : (isEnglish ? "Webhook created." : "Webhook 已建立。") });
      clearForm();
      await refetch();
    } catch (cause) {
      setNotice({ type: "error", text: toChineseError(cause, isEnglish ? "Could not save the webhook." : "無法儲存 Webhook。") });
    } finally {
      setBusy("");
    }
  };

  const runAction = async (id: number, action: string, path: string, init?: RequestInit) => {
    setNotice(null);
    setBusy(`${id}:${action}`);
    try {
      const result = await readResponse<Record<string, unknown>>(await apiFetch(path, init));
      if (action === "rotate" && typeof result.secret === "string") {
        setShownSecret(result.secret);
        setNotice({ type: "success", text: isEnglish ? "Secret rotated. Update the receiver now; the old secret will no longer work." : "簽章密鑰已輪替，請立即更新接收端設定；舊密鑰已失效。" });
      } else if (action === "test") {
        setNotice({ type: "success", text: isEnglish ? `Test delivery succeeded (HTTP ${String(result.statusCode)}).` : `測試通知已送達（HTTP ${String(result.statusCode)}）。` });
      } else {
        setNotice({ type: "success", text: action === "delete" ? (isEnglish ? "Webhook deleted." : "Webhook 已刪除。") : (isEnglish ? "Webhook updated." : "Webhook 狀態已更新。") });
      }
      await refetch();
    } catch (cause) {
      setNotice({ type: "error", text: toChineseError(cause, isEnglish ? "Webhook action failed." : "Webhook 操作失敗。") });
    } finally {
      setBusy("");
    }
  };

  const beginEdit = (item: WebhookItem) => {
    setEditingId(item.id);
    setName(item.name);
    setUrl("");
    setEvents(item.events);
    setNotice(null);
    setShownSecret("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(shownSecret);
      setNotice({ type: "success", text: isEnglish ? "Secret copied to clipboard." : "密鑰已複製到剪貼簿。" });
    } catch {
      setNotice({ type: "error", text: isEnglish ? "Clipboard access was blocked; select and copy the secret manually." : "無法存取剪貼簿，請手動選取並複製密鑰。" });
    }
  };

  return (
    <Card className="mt-8 border-border/60 bg-white">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-bold text-primary">
          <Webhook className="h-5 w-5" />
          {isEnglish ? "Vote webhooks" : "投票 Webhook"}
          <Badge variant="secondary" className="ml-1">{isEnglish ? "Tier 2+" : "二階管理員以上"}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isEnglish ? "Send signed HTTPS notifications whenever a vote is created, starts, nears its deadline or closes." : "投票建立、開始、即將截止、結束時，自動送出帶簽章的 HTTPS 通知。"}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <FlowStrip isEnglish={isEnglish} />

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile Icon={Webhook} label={isEnglish ? "Endpoints" : "端點數量"} value={`${items.length}/10`} />
          <StatTile Icon={Power} label={isEnglish ? "Enabled" : "啟用中"} value={String(enabledCount)} tone={enabledCount > 0 ? "green" : "default"} />
          <StatTile Icon={BellRing} label={isEnglish ? "Subscribed events" : "已訂閱事件"} value={`${subscribedEvents}/6`} tone={subscribedEvents > 0 ? "amber" : "default"} />
        </div>

        <details className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {isEnglish ? "How signing works" : "簽章與安全機制"}
          </summary>
          <div className="mt-2 space-y-2 text-xs leading-relaxed">
            <p>
              {isEnglish
                ? "Only HTTPS endpoints are accepted. The signing secret is shown once when created or rotated. Verify X-FUMO-Signature as the HMAC-SHA256 of `${X-FUMO-Timestamp}.${rawBody}` using that secret. Ballot notifications never include the selected options."
                : "僅接受 HTTPS 網址。簽章密鑰只在建立或輪替時顯示一次；以密鑰計算 `${X-FUMO-Timestamp}.${原始請求本文}` 的 HMAC-SHA256，並與 `X-FUMO-Signature` 比對。建議同時檢查時間戳有效期限，並用 `X-FUMO-Delivery` 防止重複處理。選票通知不含投票選項。"}
            </p>
            <p>{isEnglish ? "Payload includes a human-readable message and structured vote data. Some services may require a small adapter to map the fields they accept." : "Payload 同時包含可讀通知文字與結構化投票資料；不同平台接受的欄位可能不同，必要時需加一層格式轉換。"}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowVerify(current => !current)}>
              {showVerify ? (isEnglish ? "Hide verification sample" : "隱藏驗證範例") : (isEnglish ? "Show verification sample" : "顯示驗證範例")}
            </Button>
            {showVerify && <pre className="overflow-x-auto rounded-md bg-white p-3 font-mono text-[11px] leading-relaxed text-primary">{VERIFY_SAMPLE}</pre>}
          </div>
        </details>

        {notice && (
          <div role="status" className={`flex items-start gap-2 rounded-md border p-3 text-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
            {notice.type === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="break-words">{notice.text}</span>
          </div>
        )}

        {shownSecret && (
          <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <KeyRound className="h-4 w-4 shrink-0" />
              {isEnglish ? "Save this signing secret now — it will not be shown again." : "請立即保存此簽章密鑰，離開此提示後將不再顯示。"}
            </p>
            <code className="block break-all rounded bg-white p-3 font-mono text-xs">{shownSecret}</code>
            <Button type="button" size="sm" variant="outline" onClick={copySecret}><Copy className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Copy secret" : "複製密鑰"}</Button>
          </div>
        )}

        <form onSubmit={save} className="space-y-4 rounded-lg border border-border/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              {editingId ? (isEnglish ? "Edit webhook" : "編輯 Webhook") : (isEnglish ? "Add webhook" : "新增 Webhook")}
            </h3>
            {editingId && <Button type="button" size="sm" variant="ghost" onClick={clearForm}><X className="mr-1 h-4 w-4" />{isEnglish ? "Cancel" : "取消"}</Button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">{isEnglish ? "Name" : "名稱"}</span>
              <Input value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder={isEnglish ? "e.g. Discord #votes" : "例如：Discord 投票頻道"} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{isEnglish ? "HTTPS endpoint" : "HTTPS 端點網址"}</span>
              <Input type="url" value={url} onChange={event => setUrl(event.target.value)} maxLength={512} required={!editingId} placeholder={editingId ? (isEnglish ? "Optional: enter a replacement endpoint" : "選填：輸入新網址以替換端點，留空則不變") : "https://…"} />
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{isEnglish ? "Which events should it receive?" : "要接收哪些事件？"}</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {EVENT_OPTIONS.map(option => {
                const selected = events.includes(option.id);
                return (
                  <button
                    type="button"
                    key={option.id}
                    aria-pressed={selected}
                    onClick={() => setEvents(current => selected ? current.filter(value => value !== option.id) : [...current, option.id])}
                    className={`flex h-full items-start gap-3 rounded-lg border p-3 text-left transition ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60 bg-white hover:border-primary/40"}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <option.Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                        {isEnglish ? option.en : option.zh}
                        {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{isEnglish ? option.hintEn : option.hintZh}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isEnglish ? "“Ballot cast” is off by default; when enabled it reveals which country voted, never the option." : "「收到選票」預設不勾選；啟用後會顯示哪個國家已投票，但不會洩漏選項。"}
            </p>
          </fieldset>
          <Button type="submit" disabled={busy === "form"} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy === "form" ? (isEnglish ? "Saving…" : "儲存中…") : editingId ? (isEnglish ? "Save changes" : "儲存變更") : (isEnglish ? "Create webhook" : "建立 Webhook")}
          </Button>
        </form>

        <section aria-label={isEnglish ? "Configured webhooks" : "Webhook 清單"} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <Webhook className="h-4 w-4 text-primary" />
              {isEnglish ? "Configured endpoints" : "已設定端點"}
            </h3>
            <Button type="button" size="sm" variant="outline" onClick={() => void refetch()} disabled={isLoading}><RefreshCw className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Refresh" : "重新整理"}</Button>
          </div>
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{toChineseError(error, isEnglish ? "Could not load webhooks." : "無法載入 Webhook 清單。")}</p>}
          {isLoading && <p className="py-4 text-center text-sm text-muted-foreground">{isEnglish ? "Loading…" : "載入中…"}</p>}
          {!isLoading && !error && !items.length && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
              <Webhook className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{isEnglish ? "No webhook endpoints configured yet." : "尚未設定 Webhook 端點。"}</p>
            </div>
          )}
          {items.map(item => (
            <div key={item.id} className={`rounded-lg border border-border/70 border-l-4 bg-white p-4 ${item.isEnabled ? "border-l-green-500" : "border-l-gray-300"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.isEnabled ? "bg-green-500" : "bg-gray-300"}`} aria-hidden />
                    <span className="font-semibold break-words">{item.name}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${item.isEnabled ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                      {item.isEnabled ? (isEnglish ? "Enabled" : "啟用中") : (isEnglish ? "Disabled" : "已停用")}
                    </span>
                  </div>
                  <code className="flex items-center gap-1 break-all text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3 shrink-0" />
                    {item.url}
                  </code>
                  <div className="flex flex-wrap gap-1">
                    {item.events.map(value => {
                      const meta = eventMeta(value);
                      const Icon = meta?.Icon ?? BellRing;
                      return (
                        <span key={value} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px]">
                          <Icon className="h-3 w-3" />
                          {eventLabel(value, isEnglish)}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => void runAction(item.id, "test", `/api/admin/webhooks/${item.id}/test`, { method: "POST" })}><Send className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Test" : "測試"}</Button>
                  <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => beginEdit(item)}><Pencil className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Edit" : "編輯"}</Button>
                  <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => { if (window.confirm(isEnglish ? "The existing signing secret will stop working immediately. Continue?" : "舊簽章密鑰將立即失效，請確認接收端可同步更新。確定輪替？")) void runAction(item.id, "rotate", `/api/admin/webhooks/${item.id}/secret`, { method: "POST" }); }}><KeyRound className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Rotate secret" : "輪替密鑰"}</Button>
                  <label className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1 text-xs">
                    <Switch
                      checked={item.isEnabled}
                      disabled={!!busy}
                      onCheckedChange={checked => void runAction(item.id, "toggle", `/api/admin/webhooks/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isEnabled: checked }) })}
                      aria-label={isEnglish ? `Toggle ${item.name}` : `切換 ${item.name}`}
                    />
                    {item.isEnabled ? (isEnglish ? "On" : "啟用") : (isEnglish ? "Off" : "停用")}
                  </label>
                  <Button type="button" size="sm" variant="outline" disabled={!!busy} className="text-red-700 hover:text-red-800" onClick={() => { if (window.confirm(isEnglish ? `Delete webhook “${item.name}” and its delivery history?` : `確定刪除「${item.name}」及其投遞紀錄？`)) void runAction(item.id, "delete", `/api/admin/webhooks/${item.id}`, { method: "DELETE" }); }}><Trash2 className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Delete" : "刪除"}</Button>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" className="mt-2 px-0" onClick={() => setHistoryId(current => current === item.id ? null : item.id)}>
                <Activity className="mr-1 h-3.5 w-3.5" />
                {historyId === item.id ? (isEnglish ? "Hide delivery history" : "隱藏投遞紀錄") : (isEnglish ? "Show delivery history" : "查看投遞紀錄")}
              </Button>
              {historyId === item.id && <DeliveryTimeline webhookId={item.id} isEnglish={isEnglish} />}
            </div>
          ))}
        </section>
      </CardContent>
    </Card>
  );
}
