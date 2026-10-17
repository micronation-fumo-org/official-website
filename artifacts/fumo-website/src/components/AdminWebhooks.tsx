import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Copy, KeyRound, Pencil, RefreshCw, Send, ShieldCheck, Trash2, Webhook, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toChineseError } from "@/lib/errorMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type EventKey = "vote.created" | "vote.published" | "vote.started" | "vote.closing_soon" | "vote.closed" | "ballot.cast";
interface WebhookItem {
  id: number;
  name: string;
  /** Server masks the endpoint path because it may contain a bearer token. */
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

const EVENT_OPTIONS: { id: EventKey; zh: string; en: string }[] = [
  { id: "vote.created", zh: "投票建立", en: "Vote created" },
  { id: "vote.published", zh: "草稿發布", en: "Draft published" },
  { id: "vote.started", zh: "投票開始", en: "Voting started" },
  { id: "vote.closing_soon", zh: "即將截止（24 小時內）", en: "Closing soon (within 24 hours)" },
  { id: "vote.closed", zh: "投票結束", en: "Vote closed" },
  { id: "ballot.cast", zh: "收到選票（不含選項）", en: "Ballot cast (no choices)" },
];
const DEFAULT_EVENTS: EventKey[] = ["vote.created", "vote.published", "vote.started", "vote.closing_soon", "vote.closed"];

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

function eventLabel(event: string, isEnglish: boolean) {
  const option = EVENT_OPTIONS.find(item => item.id === event);
  if (option) return isEnglish ? option.en : option.zh;
  if (event === "webhook.test") return isEnglish ? "Test" : "測試通知";
  return event;
}

function DeliveryHistory({ webhookId, isEnglish }: { webhookId: number; isEnglish: boolean }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin-webhook-deliveries", webhookId],
    queryFn: () => fetchDeliveries(webhookId),
    staleTime: 5_000,
  });
  if (isLoading) return <p className="py-3 text-xs text-muted-foreground">{isEnglish ? "Loading delivery history…" : "載入投遞紀錄中…"}</p>;
  if (error) return <p className="py-3 text-xs text-red-600">{toChineseError(error, isEnglish ? "Could not load delivery history." : "無法載入投遞紀錄。")}</p>;
  if (!data?.items.length) return <p className="py-3 text-xs text-muted-foreground">{isEnglish ? "No deliveries yet." : "尚無投遞紀錄。"}</p>;
  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      {data.items.map(item => (
        <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium">{eventLabel(item.event, isEnglish)}</span>
          <span className={item.ok ? "text-green-700" : "text-red-700"}>
            {item.ok ? (isEnglish ? "Delivered" : "成功") : `${isEnglish ? "Failed" : "失敗"}${item.status_code ? ` · HTTP ${item.status_code}` : ""}${item.error ? ` · ${item.error}` : ""}`}
          </span>
          <time className="text-muted-foreground" dateTime={item.created_at}>{item.created_at} UTC</time>
        </div>
      ))}
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
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-primary">
          <Webhook className="h-5 w-5" />
          {isEnglish ? "Vote webhooks" : "投票 Webhook"}
          <Badge variant="secondary" className="ml-1">{isEnglish ? "Tier 2+" : "二階管理員以上"}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isEnglish ? "Send signed HTTPS notifications for vote lifecycle events. Up to 10 endpoints." : "投票建立、開始、即將截止、結束等事件可傳送簽章 HTTPS 通知；最多 10 個端點。"}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {isEnglish
                ? "Only HTTPS endpoints are accepted. The signing secret is shown only once. Verify X-FUMO-Signature as HMAC-SHA256 of `${timestamp}.${rawBody}` using X-FUMO-Timestamp. Ballot notifications never include selected options."
                : "僅接受 HTTPS 網址。簽章密鑰只會顯示一次；以密鑰驗證 `X-FUMO-Signature`，簽章內容為 `${X-FUMO-Timestamp}.${原始請求本文}` 的 HMAC-SHA256。選票通知不會包含投票選項。"}
            </p>
          </div>
        </div>

        {notice && (
          <div role="status" className={`flex items-start gap-2 rounded-md border p-3 text-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
            {notice.type === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="break-words">{notice.text}</span>
          </div>
        )}

        {shownSecret && (
          <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">{isEnglish ? "Save this signing secret now — it will not be shown again." : "請立即保存此簽章密鑰，離開此提示後將不會再次顯示。"}</p>
            <code className="block break-all rounded bg-white p-2 font-mono text-xs">{shownSecret}</code>
            <Button type="button" size="sm" variant="outline" onClick={copySecret}><Copy className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Copy secret" : "複製密鑰"}</Button>
          </div>
        )}

        <form onSubmit={save} className="space-y-4 rounded-lg border border-border/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{editingId ? (isEnglish ? "Edit webhook" : "編輯 Webhook") : (isEnglish ? "Add webhook" : "新增 Webhook")}</h3>
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
            <legend className="mb-2 text-sm font-medium">{isEnglish ? "Events" : "通知事件"}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {EVENT_OPTIONS.map(option => (
                <label key={option.id} className="flex items-start gap-2 rounded-md border border-border/60 p-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={events.includes(option.id)}
                    onChange={event => setEvents(current => event.target.checked ? [...current, option.id] : current.filter(value => value !== option.id))}
                  />
                  <span>{isEnglish ? option.en : option.zh}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isEnglish ? "Ballot cast is opt-in and may reveal which country has voted, but never the selected option." : "「收到選票」預設不勾選；啟用後會通知哪個國家已投票，但不會洩漏選項。"}
            </p>
          </fieldset>
          <Button type="submit" disabled={busy === "form"} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy === "form" ? (isEnglish ? "Saving…" : "儲存中…") : editingId ? (isEnglish ? "Save changes" : "儲存變更") : (isEnglish ? "Create webhook" : "建立 Webhook")}
          </Button>
        </form>

        <section aria-label={isEnglish ? "Configured webhooks" : "Webhook 清單"} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{isEnglish ? "Configured endpoints" : "已設定端點"} <span className="text-sm font-normal text-muted-foreground">({data?.items.length ?? 0}/10)</span></h3>
            <Button type="button" size="sm" variant="outline" onClick={() => void refetch()} disabled={isLoading}><RefreshCw className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Refresh" : "重新整理"}</Button>
          </div>
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{toChineseError(error, isEnglish ? "Could not load webhooks." : "無法載入 Webhook 清單。")}</p>}
          {isLoading && <p className="py-4 text-center text-sm text-muted-foreground">{isEnglish ? "Loading…" : "載入中…"}</p>}
          {!isLoading && !error && !data?.items.length && <p className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">{isEnglish ? "No webhook endpoints configured." : "尚未設定 Webhook 端點。"}</p>}
          {data?.items.map(item => (
            <div key={item.id} className="rounded-lg border border-border/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold break-words">{item.name}</span>
                    <Badge variant={item.isEnabled ? "default" : "secondary"}>{item.isEnabled ? (isEnglish ? "Enabled" : "啟用中") : (isEnglish ? "Disabled" : "已停用")}</Badge>
                  </div>
                  <code className="block break-all text-xs text-muted-foreground">{item.url}</code>
                  <div className="flex flex-wrap gap-1 pt-1">{item.events.map(value => <Badge key={value} variant="outline" className="text-xs">{eventLabel(value, isEnglish)}</Badge>)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => void runAction(item.id, "test", `/api/admin/webhooks/${item.id}/test`, { method: "POST" })}><Send className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Test" : "測試"}</Button>
                  <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => beginEdit(item)}><Pencil className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Edit" : "編輯"}</Button>
                  <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => { if (window.confirm(isEnglish ? "The existing signing secret will stop working immediately. Continue?" : "舊簽章密鑰將立即失效，請確認接收端可同步更新。確定輪替？")) void runAction(item.id, "rotate", `/api/admin/webhooks/${item.id}/secret`, { method: "POST" }); }}><KeyRound className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Rotate secret" : "輪替密鑰"}</Button>
                  <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => void runAction(item.id, "toggle", `/api/admin/webhooks/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isEnabled: !item.isEnabled }) })}>{item.isEnabled ? (isEnglish ? "Disable" : "停用") : (isEnglish ? "Enable" : "啟用")}</Button>
                  <Button type="button" size="sm" variant="outline" disabled={!!busy} className="text-red-700 hover:text-red-800" onClick={() => { if (window.confirm(isEnglish ? `Delete webhook “${item.name}” and its delivery history?` : `確定刪除「${item.name}」及其投遞紀錄？`)) void runAction(item.id, "delete", `/api/admin/webhooks/${item.id}`, { method: "DELETE" }); }}><Trash2 className="mr-1 h-3.5 w-3.5" />{isEnglish ? "Delete" : "刪除"}</Button>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" className="mt-2 px-0" onClick={() => setHistoryId(current => current === item.id ? null : item.id)}>
                {historyId === item.id ? (isEnglish ? "Hide delivery history" : "隱藏投遞紀錄") : (isEnglish ? "Show delivery history" : "查看投遞紀錄")}
              </Button>
              {historyId === item.id && <DeliveryHistory webhookId={item.id} isEnglish={isEnglish} />}
            </div>
          ))}
        </section>
      </CardContent>
    </Card>
  );
}
