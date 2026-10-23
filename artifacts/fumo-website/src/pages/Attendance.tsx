import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, ClipboardCheck, LogIn, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiFetch } from "@/lib/api";
import { toChineseError } from "@/lib/errorMessage";

interface AttendanceRecord {
  countryName: string;
  status: "member" | "observer";
  attendedAt: string;
}

interface AttendanceSession {
  id: number;
  title: string;
  eventDate: string | null;
  isOpen: boolean;
  createdAt: string;
  total: number;
  memberCount: number;
  observerCount: number;
  hasAttended: boolean;
}

interface AttendanceSessionDetail extends AttendanceSession {
  memberStates: AttendanceRecord[];
  observerStates: AttendanceRecord[];
  canAttend: boolean;
  countryStatus: "member" | "observer" | null;
  myAttendance: AttendanceRecord | null;
}

async function loadSessions(): Promise<AttendanceSession[]> {
  const response = await apiFetch("/api/attendance/sessions");
  if (!response.ok) throw new Error("載入出席場次失敗。");
  const data = await response.json();
  return data.sessions;
}

async function loadSession(id: number): Promise<AttendanceSessionDetail> {
  const response = await apiFetch(`/api/attendance/sessions/${id}`);
  if (!response.ok) throw new Error("載入場次簽到名單失敗。");
  return response.json();
}

function formatDate(value: string | null, isEnglish: boolean) {
  if (!value) return isEnglish ? "Date not set" : "未設定日期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(isEnglish ? "en-US" : "zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

export default function Attendance() {
  const { user, isAdmin } = useAuth();
  const { isEnglish } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["attendance-sessions"],
    queryFn: loadSessions,
    refetchInterval: 15_000,
  });
  const selectedQuery = useQuery({
    queryKey: ["attendance-session", selectedId],
    queryFn: () => loadSession(selectedId!),
    enabled: selectedId !== null,
    refetchInterval: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/api/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), eventDate: eventDate ? new Date(eventDate).toISOString() : null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "建立出席場次失敗。");
      return data as { id: number };
    },
    onSuccess: async (data) => {
      setTitle("");
      setEventDate("");
      setFormError(null);
      setSelectedId(data.id);
      await queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] });
    },
    onError: (error: Error) => setFormError(toChineseError(error)),
  });

  const checkInMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/api/attendance/sessions/${id}/check-in`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "登記出席失敗。");
    },
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-session", selectedId] }),
      ]);
    },
    onError: (error: Error) => setActionError(toChineseError(error)),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isOpen }: { id: number; isOpen: boolean }) => {
      const response = await apiFetch(`/api/attendance/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "更新場次狀態失敗。");
    },
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-session", selectedId] }),
      ]);
    },
    onError: (error: Error) => setActionError(toChineseError(error)),
  });

  const sessions = sessionsQuery.data ?? [];
  const detail = selectedQuery.data;
  const sessionStateLabel = (open: boolean) => open
    ? (isEnglish ? "Check-in open" : "簽到開放中")
    : (isEnglish ? "Closed" : "已關閉");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-7 flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary"><ClipboardCheck className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-primary sm:text-3xl">{isEnglish ? "Attendance" : "出席簽到"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isEnglish ? "Attendance sessions are independent from ballots. Each member or observer state may check in once per session." : "出席場次與投票議案分開管理；成員國與觀察國每場各可簽到一次，不會產生或影響選票。"}</p>
        </div>
      </div>

      {isAdmin && (
        <Card className="mb-6 border-primary/15">
          <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
            <CardTitle className="text-base text-primary">{isEnglish ? "Create an attendance session" : "建立出席場次"}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:px-6 sm:pb-6">
            <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)_auto]" onSubmit={(event) => { event.preventDefault(); if (!title.trim()) { setFormError(isEnglish ? "Enter a session name." : "請輸入場次名稱。"); return; } createMutation.mutate(); }}>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder={isEnglish ? "Session name (e.g. 43rd Regular Assembly)" : "場次名稱（例如：第 43 次例行大會）"} aria-label={isEnglish ? "Session name" : "場次名稱"} />
              <Input type="datetime-local" value={eventDate} onChange={(event) => setEventDate(event.target.value)} aria-label={isEnglish ? "Session date and time" : "場次日期與時間"} />
              <Button type="submit" className="min-h-11" disabled={createMutation.isPending}>{createMutation.isPending ? (isEnglish ? "Creating…" : "建立中…") : (isEnglish ? "Create session" : "建立場次")}</Button>
            </form>
            {formError && <p className="mt-2 text-sm text-red-600" role="alert">{formError}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.4fr)]">
        <section aria-label={isEnglish ? "Attendance sessions" : "出席場次清單"}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-primary">{isEnglish ? "Sessions" : "場次"}</h2>
            <Badge variant="secondary">{sessions.length}</Badge>
          </div>
          {sessionsQuery.isLoading ? (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">{isEnglish ? "Loading sessions…" : "載入場次中…"}</CardContent></Card>
          ) : sessionsQuery.isError ? (
            <Card><CardContent className="p-4 text-sm text-red-600">{toChineseError(sessionsQuery.error)}</CardContent></Card>
          ) : sessions.length === 0 ? (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">{isEnglish ? "No attendance sessions yet." : "目前尚無出席場次。"}{isAdmin ? (isEnglish ? " Create one above." : "可使用上方表單建立。") : ""}</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Card key={session.id} className={`transition-colors ${selectedId === session.id ? "border-primary ring-1 ring-primary/20" : "border-border/70"}`}>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-primary">{session.title}</h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{formatDate(session.eventDate, isEnglish)}</p>
                      </div>
                      <Badge variant={session.isOpen ? "default" : "secondary"} className="shrink-0">{sessionStateLabel(session.isOpen)}</Badge>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{isEnglish ? `${session.total} states` : `${session.total} 國`}</span>
                      <span>{isEnglish ? `Members ${session.memberCount}` : `成員國 ${session.memberCount}`}</span>
                      <span>{isEnglish ? `Observers ${session.observerCount}` : `觀察國 ${session.observerCount}`}</span>
                    </div>
                    <Button variant={selectedId === session.id ? "secondary" : "outline"} className="min-h-10 w-full" onClick={() => { setSelectedId(session.id); setActionError(null); }}>
                      {selectedId === session.id ? (isEnglish ? "Selected" : "目前場次") : (isEnglish ? "View and check in" : "查看名單／簽到")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section aria-label={isEnglish ? "Session attendance details" : "場次出席明細"}>
          {!selectedId ? (
            <Card className="h-full min-h-48 border-dashed">
              <CardContent className="flex h-full min-h-48 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                <Users className="h-7 w-7" />
                <p className="text-sm">{isEnglish ? "Select a session to see the attendance roster." : "選擇左側場次，即可查看出席名單或登記簽到。"}</p>
              </CardContent>
            </Card>
          ) : selectedQuery.isLoading ? (
            <Card><CardContent className="p-5 text-sm text-muted-foreground">{isEnglish ? "Loading roster…" : "載入簽到名單中…"}</CardContent></Card>
          ) : selectedQuery.isError ? (
            <Card><CardContent className="p-5 text-sm text-red-600">{toChineseError(selectedQuery.error)}</CardContent></Card>
          ) : detail ? (
            <Card className="border-border/70">
              <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="break-words text-lg text-primary">{detail.title}</CardTitle>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 shrink-0" />{formatDate(detail.eventDate, isEnglish)}</p>
                  </div>
                  <Badge variant={detail.isOpen ? "default" : "secondary"}>{sessionStateLabel(detail.isOpen)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0 sm:px-6 sm:pb-6">
                {user ? (
                  detail.canAttend ? (
                    <div className="flex flex-col gap-3 rounded-md border border-primary/15 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-primary">{user.countryName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{detail.countryStatus === "member" ? (isEnglish ? "Member state" : "成員國") : (isEnglish ? "Observer state" : "觀察國")}</p>
                      </div>
                      {detail.myAttendance ? (
                        <Badge className="w-fit gap-1 bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3.5 w-3.5" />{isEnglish ? "Attendance recorded" : "已完成簽到"}</Badge>
                      ) : detail.isOpen ? (
                        <Button className="min-h-11 w-full sm:w-auto" onClick={() => checkInMutation.mutate(detail.id)} disabled={checkInMutation.isPending}>{checkInMutation.isPending ? (isEnglish ? "Checking in…" : "簽到中…") : (isEnglish ? "Confirm attendance" : "確認出席簽到")}</Button>
                      ) : (
                        <Badge variant="secondary">{isEnglish ? "Check-in is closed" : "簽到已關閉"}</Badge>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{isEnglish ? "This account is not associated with a member or observer state." : "此帳戶未關聯至成員國或觀察國，無法簽到。"}</p>
                  )
                ) : (
                  <div className="flex min-w-0 items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 sm:p-4">
                    <LogIn className="h-5 w-5 shrink-0 text-amber-600" />
                    <p className="min-w-0 text-sm text-amber-800">{isEnglish ? "Sign in with a member or observer state account to check in." : "請先登入成員國或觀察國帳戶以簽到。"} <Link href="/login" className="font-medium underline">{isEnglish ? "Sign in" : "登入"}</Link></p>
                  </div>
                )}
                {actionError && <p className="text-sm text-red-600" role="alert">{actionError}</p>}
                {isAdmin && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                    <p className="text-sm text-muted-foreground">{isEnglish ? "Session control" : "場次管理"}</p>
                    <Button variant={detail.isOpen ? "outline" : "default"} className="min-h-10" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate({ id: detail.id, isOpen: !detail.isOpen })}>
                      {detail.isOpen ? (isEnglish ? "Close check-in" : "關閉簽到") : (isEnglish ? "Reopen check-in" : "重新開放簽到")}
                    </Button>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    { key: "member" as const, title: isEnglish ? "Member states" : "成員國", records: detail.memberStates, style: "border-blue-200 bg-blue-50/70" },
                    { key: "observer" as const, title: isEnglish ? "Observer states" : "觀察國", records: detail.observerStates, style: "border-violet-200 bg-violet-50/70" },
                  ]).map((group) => (
                    <section key={group.key} className={`rounded-md border p-3 ${group.style}`}>
                      <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-primary">{group.title}</h3><Badge variant="secondary">{group.records.length}</Badge></div>
                      {group.records.length ? (
                        <ul className="space-y-2">
                          {group.records.map((record) => (
                            <li key={record.countryName} className="flex min-w-0 items-center justify-between gap-2 rounded bg-white/80 px-2.5 py-2 text-sm">
                              <span className="min-w-0 break-words font-medium">{record.countryName}</span>
                              <time className="shrink-0 text-xs text-muted-foreground" dateTime={record.attendedAt}>{new Date(record.attendedAt.endsWith("Z") ? record.attendedAt : `${record.attendedAt.replace(" ", "T")}Z`).toLocaleTimeString(isEnglish ? "en-US" : "zh-TW", { hour: "2-digit", minute: "2-digit" })}</time>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-xs text-muted-foreground">{isEnglish ? "No states checked in." : "尚無國家簽到。"}</p>}
                    </section>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{isEnglish ? `${detail.total} states present · one check-in per state` : `共 ${detail.total} 國簽到・每場每國限一次`}</p>
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  );
}
