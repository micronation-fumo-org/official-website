import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bot, CheckCircle2, LogIn, Megaphone, RefreshCw, ShieldAlert } from "lucide-react";
import { fetchBotChannels, fetchBotRoles, fetchBotStatus, sendBotAnnouncement, type BotAnnouncementMode } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import "./css/styles.css";

export default function BotAdmin() {
  const { user, isAdmin } = useAuth();
  const [channelId, setChannelId] = useState("");
  const [announcementMode, setAnnouncementMode] = useState<BotAnnouncementMode>("embed");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("FUMO 官方網站 Bot");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const channels = useQuery({ queryKey: ["bot-channels", user?.voterId], queryFn: fetchBotChannels, enabled: isAdmin, staleTime: 15_000 });
  const roles = useQuery({ queryKey: ["bot-roles", user?.voterId], queryFn: fetchBotRoles, enabled: isAdmin, staleTime: 15_000 });
  const status = useQuery({ queryKey: ["bot-status", user?.voterId], queryFn: fetchBotStatus, enabled: isAdmin, refetchInterval: 30_000 });
  const supportsTextAnnouncements = status.data?.apiFeatures?.announcementMode === true && status.data?.features?.announcementText === true;

  const publish = async () => {
    setNotice(null);
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (!channelId || !cleanContent || (announcementMode === "embed" && !cleanTitle)) {
      setNotice({ ok: false, text: announcementMode === "embed" ? "請選擇頻道並填寫公告標題與內容。" : "請選擇頻道並填寫公告內容。" });
      return;
    }
    if (announcementMode === "text" && !supportsTextAnnouncements) {
      setNotice({ ok: false, text: "目前網站 API 與 Discord Bot 尚未同時支援純文字公告；請先完成 Worker 與 Bot runtime 更新。" });
      return;
    }
    const roleMentions = selectedRoleIds.map(roleId => `<@&${roleId}>`).join(" ");
    const plainText = [roleMentions, cleanTitle, cleanContent].filter(Boolean).join("\n\n");
    if (announcementMode === "text" && plainText.length > 2000) {
      setNotice({ ok: false, text: "純文字公告超過 Discord 的 2,000 字元限制，請縮短標題、內容或提及設定。" });
      return;
    }
    try {
      const result = await sendBotAnnouncement({ channelId, mode: announcementMode, title: cleanTitle, content: cleanContent, roleIds: selectedRoleIds, author: author.trim() });
      setNotice({ ok: true, text: result.messageUrl ? `公告已發布：${result.messageUrl}` : "公告已發布。" });
      setTitle("");
      setContent("");
      setSelectedRoleIds([]);
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : "公告發布失敗。" });
    }
  };

  if (!isAdmin) {
    return <div className="min-h-screen bg-muted/20 py-12"><div className="container mx-auto max-w-lg px-4"><Card><CardHeader><h1 className="flex items-center gap-2 text-lg font-semibold text-primary"><ShieldAlert className="h-5 w-5" />Bot 管理後台</h1></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{user ? "您沒有管理員權限。" : "請先登入管理員帳戶。"}</p>{!user && <Link href="/login"><Button className="w-full"><LogIn className="mr-2 h-4 w-4" />前往登入</Button></Link>}</CardContent></Card></div></div>;
  }

  const channelOptions = channels.data?.channels ?? [];
  const roleOptions = roles.data?.roles ?? [];
  const selectedRoles = roleOptions.filter(role => selectedRoleIds.includes(role.id));
  const plainTextPreview = [selectedRoleIds.map(roleId => `<@&${roleId}>`).join(" "), title.trim(), content.trim()].filter(Boolean).join("\n\n");
  return <div className="min-h-screen bg-muted/20 py-10"><div className="container mx-auto max-w-4xl space-y-6 px-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-primary"><Bot className="h-6 w-6" />Discord Bot 管理後台</h1><p className="mt-1 text-sm text-muted-foreground">使用 FUMO 官方機器人發佈 Discord 公告。</p></div><Button variant="outline" onClick={() => { channels.refetch(); roles.refetch(); status.refetch(); }}><RefreshCw className="mr-2 h-4 w-4" />重新整理</Button></div>
    <Card><CardContent className="flex flex-wrap items-center gap-3 pt-6 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${status.data?.bot ? "bg-green-500" : "bg-red-500"}`} /><span>Bot 狀態：{status.isLoading ? "檢查中" : status.data?.bot ? "線上" : "離線"}</span><span className="text-muted-foreground">可用頻道：{channelOptions.length}</span><span className="text-muted-foreground">可選身分組：{roleOptions.length}</span>{status.error && <span className="text-red-600">{status.error.message}</span>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />發布公告</CardTitle></CardHeader><CardContent className="space-y-4">
      <label className="block text-sm font-medium">Discord 頻道<select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={channelId} onChange={event => setChannelId(event.target.value)}><option value="">請選擇頻道</option>{channelOptions.map(channel => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}</select></label>
      <label className="block text-sm font-medium">公告格式<select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={announcementMode} onChange={event => setAnnouncementMode(event.target.value as BotAnnouncementMode)}><option value="embed">視覺化 Embed（原格式）</option><option value="text">純文字訊息</option></select></label>
      <label className="block text-sm font-medium">公告標題{announcementMode === "embed" ? "（必填）" : "（可留空）"}<Input className="mt-1" maxLength={256} value={title} onChange={event => setTitle(event.target.value)} placeholder="例如：FUMO 第十次例行大會公告" /></label>
      <label className="block text-sm font-medium">公告內容<Textarea className="mt-1 min-h-36" maxLength={1900} value={content} onChange={event => setContent(event.target.value)} placeholder="輸入公告內容" /></label>
      <fieldset className="space-y-2" aria-busy={roles.isLoading}>
        <legend className="text-sm font-medium">本次公告提及身分組（可多選）</legend>
        <p className="text-xs text-muted-foreground">選取只套用於這則網站公告，不會更動 slash 公告或自動投票通知設定。</p>
        {roles.isLoading ? <p className="text-sm text-muted-foreground">正在載入身分組…</p> : roles.error ? <p className="text-sm text-red-600" role="alert">{roles.error.message}</p> : roleOptions.length === 0 ? <p className="text-sm text-muted-foreground">目前沒有可選身分組。</p> : (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
            {roleOptions.map(role => <label key={role.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"><input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={selectedRoleIds.includes(role.id)} onChange={event => setSelectedRoleIds(current => event.target.checked ? [...current, role.id] : current.filter(roleId => roleId !== role.id))} aria-label={`提及身分組 ${role.name}`} /><span className="min-w-0"><span className="font-medium">{role.name}</span><span className="ml-2 break-all text-xs text-muted-foreground">{role.id}</span></span></label>)}
          </div>
        )}
        <p className="text-xs text-muted-foreground">已選 {selectedRoleIds.length} 個身分組；留空則不提及任何身分組。</p>
      </fieldset>
      {announcementMode === "embed" && <label className="block text-sm font-medium">發布者顯示名稱<Input className="mt-1" maxLength={80} value={author} onChange={event => setAuthor(event.target.value)} placeholder="FUMO 官方網站 Bot" /></label>}
      {announcementMode === "embed" ? (
        <div className="rounded-md border bg-muted/30 p-4"><p className="mb-2 text-xs font-semibold text-muted-foreground">Embed 預覽</p><p className="font-semibold">📢 {title || "公告標題"}</p><p className="mt-2 whitespace-pre-wrap text-sm">{content || "公告內容預覽"}</p><p className="mt-3 text-xs text-muted-foreground">{selectedRoles.length ? `提及：${selectedRoles.map(role => `@${role.name}`).join("、")}` : "本公告不提及身分組"}</p></div>
      ) : (
        <div className="rounded-md border bg-muted/30 p-4"><p className="mb-2 text-xs font-semibold text-muted-foreground">純文字預覽</p><p className="whitespace-pre-wrap break-words text-sm">{plainTextPreview || "公告內容預覽"}</p></div>
      )}
      {announcementMode === "text" && !status.isLoading && status.data?.bot && !supportsTextAnnouncements && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">目前網站 API 與連線中的 Bot 尚未同時回報純文字支援；需部署新版 API Worker，並將 repo 中的 Bot 更新部署至 Wispbyte，啟用後此選項才會生效。</div>}
      {notice && <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${notice.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}{notice.text}</div>}
      <Button onClick={publish} disabled={channels.isLoading || roles.isLoading || Boolean(roles.error) || !status.data?.bot || (announcementMode === "text" && !supportsTextAnnouncements)}><Megaphone className="mr-2 h-4 w-4" />發布到 Discord</Button>
    </CardContent></Card>
  </div></div>;
}
