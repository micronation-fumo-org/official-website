import { apiUrl } from "@/lib/api";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Vote, CheckCircle2, Users, AlertTriangle, XCircle, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

import { apiUrl } from "@/lib/api";
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
  const res = await fetch(apiUrl(`/api/votes/${id}`));
  if (!res.ok) throw new Error("Failed to fetch vote");
  return res.json();
}

async function fetchResults(id: string): Promise<ResultsData> {
  const res = await fetch(apiUrl(`/api/votes/${id}/results`));
  if (!res.ok) throw new Error("Failed to fetch results");
  return res.json();
}

async function castBallot(voteId: string, voterId: string, password: string, selectedOptions: string[]): Promise<any> {
  const res = await fetch(apiUrl(`/api/votes/${voteId}/ballot`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voterId, password, selectedOptions }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to cast ballot");
  return data;
}

async function closeVoteApi(voteId: string, adminId: string): Promise<any> {
  const res = await fetch(apiUrl(`/api/votes/${voteId}/close`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to close vote");
  return data;
}

export default function VoteDetail() {
  const params = useParams<{ id: string }>();
  const voteId = params.id || "";
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  const [password, setPassword] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [voteSuccess, setVoteSuccess] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const { data: vote, isLoading } = useQuery({
    queryKey: ["vote", voteId],
    queryFn: () => fetchVoteDetail(voteId),
    staleTime: 10 * 1000,
  });

  const { data: results } = useQuery({
    queryKey: ["vote-results", voteId],
    queryFn: () => fetchResults(voteId),
    staleTime: 10 * 1000,
    enabled: !!(vote?.isClosed || vote?.isExpired),
  });

  const castMutation = useMutation({
    mutationFn: (opts: { voterId: string; password: string; selectedOptions: string[] }) =>
      castBallot(voteId, opts.voterId, opts.password, opts.selectedOptions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vote", voteId] });
      queryClient.invalidateQueries({ queryKey: ["vote-results", voteId] });
      queryClient.invalidateQueries({ queryKey: ["votes"] });
      setVoteSuccess("投票成功！謝謝您的參與。");
      setVoteError(null);
      setSelectedOptions([]);
      setPassword("");
    },
    onError: (err: Error) => {
      setVoteError(err.message);
      setVoteSuccess(null);
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closeVoteApi(voteId, user?.voterId || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vote", voteId] });
      queryClient.invalidateQueries({ queryKey: ["votes"] });
    },
    onError: (err: Error) => {
      setVoteError(err.message);
    },
  });

  const isVotingOpen = vote && !vote.isClosed && !vote.isExpired;

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
      setVoteError("請先登入您的帳戶才能投票");
      return;
    }
    if (!password.trim()) {
      setVoteError("請輸入您的密碼以確認身份");
      return;
    }
    if (selectedOptions.length === 0) {
      setVoteError("請選擇至少一個選項");
      return;
    }
    setVoteError(null);
    setVoteSuccess(null);
    castMutation.mutate({ voterId: user.voterId, password: password.trim(), selectedOptions });
  };

  const formattedOutput = useMemo(() => {
    if (!results) return "";
    const lines: string[] = [];
    lines.push(`"${results.voteName}"`);
    lines.push(`共 ${results.totalVoters} 個人投票`);
    for (const r of results.results) {
      const pct = parseFloat(r.percentage);
      const wpct = parseFloat(r.weightedPercentage);
      lines.push(
        `${r.option} (共 ${r.count} 人 ${pct.toFixed(1)}% | 權重計算後 ${r.weightedCount} 票 ${wpct.toFixed(1)}%)`
      );
      if (r.voters.length === 0) {
        lines.push("沒有人投這個選項");
      } else {
        lines.push(r.voters.join(", "));
      }
    }
    return lines.join("\n");
  }, [results]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 py-12 text-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }
  if (!vote) {
    return (
      <div className="min-h-screen bg-muted/20 py-12 text-center">
        <p className="text-muted-foreground">投票不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-bold text-primary">{vote.name}</h1>
            <Badge
              variant={isVotingOpen ? "default" : "secondary"}
              className={isVotingOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
            >
              {vote.isClosed ? (
                <><XCircle className="w-3 h-3 mr-1" />已關閉</>
              ) : vote.isExpired ? (
                <><Clock className="w-3 h-3 mr-1" />已過期</>
              ) : (
                <><CheckCircle2 className="w-3 h-3 mr-1" />進行中</>
              )}
            </Badge>
          </div>
          {vote.description && <p className="text-muted-foreground">{vote.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(vote.deadline).toLocaleString("zh-TW")}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {vote.ballotCount} 票
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
                    <p className="text-sm font-medium text-amber-800">請先登入才能投票</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      <Link href="/login" className="underline font-medium">登入</Link>
                      {" "}或{" "}
                      <Link href="/register" className="underline font-medium">註冊帳戶</Link>
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

              {/* Password confirm */}
              {user && (
                <div>
                  <label className="block text-sm font-medium mb-1">確認密碼 Confirm Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="輸入您的密碼以確認投票"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              )}

              {/* Options */}
              <div>
                <label className="block text-sm font-medium mb-3">選擇您的投票選項</label>
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
                  <p className="text-xs text-muted-foreground mt-2">請先登入才能選擇選項。</p>
                )}
              </div>

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
                  {castMutation.isPending ? "提交中..." : "提交投票 Submit Vote"}
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("確定要關閉此投票嗎？關閉後將不能再投票。")) {
                        closeMutation.mutate();
                      }
                    }}
                    disabled={closeMutation.isPending}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {closeMutation.isPending ? "關閉中..." : "關閉投票 Close Vote"}
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
                if (confirm("確定要正式關閉此投票嗎？")) {
                  closeMutation.mutate();
                }
              }}
              disabled={closeMutation.isPending}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {closeMutation.isPending ? "關閉中..." : "正式關閉此投票 Close Vote"}
            </Button>
          </div>
        )}

        {/* Results Section */}
        {(vote.isClosed || vote.isExpired) && results && (
          <Card className="mb-8 border-border/60 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                投票結果 Results
              </CardTitle>
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
                    {r.voters.length > 0 ? (
                      <p className="text-xs text-muted-foreground">{r.voters.join(", ")}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">沒有人投這個選項</p>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-bold text-primary mb-2">共 {results.totalVoters} 個人投票</p>
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{formattedOutput}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">可複製上述文字格式用於上傳至投票紀錄。</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
