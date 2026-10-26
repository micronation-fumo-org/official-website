import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bot, CheckCircle2, LogIn, Megaphone, RefreshCw, ShieldAlert } from "lucide-react";
import { fetchBotChannels, fetchBotStatus, sendBotAnnouncement } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function BotAdmin() {
  const { user, isAdmin } = useAuth();
  const [channelId, setChannelId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("FUMO 官方網站 Bot");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const channels = useQuery({ queryKey: ["bot-channels", user?.voterId], queryFn: fetchBotChannels, enabled: isAdmin, staleTime: 15_000 });
  const status = useQuery({ queryKey: ["bot-status", user?.voterId], queryFn: fetchBotStatus, enabled: isAdmin, refetchInterval: 30_000 });

  const publish = async () => {
    setNotice(null);
    if (!channelId || !title.trim() || !content.trim()) {
      setNotice({ ok: false, text: "請選擇頻道並填寫公告標題與內容。" });
      return;
    }
    try {
      const result = await sendBotAnnouncement({ channelId, title: title.trim(), content: content.trim(), roleId: roleId.trim(), author: author.trim() });
      setNotice({ ok: true, text: result.messageUrl ? `公告已發布：${result.messageUrl}` : "公告已發布。" });
      setTitle(""); setContent("");
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : "公告發布失敗。" });
    }
  };

  if (!isAdmin) {
    return <div className="min-h-screen bg-muted/20 py-12"><div className="container mx-auto max-w-lg px-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />Bot 管理後台</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{user ? "您沒有管理員權限。" : "請先登入管理員帳戶。"}</p>{!user && <Link href="/login"><Button className="w-full"><LogIn className="mr-2 h-4 w-4" />前往登入</Button></Link>}</CardContent></Card></div></div>;
  }

  const channelOptions = channels.data?.channels ?? [];
  return <div className="min-h-screen bg-muted/20 py-10"><div className="container mx-auto max-w-4xl space-y-6 px-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-primary"><Bot className="h-6 w-6" />Discord Bot 管理後台</h1><p className="mt-1 text-sm text-muted-foreground">使用 FUMO 官方機器人發佈 Discord 公告。</p></div><Button variant="outline" onClick={() => { channels.refetch(); status.refetch(); }}><RefreshCw className="mr-2 h-4 w-4" />重新整理</Button></div>
    <Card><CardContent className="flex flex-wrap items-center gap-3 pt-6 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${status.data?.bot ? "bg-green-500" : "bg-red-500"}`} /><span>Bot 狀態：{status.isLoading ? "檢查中" : status.data?.bot ? "線上" : "離線"}</span><span className="text-muted-foreground">可用頻道：{channelOptions.length}</span>{status.error && <span className="text-red-600">{status.error.message}</span>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />發布公告</CardTitle></CardHeader><CardContent className="space-y-4">
      <label className="block text-sm font-medium">Discord 頻道<select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={channelId} onChange={event => setChannelId(event.target.value)}><option value="">請選擇頻道</option>{channelOptions.map(channel => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}</select></label>
      <label className="block text-sm font-medium">公告標題<Input className="mt-1" maxLength={256} value={title} onChange={event => setTitle(event.target.value)} placeholder="例如：FUMO 第十次例行大會公告" /></label>
      <label className="block text-sm font-medium">公告內容<Textarea className="mt-1 min-h-36" maxLength={1900} value={content} onChange={event => setContent(event.target.value)} placeholder="輸入公告內容" /></label>
      <label className="block text-sm font-medium">提及身分組 ID（可留空）<Input className="mt-1" value={roleId} onChange={event => setRoleId(event.target.value)} placeholder="例如：1248257759195955343" /></label>
      <label className="block text-sm font-medium">發布者顯示名稱<Input className="mt-1" maxLength={80} value={author} onChange={event => setAuthor(event.target.value)} placeholder="FUMO 官方網站 Bot" /></label>
      <div className="rounded-md border bg-muted/30 p-4"><p className="mb-2 text-xs font-semibold text-muted-foreground">預覽</p><p className="font-semibold">📢 {title || "公告標題"}</p><p className="mt-2 whitespace-pre-wrap text-sm">{content || "公告內容預覽"}</p></div>
      {notice && <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${notice.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}{notice.text}</div>}
      <Button onClick={publish} disabled={channels.isLoading || !status.data?.bot}><Megaphone className="mr-2 h-4 w-4" />發布到 Discord</Button>
    </CardContent></Card>
  </div></div>;
}
