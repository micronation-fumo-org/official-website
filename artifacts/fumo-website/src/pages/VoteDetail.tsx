import { toChineseError } from "@/lib/errorMessage";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Vote, CheckCircle2, Users, AlertTriangle, XCircle, LogIn, Trash2, Globe2, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { applySeoMetadata } from "@/lib/seo";

interface VoteDetail {
  id: number;
  customId: string | null;
  publicId: string;
  regularMeetingNumber: number | null;
  startsAt: string | null;
  name: string;
  description: string;
  deadline: string;
  options: string[];
  allowMultiple: boolean;
  isClosed: boolean;
  isExpired: boolean;
  isPublished: boolean;
  isUpcoming: boolean;
  ballotCount: number;
  ballots: any[];
}

interface ResultItem {
  option: string;
  count: number;
  percentage: string;
  weightedCount: number;
  weightedPercentage: string;
  voters: string[];
}

interface CountryVote {
  countryName: string;
  selectedOptions: string[];
  votedAt: string;
}

interface ResultsData {
  voteId: number;
  voteName: string;
  totalVoters: number;
  isClosed: boolean;
  isExpired: boolean;
  results: ResultItem[];
  countryVotes?: CountryVote[];
}

interface AttendanceRecord {
  countryName: string;
  status: "member" | "observer";
  attendedAt: string;
}

interface AttendanceData {
  total: number;
  memberStates: AttendanceRecord[];
  observerStates: AttendanceRecord[];
  canAttend: boolean;
  countryStatus: "member" | "observer" | null;
  myAttendance: AttendanceRecord | null;
}

async function fetchVoteDetail(id: string): Promise<VoteDetail> {
  const res = await apiFetch(`/api/votes/${id}`);
  if (!res.ok) throw new Error("載入投票資料失敗。");
  return res.json();
}

async function fetchResults(id: string): Promise<ResultsData> {
  const res = await apiFetch(`/api/votes/${id}/results`);
  if (!res.ok) throw new Error("載入投票結果失敗。");
  return res.json();
}

async function fetchAttendance(id: string): Promise<AttendanceData> {
  const res = await apiFetch(`/api/votes/${id}/attendance`);
  if (!res.ok) throw new Error("載入出席紀錄失敗。");
  return res.json();
}

async function markAttendance(id: string): Promise<void> {
  const res = await apiFetch(`/api/votes/${id}/attendance`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "登記出席失敗。");
}

async function castBallot(voteId: string, selectedOptions: string[]): Promise<any> {
  const res = await apiFetch(`/api/votes/${voteId}/ballot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedOptions }),
  });
  const data = await res.json();
  if (!res.ok) {
    const validationIssues = Array.isArray(data.details)
      ? data.details.map((issue: { path?: unknown[]; message?: string }) => {
          const field = Array.isArray(issue.path) && issue.path.length ? issue.path.join(".") : "request";
          return `${field}: ${issue.message || "invalid value"}`;
        }).join("；")
      : "";
    const message = data.error === "Invalid input" && validationIssues
      ? `投票欄位驗證失敗：${validationIssues}`
      : data.error || "提交投票失敗。";
    throw new Error(message);
  }
  return data;
}

async function closeVoteApi(voteId: string): Promise<any> {
  const res = await apiFetch(`/api/votes/${voteId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "關閉投票失敗。");
  return data;
}

async function publishVoteApi(voteId: string): Promise<any> {
  const res = await apiFetch(`/api/admin/votes/${voteId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "發布草稿失敗。");
  return data;
}

async function deleteVoteApi(voteId: string): Promise<any> {
  const res = await apiFetch(`/api/admin/votes/${voteId}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "刪除投票失敗。");
  return data;
}

export default function VoteDetail() {
  const { isEnglish } = useLanguage();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const voteId = params.id || "";
  const queryClient = useQueryClient();
  const { user, isAdmin, isSuperAdmin } = useAuth();

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [voteSuccess, setVoteSuccess] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const { data: vote, isLoading } = useQuery({
    queryKey: ["vote", voteId],
    queryFn: () => fetchVoteDetail(voteId),
    staleTime: 0,
    refetchInterval: 10 * 1000,
  });

  useEffect(() => {
    if (!vote && !isLoading) {
      applySeoMetadata({
        title: isEnglish ? "Vote not found｜FUMO" : "找不到投票｜聯合微國家組織 FUMO",
        description: isEnglish ? "This public vote is unavailable." : "此投票不存在或目前無法載入。",
        path: `/votes/${voteId}`,
        language: isEnglish ? "en" : "zh-Hant",
        robots: "noindex, nofollow",
      });
      return;
    }
    if (!vote) return;
    const description = vote.description?.trim() || (isEnglish
      ? "View the public proposal, options, deadline, and aggregate result."
      : "查看 FUMO 公開投票議案、選項、期限與彙總結果。進行中的投票不公開個別選擇。");
    applySeoMetadata({
      title: isEnglish ? `${vote.name}｜FUMO Official Vote` : `${vote.name}｜FUMO 聯合微國家組織正式投票與議案資訊`,
      description: description.slice(0, 160),
      path: `/votes/${encodeURIComponent(vote.publicId || String(vote.id))}`,
      language: isEnglish ? "en" : "zh-Hant",
      keywords: "FUMO投票,聯合微國家組織議案,公開投票,投票結果",
      type: "article",
      robots: vote.isPublished ? "index, follow" : "noindex, nofollow",
    });
  }, [vote, isLoading, voteId, isEnglish]);

  const { data: results } = useQuery({
    queryKey: ["vote-results", voteId],
    queryFn: () => fetchResults(voteId),
    staleTime: 0,
    enabled: !!vote && vote.isPublished,
    refetchInterval: vote && vote.isPublished && !vote.isUpcoming && !vote.isClosed && !vote.isExpired ? 5 * 1000 : false,
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["vote-attendance", voteId],
    queryFn: () => fetchAttendance(voteId),
    enabled: !!vote && vote.isPublished,
    refetchInterval: 10 * 1000,
  });

  const attendanceMutation = useMutation({
    mutationFn: () => markAttendance(voteId),
    onSuccess: () => {
      setAttendanceError(null);
      queryClient.invalidateQueries({ queryKey: ["vote-attendance", voteId] });
    },
    onError: (err: Error) => setAttendanceError(toChineseError(err)),
  });

  const castMutation = useMutation({
    mutationFn: (selectedOptions: string[]) => castBallot(voteId, selectedOptions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vote", voteId] });
      queryClient.invalidateQueries({ queryKey: ["vote-results", voteId] });
      queryClient.invalidateQueries({ queryKey: ["votes"] });
      setVoteSuccess(isEnglish ? "Vote submitted successfully. Thank you for participating." : "投票成功！謝謝您的參與。");
      setVoteError(null);
      setSelectedOptions([]);
    },
    onError: (err: Error) => {
      setVoteError(toChineseError(err));
      setVoteSuccess(null);
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closeVoteApi(voteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vote", voteId] });
      queryClient.invalidateQueries({ queryKey: ["vote-results", voteId] });
      queryClient.invalidateQueries({ queryKey: ["votes"] });
    },
    onError: (err: Error) => {
      setVoteError(toChineseError(err));
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishVoteApi(voteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vote", voteId] });
      queryClient.invalidateQueries({ queryKey: ["vote-results", voteId] });
      queryClient.invalidateQueries({ queryKey: ["votes"] });
      setVoteError(null);
    },
    onError: (err: Error) => setVoteError(toChineseError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVoteApi(voteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["votes"] });
      navigate("/votes");
    },
    onError: (err: Error) => {
      setVoteError(toChineseError(err));
    },
  });

  const isVotingOpen = vote && vote.isPublished && !vote.isUpcoming && !vote.isClosed && !vote.isExpired;
  const isResultsFinal = !!vote && (vote.isClosed || vote.isExpired);
  const countryVotes = results?.countryVotes ?? [];

  useEffect(() => {
    if (isResultsFinal) {
      queryClient.invalidateQueries({ queryKey: ["vote-results", voteId] });
    }
  }, [isResultsFinal, queryClient, voteId]);

  const handleOptionToggle = (opt: string) => {
    if (!vote) return;
    if (vote.allowMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
      );
    } else {
      setSelectedOptions([opt]);
    }
  };

  const handleCast = () => {
    if (!user) {
      setVoteError("請先登入您的帳戶才能投票。");
      return;
    }
    if (selectedOptions.length === 0) {
      setVoteError("請選擇至少一個選項。");
      return;
    }
    setVoteError(null);
    setVoteSuccess(null);
    castMutation.mutate(selectedOptions);
  };

  const formattedOutput = useMemo(() => {
    if (!results) return "";
    const lines: string[] = [];
    lines.push(`"${results.voteName}"`);
    lines.push(isEnglish ? `${results.totalVoters} countries voted` : `共 ${results.totalVoters} 個國家投票`);
    for (const r of results.results) {
      const pct = parseFloat(r.percentage);
      const wpct = parseFloat(r.weightedPercentage);
      lines.push(
        isEnglish ? `${r.option} (${r.count} votes ${pct.toFixed(1)}% | weighted ${r.weightedCount} votes ${wpct.toFixed(1)}%)` : `${r.option} (共 ${r.count} 人 ${pct.toFixed(1)}% | 權重計算後 ${r.weightedCount} 票 ${wpct.toFixed(1)}%)`
      );
      if (r.voters.length === 0) {
        lines.push(isEnglish ? "No one voted for this option" : "沒有人投這個選項");
      } else {
        lines.push(r.voters.join(", "));
      }
    }
    return lines.join("\n");
  }, [results, isEnglish]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 py-12 text-center">
        <p className="text-muted-foreground">{isEnglish ? "Loading..." : "載入中..."}</p>
      </div>
    );
  }
  if (!vote) {
    return (
      <div className="min-h-screen bg-muted/20 py-12 text-center">
        <p className="text-muted-foreground">{isEnglish ? "Vote not found" : "投票不存在"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-6 sm:py-12">
      <div className="container mx-auto max-w-3xl px-3 sm:px-4">
        <div className="mb-8">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="min-w-0 break-words text-2xl font-bold text-primary sm:text-3xl">{vote.name}</h1>
              <Badge
                variant={isVotingOpen ? "default" : "secondary"}
                className={isVotingOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
              >
                {!vote.isPublished ? (
                  <><Clock className="w-3 h-3 mr-1" />{isEnglish ? "Draft" : "草稿"}</>
                ) : vote.isUpcoming ? (
                  <><Clock className="w-3 h-3 mr-1" />{isEnglish ? "Upcoming" : "即將開始"}</>
                ) : vote.isClosed ? (
                  <><XCircle className="w-3 h-3 mr-1" />{isEnglish ? "Closed" : "已關閉"}</>
                ) : vote.isExpired ? (
                  <><Clock className="w-3 h-3 mr-1" />{isEnglish ? "Expired" : "已過期"}</>
                ) : (
                  <><CheckCircle2 className="w-3 h-3 mr-1" />{isEnglish ? "Active" : "進行中"}</>
                )}
              </Badge>
            </div>
            {isSuperAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm(isEnglish ? "Delete this entire vote and all ballots? This cannot be undone." : "確定要刪除整個投票及其所有投票記錄嗎？此操作無法復原。")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="min-h-11 w-full shrink-0 justify-center border-red-300 text-red-600 hover:bg-red-50 sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {deleteMutation.isPending ? (isEnglish ? "Deleting..." : "刪除中...") : (isEnglish ? "Delete vote" : "刪除投票")}
              </Button>
            )}
          </div>
          {vote.description && <p className="break-words text-muted-foreground">{vote.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
            {typeof vote.regularMeetingNumber === "number" && (
              <span>{isEnglish ? `Regular meeting ${vote.regularMeetingNumber}` : `第 ${vote.regularMeetingNumber} 次例行大會`}</span>
            )}
            {vote.customId && <span className="break-all">{isEnglish ? "Vote ID" : "投票 ID"}：{vote.customId}</span>}
            {vote.startsAt && (
              <span className="min-w-0 break-words">{isEnglish ? "Starts" : "開始時間"}：{new Date(vote.startsAt).toLocaleString(isEnglish ? "en-US" : "zh-TW")}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{new Date(vote.deadline).toLocaleString("zh-TW")}</span>
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4 shrink-0" />
              <span>{vote.ballotCount} {isEnglish ? "votes" : "票"}</span>
            </span>
            <span>{vote.allowMultiple ? "可複選" : "單選"}</span>
          </div>
        </div>

        {!vote.isPublished && (
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardContent className="space-y-3 px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
              <p className="font-medium text-amber-900">{isEnglish ? "This vote is an unpublished draft." : "此投票目前是未發布草稿，只有管理員可見。"}</p>
              {voteError && <p className="text-sm text-red-700">{voteError}</p>}
              {isAdmin && (
                <Button className="min-h-11 w-full sm:w-auto" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
                  {publishMutation.isPending ? (isEnglish ? "Publishing..." : "發布中...") : (isEnglish ? "Publish draft" : "發布草稿")}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {vote.isPublished && vote.isUpcoming && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="space-y-2 px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
              <p className="font-medium text-primary">{isEnglish ? "This vote is scheduled and is not open yet." : "此投票已預約，尚未開放投票。"}</p>
              {vote.startsAt && <p className="text-sm text-muted-foreground">{isEnglish ? "Voting opens" : "開放時間"}：{new Date(vote.startsAt).toLocaleString(isEnglish ? "en-US" : "zh-TW")}</p>}
              <p className="text-sm text-muted-foreground">{isEnglish ? "Voting will open automatically at the scheduled time." : "到達預約時間後，系統會自動開放投票，無需管理員再次操作。"}</p>
            </CardContent>
          </Card>
        )}

        {vote.isPublished && (
          <Card className="mb-8 border-border/60 bg-white">
            <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-primary">
                  <ClipboardCheck className="h-5 w-5" />
                  {isEnglish ? "Meeting attendance" : "會議出席登記"}
                </CardTitle>
                <Badge variant="outline">{isEnglish ? "Separate from voting" : "與投票分開計算"}</Badge>
              </div>
              <p className="pt-2 text-sm text-muted-foreground">
                {isEnglish ? "Member and observer states may each check in once. Attendance does not cast a ballot or affect voting results." : "成員國與觀察國均可各登記一次出席；出席不會送出選票，也不影響投票結果。"}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {user ? (
                attendance?.canAttend ? (
                  <div className="flex flex-col gap-3 rounded-md border border-primary/15 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-primary">{user.countryName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {attendance.countryStatus === "member" ? (isEnglish ? "Member state" : "成員國") : (isEnglish ? "Observer state" : "觀察國")}
                      </p>
                    </div>
                    {attendance.myAttendance ? (
                      <Badge className="w-fit gap-1 bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3.5 w-3.5" />{isEnglish ? "Attendance recorded" : "已登記出席"}</Badge>
                    ) : (
                      <Button className="min-h-11 w-full sm:w-auto" onClick={() => attendanceMutation.mutate()} disabled={attendanceMutation.isPending}>
                        {attendanceMutation.isPending ? (isEnglish ? "Recording…" : "登記中…") : (isEnglish ? "Confirm attendance" : "確認出席")}
                      </Button>
                    )}
                  </div>
                ) : attendance ? (
                  <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{isEnglish ? "This account is not associated with a member or observer state." : "此帳戶未關聯至成員國或觀察國，無法登記出席。"}</p>
                ) : null
              ) : (
                <div className="flex min-w-0 items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 sm:p-4">
                  <LogIn className="h-5 w-5 shrink-0 text-amber-600" />
                  <p className="min-w-0 text-sm text-amber-800">{isEnglish ? "Sign in with a member or observer state account to check in." : "請先登入成員國或觀察國帳戶以登記出席。"} <Link href="/login" className="font-medium underline">{isEnglish ? "Sign in" : "登入"}</Link></p>
                </div>
              )}
              {attendanceError && <p className="text-sm text-red-600" role="alert">{attendanceError}</p>}
              {attendanceLoading ? (
                <p className="text-sm text-muted-foreground">{isEnglish ? "Loading attendance…" : "載入出席名單中…"}</p>
              ) : attendance ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([
                      { key: "member" as const, title: isEnglish ? "Member states" : "成員國", records: attendance.memberStates, color: "border-blue-200 bg-blue-50/70" },
                      { key: "observer" as const, title: isEnglish ? "Observer states" : "觀察國", records: attendance.observerStates, color: "border-violet-200 bg-violet-50/70" },
                    ]).map(group => (
                      <section key={group.key} className={`rounded-md border p-3 ${group.color}`}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-primary">{group.title}</h3>
                          <Badge variant="secondary">{group.records.length}</Badge>
                        </div>
                        {group.records.length ? (
                          <ul className="space-y-2">
                            {group.records.map(record => (
                              <li key={record.countryName} className="flex min-w-0 items-center justify-between gap-2 rounded bg-white/80 px-2.5 py-2 text-sm">
                                <span className="min-w-0 break-words font-medium">{record.countryName}</span>
                                <time className="shrink-0 text-xs text-muted-foreground" dateTime={record.attendedAt}>{new Date(record.attendedAt.endsWith("Z") ? record.attendedAt : `${record.attendedAt.replace(" ", "T")}Z`).toLocaleTimeString(isEnglish ? "en-US" : "zh-TW", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</time>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">{isEnglish ? "No states checked in yet." : "尚無國家登記出席。"}</p>
                        )}
                      </section>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{isEnglish ? `${attendance.total} states present · one attendance entry per state` : `目前 ${attendance.total} 國出席・每國限登記一次`}</p>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Voting Section */}
        {isVotingOpen && (
          <Card className="mb-8 border-border/60 bg-white">
            <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <Vote className="w-5 h-5" />
                投票 Vote
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              {/* Auth status */}
              {!user ? (
                <div className="flex min-w-0 items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 sm:p-4">
                  <LogIn className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-800">{isEnglish ? "Please sign in before voting" : "請先登入才能投票"}</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      <Link href="/login" className="underline font-medium">{isEnglish ? "Sign in" : "登入"}</Link>
                      {" "}或{" "}
                      <Link href="/register" className="underline font-medium">{isEnglish ? "Register" : "註冊帳戶"}</Link>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex min-w-0 items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <span className="min-w-0 break-words text-sm font-medium text-primary">
                    已登入：{user.voterName}（{user.countryName}）
                  </span>
                </div>
              )}
              {/* Options */}
              <div>
                <label className="block text-sm font-medium mb-3">{isEnglish ? "Choose your voting option" : "選擇您的投票選項"}</label>
                <div className="space-y-3">
                  {vote.options.map((opt) => (
                    <div key={opt} className="flex min-h-11 items-start gap-3 rounded-md border border-border/70 p-3">
                      <Checkbox
                        id={`opt-${opt}`}
                        checked={selectedOptions.includes(opt)}
                        onCheckedChange={() => handleOptionToggle(opt)}
                        disabled={!user}
                        className="mt-0.5 h-5 w-5 shrink-0"
                      />
                      <label
                        htmlFor={`opt-${opt}`}
                        className={`min-w-0 flex-1 break-words text-sm font-medium ${!user ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {opt}
                      </label>
                    </div>
                  ))}
                </div>
                {!user && (
                  <p className="text-xs text-muted-foreground mt-2">{isEnglish ? "Please sign in to select an option." : "請先登入才能選擇選項。"}</p>
                )}
              </div>

              {voteError && (
                <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-red-600">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words text-sm">{voteError}</span>
                </div>
              )}
              {voteSuccess && (
                <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-green-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words text-sm">{voteSuccess}</span>
                </div>
              )}

              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Button
                  onClick={handleCast}
                  disabled={castMutation.isPending || !user}
                  className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  {castMutation.isPending ? (isEnglish ? "Submitting..." : "提交中...") : (isEnglish ? "Submit vote" : "提交投票")}
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm(isEnglish ? "Close this vote? Voting cannot be reopened." : "確定要關閉此投票嗎？關閉後將不能再投票。")) {
                        closeMutation.mutate();
                      }
                    }}
                    disabled={closeMutation.isPending}
                    className="min-h-11 w-full border-red-300 text-red-600 hover:bg-red-50 sm:w-auto"
                  >
                    {closeMutation.isPending ? (isEnglish ? "Closing..." : "關閉中...") : (isEnglish ? "Close vote" : "關閉投票")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin close button for expired-but-not-closed votes */}
        {vote.isExpired && !vote.isClosed && isAdmin && (
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => {
                if (confirm(isEnglish ? "Close this vote permanently?" : "確定要正式關閉此投票嗎？")) {
                  closeMutation.mutate();
                }
              }}
              disabled={closeMutation.isPending}
              className="min-h-11 w-full border-red-300 text-red-600 hover:bg-red-50 sm:w-auto"
            >
              {closeMutation.isPending ? (isEnglish ? "Closing..." : "關閉中...") : (isEnglish ? "Close vote" : "正式關閉此投票")}
            </Button>
          </div>
        )}

        {/* Results Section */}
        {results && !vote.isUpcoming && (
          <Card className="mb-8 border-border/60 bg-white">
            <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  {isEnglish ? "Voting results" : "投票結果"}
                </CardTitle>
                {isResultsFinal ? (
                  <Badge variant="secondary">{isEnglish ? "Final results" : "最終結果"}</Badge>
                ) : (
                  <Badge className="gap-1.5 bg-green-100 text-green-800 hover:bg-green-100">
                    <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                    {isEnglish ? "Live · refreshes every 5 seconds" : "即時更新中・每 5 秒刷新"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              <div className="space-y-4">
                {results.results.map((r, idx) => (
                  <motion.div
                    key={r.option}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 break-words font-bold text-primary">{r.option}</span>
                      <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
                        {r.count} 票 / {r.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.min(parseFloat(r.percentage), 100)}%` }}
                      />
                    </div>
                    {isResultsFinal && r.voters.length > 0 ? (
                      <p className="break-words text-xs text-muted-foreground">{r.voters.join(", ")}</p>
                    ) : isResultsFinal ? (
                      <p className="text-xs text-muted-foreground">{isEnglish ? "No votes for this option" : "沒有人投這個選項"}</p>
                    ) : null}
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-bold text-primary mb-2">{isEnglish ? `${results.totalVoters} countries voted` : `共 ${results.totalVoters} 個國家投票`}</p>
                <div className="rounded-md border border-primary/15 bg-primary/5 p-3 sm:p-4" aria-live="polite">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <p className="text-sm font-bold text-primary flex items-center gap-2">
                      <Globe2 className="w-4 h-4" />
                      {isEnglish ? "Live country votes" : "即時投票明細"}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {isEnglish ? "Country · choice" : "國家・投票選項"}
                    </span>
                  </div>
                  {countryVotes.length > 0 ? (
                    <div className="space-y-2">
                      {countryVotes.map((countryVote) => (
                        <div
                          key={`${countryVote.countryName}-${countryVote.votedAt}`}
                          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-white px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 break-words font-semibold text-primary">{countryVote.countryName}</span>
                          <span className="min-w-0 flex-1 break-words text-foreground">
                            {countryVote.selectedOptions.join("、")}
                          </span>
                          <time className="text-xs text-muted-foreground" dateTime={countryVote.votedAt}>
                            {new Date(countryVote.votedAt).toLocaleTimeString(isEnglish ? "en-US" : "zh-TW", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {isEnglish ? "No countries have voted yet." : "目前還沒有國家投票。"}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {isEnglish ? "Only the country and selected option are shown while voting is open." : "投票進行中只顯示國家與所選選項，不公開代表姓名。"}
                  </p>
                </div>
                {isResultsFinal && (
                  <>
                    <div className="rounded-md bg-muted p-3 sm:p-4">
                      <p className="break-all whitespace-pre-wrap text-xs font-mono text-muted-foreground">{formattedOutput}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{isEnglish ? "Copy the format above to upload it to the voting records." : "可複製上述文字格式用於上傳至投票紀錄。"}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
