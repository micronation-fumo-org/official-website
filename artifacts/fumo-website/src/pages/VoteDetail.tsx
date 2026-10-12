import { toChineseError } from "@/lib/errorMessage";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Vote, CheckCircle2, Users, AlertTriangle, XCircle, LogIn, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface VoteDetail {
  id: number;
  name: string;
  description: string;
  deadline: string;
  options: string[];
  allowMultiple: boolean;
  isClosed: boolean;
  isExpired: boolean;
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

interface ResultsData {
  voteId: number;
  voteName: string;
  totalVoters: number;
  isClosed: boolean;
  isExpired: boolean;
  results: ResultItem[];
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

async function castBallot(voteId: string, selectedOptions: string[], password: string): Promise<any> {
  const res = await apiFetch(`/api/votes/${voteId}/ballot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedOptions, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "提交投票失敗。");
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
  const [votePassword, setVotePassword] = useState("");
  const [voteSuccess, setVoteSuccess] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const { data: vote, isLoading } = useQuery({
    queryKey: ["vote", voteId],
    queryFn: () => fetchVoteDetail(voteId),
    staleTime: 0,
    refetchInterval: 10 * 1000,
  });

  const { data: results } = useQuery({
    queryKey: ["vote-results", voteId],
    queryFn: () => fetchResults(voteId),
    staleTime: 0,
    enabled: !!vote,
    refetchInterval: vote && !vote.isClosed && !vote.isExpired ? 5 * 1000 : false,
  });

  const castMutation = useMutation({
    mutationFn: (input: { selectedOptions: string[]; password: string }) => castBallot(voteId, input.selectedOptions, input.password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vote", voteId] });
      queryClient.invalidateQueries({ queryKey: ["vote-results", voteId] });
      queryClient.invalidateQueries({ queryKey: ["votes"] });
      setVoteSuccess(isEnglish ? "Vote submitted successfully. Thank you for participating." : "投票成功！謝謝您的參與。");
      setVoteError(null);
      setSelectedOptions([]);
      setVotePassword("");
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

  const isVotingOpen = vote && !vote.isClosed && !vote.isExpired;
  const isResultsFinal = !!vote && (vote.isClosed || vote.isExpired);

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
    if (!votePassword.trim()) {
      setVoteError(isEnglish ? "Please enter your account password to confirm your vote." : "請輸入帳戶密碼以確認投票。");
      return;
    }
    setVoteError(null);
    setVoteSuccess(null);
    castMutation.mutate({ selectedOptions, password: votePassword.trim() });
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
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-primary">{vote.name}</h1>
              <Badge
                variant={isVotingOpen ? "default" : "secondary"}
                className={isVotingOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
              >
                {vote.isClosed ? (
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
                className="shrink-0 border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {deleteMutation.isPending ? (isEnglish ? "Deleting..." : "刪除中...") : (isEnglish ? "Delete vote" : "刪除投票")}
              </Button>
            )}
          </div>
          {vote.description && <p className="text-muted-foreground">{vote.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(vote.deadline).toLocaleString("zh-TW")}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {vote.ballotCount} {isEnglish ? "votes" : "票"}
            </span>
            <span>{vote.allowMultiple ? "可複選" : "單選"}</span>
          </div>
        </div>

        {/* Voting Section */}
        {isVotingOpen && (
          <Card className="mb-8 border-border/60 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <Vote className="w-5 h-5" />
                投票 Vote
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auth status */}
              {!user ? (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 p-4 rounded-md">
                  <LogIn className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">{isEnglish ? "Please sign in before voting" : "請先登入才能投票"}</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      <Link href="/login" className="underline font-medium">{isEnglish ? "Sign in" : "登入"}</Link>
                      {" "}或{" "}
                      <Link href="/register" className="underline font-medium">{isEnglish ? "Register" : "註冊帳戶"}</Link>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-primary/5 p-3 rounded-md border border-primary/20">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-primary">
                    已登入：{user.voterName}（{user.countryName}）
                  </span>
                </div>
              )}
              {/* Options */}
              <div>
                <label className="block text-sm font-medium mb-3">{isEnglish ? "Choose your voting option" : "選擇您的投票選項"}</label>
                <div className="space-y-3">
                  {vote.options.map((opt) => (
                    <div key={opt} className="flex items-center gap-3">
                      <Checkbox
                        id={`opt-${opt}`}
                        checked={selectedOptions.includes(opt)}
                        onCheckedChange={() => handleOptionToggle(opt)}
                        disabled={!user}
                      />
                      <label
                        htmlFor={`opt-${opt}`}
                        className={`text-sm font-medium ${!user ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"}`}
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

              {user && (
                <div>
                  <label htmlFor="vote-password" className="block text-sm font-medium mb-2">
                    {isEnglish ? "Account password (confirmation)" : "帳戶密碼（投票確認）"}
                  </label>
                  <Input
                    id="vote-password"
                    type="password"
                    value={votePassword}
                    onChange={(e) => setVotePassword(e.target.value)}
                    placeholder={isEnglish ? "Enter your account password" : "輸入您的帳戶密碼"}
                    autoComplete="current-password"
                    disabled={castMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEnglish ? "Used only to verify this vote on the server; it is not stored in the browser." : "僅用於由後端驗證本次投票，不會儲存在瀏覽器中。"}
                  </p>
                </div>
              )}

              {voteError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{voteError}</span>
                </div>
              )}
              {voteSuccess && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">{voteSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleCast}
                  disabled={castMutation.isPending || !user}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
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
                    className="border-red-300 text-red-600 hover:bg-red-50"
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
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {closeMutation.isPending ? (isEnglish ? "Closing..." : "關閉中...") : (isEnglish ? "Close vote" : "正式關閉此投票")}
            </Button>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <Card className="mb-8 border-border/60 bg-white">
            <CardHeader>
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
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {results.results.map((r, idx) => (
                  <motion.div
                    key={r.option}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary">{r.option}</span>
                      <span className="text-sm text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">{r.voters.join(", ")}</p>
                    ) : isResultsFinal ? (
                      <p className="text-xs text-muted-foreground">{isEnglish ? "No votes for this option" : "沒有人投這個選項"}</p>
                    ) : null}
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-bold text-primary mb-2">{isEnglish ? `${results.totalVoters} countries voted` : `共 ${results.totalVoters} 個國家投票`}</p>
                {isResultsFinal && (
                  <>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{formattedOutput}</p>
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
