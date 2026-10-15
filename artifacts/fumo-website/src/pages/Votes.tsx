import { toChineseError } from "@/lib/errorMessage";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Vote, Clock, CheckCircle2, XCircle, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface VoteItem {
  id: number;
  customId: string | null;
  publicId: string;
  regularMeetingNumber: number | null;
  name: string;
  description: string;
  deadline: string;
  options: string[];
  allowMultiple: boolean;
  isClosed: boolean;
  isExpired: boolean;
  ballotCount: number;
  createdAt: string;
}

async function fetchVotes(): Promise<VoteItem[]> {
  const res = await apiFetch("/api/votes");
  if (!res.ok) throw new Error("載入投票列表失敗。");
  return res.json();
}

export default function Votes() {
  const { isEnglish } = useLanguage();
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["votes"],
    queryFn: fetchVotes,
    staleTime: 30 * 1000,
  });

  const activeVotes = data?.filter((v) => !v.isClosed && !v.isExpired) || [];
  const pastVotes = data?.filter((v) => v.isClosed || v.isExpired) || [];
  const groups = new Map<string, VoteItem[]>();
  pastVotes.forEach((vote) => {
    const key = typeof vote.regularMeetingNumber === "number" ? String(vote.regularMeetingNumber) : "unassigned";
    groups.set(key, [...(groups.get(key) || []), vote]);
  });
  const pastVoteGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === "unassigned") return 1;
    if (b === "unassigned") return -1;
    return Number(b) - Number(a);
  });

  const VoteCard = ({ vote }: { vote: VoteItem }) => {
    const deadline = new Date(vote.deadline);
    const isActive = !vote.isClosed && !vote.isExpired;
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link href={`/votes/${encodeURIComponent(vote.publicId || String(vote.id))}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60 bg-white h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg font-bold text-primary leading-tight">
                  {vote.name}
                </CardTitle>
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                >
                  {vote.isClosed ? (
                    <><XCircle className="w-3 h-3 mr-1" />已關閉 Closed</>
                  ) : vote.isExpired ? (
                    <><Clock className="w-3 h-3 mr-1" />已過期 Expired</>
                  ) : (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />進行中 Active</>
                  )}
                </Badge>
              </div>
              {vote.description && (
                <p className="text-sm text-muted-foreground mt-1">{vote.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {typeof vote.regularMeetingNumber === "number" && (
                  <Badge variant="outline">
                    {isEnglish ? `Regular meeting ${vote.regularMeetingNumber}` : `第 ${vote.regularMeetingNumber} 次例行大會`}
                  </Badge>
                )}
                {vote.customId && <Badge variant="outline">ID: {vote.customId}</Badge>}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>截止日期 Deadline: {deadline.toLocaleString("zh-TW")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Vote className="w-4 h-4" />
                <span>選項 Options: {vote.options.join(" / ")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-primary">已投票 {vote.ballotCount} 國</span>
                <span className="text-muted-foreground">· {vote.allowMultiple ? "可複選" : "單選"}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">{isEnglish ? "Voting" : "投票"}</h1>
          <p className="text-foreground/70 max-w-2xl mx-auto mb-6">
            聯合微國家組織的正式投票。每個國家最多三位代表可以註冊，但每個投票每國只能投一票。只有成員國代表才能投票。
          </p>
          {isAdmin && (
            <Link href="/votes/create">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1" />
                {isEnglish ? "Create vote" : "創建投票"}
              </Button>
            </Link>
          )}
        </div>

        {isLoading && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">載入中 Loading...</p>
          </div>
        )}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-600">載入失敗：{toChineseError(error, "載入資料失敗，請稍後再試。")}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <h2 className="text-xl font-bold text-primary mb-4">{isEnglish ? "Active votes" : "進行中的投票"} ({activeVotes.length})</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
              {activeVotes.length === 0 ? (
                <p className="text-muted-foreground col-span-full">{isEnglish ? "No active votes" : "目前沒有進行中的投票"}</p>
              ) : (
                activeVotes.map((vote) => <VoteCard key={vote.id} vote={vote} />)
              )}
            </div>

            <h2 className="text-xl font-bold text-muted-foreground mb-6">{isEnglish ? "Past votes" : "已結束的投票"} ({pastVotes.length})</h2>
            {pastVoteGroups.length === 0 ? (
              <p className="text-muted-foreground">{isEnglish ? "No past votes" : "目前沒有已結束的投票"}</p>
            ) : (
              pastVoteGroups.map(([meeting, meetingVotes]) => (
                <section key={meeting} className="mb-10" aria-labelledby={`meeting-${meeting}`}>
                  <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-border/60 pb-3">
                    <h3 id={`meeting-${meeting}`} className="text-lg font-bold text-primary">
                      {meeting === "unassigned"
                        ? (isEnglish ? "Unassigned regular meeting" : "未指定例行大會")
                        : (isEnglish ? `Regular meeting ${meeting}` : `第 ${meeting} 次例行大會`)}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {isEnglish ? `${meetingVotes.length} vote${meetingVotes.length === 1 ? "" : "s"}` : `${meetingVotes.length} 項投票`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {meetingVotes.map((vote) => <VoteCard key={vote.id} vote={vote} />)}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
