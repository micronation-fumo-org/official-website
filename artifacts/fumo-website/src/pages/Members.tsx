import { apiUrl } from "@/lib/api";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, Building, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface MemberState {
  fullName: string;
  shortName: string;
  abbreviation?: string;
  headOfState?: string;
  primeMinister?: string;
  governmentType: string;
  status: "member" | "observer";
}

interface MembersApiResponse {
  memberStates: MemberState[];
  observerStates: MemberState[];
  allStates: MemberState[];
  cached: boolean;
  lastUpdated: string | null;
}

async function fetchMembers(): Promise<MembersApiResponse> {
  const res = await fetch(apiUrl("/api/members"));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch members: ${res.status} ${text}`);
  }
  return res.json();
}

export default function Members() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "member" | "observer">("all");

  const { data, isLoading, error, refetch, isFetching } = useQuery<MembersApiResponse>({
    queryKey: ["members"],
    queryFn: fetchMembers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const memberStates = data?.memberStates ?? [];
  const observerStates = data?.observerStates ?? [];
  const allStates = data?.allStates ?? [];

  const sourceList = useMemo(() => {
    if (activeTab === "member") return memberStates;
    if (activeTab === "observer") return observerStates;
    return allStates;
  }, [activeTab, memberStates, observerStates, allStates]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return sourceList;
    const query = searchQuery.toLowerCase();
    return sourceList.filter(
      (m) =>
        m.fullName.toLowerCase().includes(query) ||
        m.shortName.toLowerCase().includes(query) ||
        m.abbreviation?.toLowerCase().includes(query) ||
        m.governmentType.toLowerCase().includes(query) ||
        m.headOfState?.toLowerCase().includes(query) ||
        m.primeMinister?.toLowerCase().includes(query)
    );
  }, [searchQuery, sourceList]);

  const StateCard = ({ member, index }: { member: MemberState; index: number }) => (
    <motion.div
      key={member.fullName}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
    >
      <Card className="h-full hover:shadow-md transition-shadow border-border/60 bg-white">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-xl font-bold text-primary leading-tight">
              {member.fullName}
            </CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              {member.abbreviation && (
                <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30">
                  {member.abbreviation}
                </Badge>
              )}
              <Badge
                variant={member.status === "member" ? "default" : "secondary"}
                className={member.status === "member"
                  ? "bg-primary text-primary-foreground hover:bg-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted"
                }
              >
                {member.status === "member" ? "成員國 Member" : "觀察國 Observer"}
              </Badge>
            </div>
          </div>
          {member.shortName && (
            <p className="text-sm font-medium text-foreground/60">{member.shortName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Building className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">政體 Government</p>
              <p className="text-sm font-medium">{member.governmentType || "未登記"}</p>
            </div>
          </div>

          {(member.headOfState || member.primeMinister) && (
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-2 w-full">
                {member.headOfState && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">國家元首 Head of State</p>
                    <p className="text-sm font-medium">{member.headOfState}</p>
                  </div>
                )}
                {member.primeMinister && member.primeMinister !== member.headOfState && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">政府首腦 Head of Govt.</p>
                    <p className="text-sm font-medium">{member.primeMinister}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">成員國及觀察國 Member & Observer States</h1>
          <p className="text-foreground/70 max-w-2xl mx-auto mb-6">
            聯合微國家組織的正式成員國及觀察國名錄。本組織由多元的政治實體組成，共同致力於和平與合作。
          </p>
          <div className="inline-flex items-center gap-3 flex-wrap justify-center mb-4">
            <div className="inline-flex items-center justify-center px-4 py-2 bg-primary/5 text-primary rounded-full border border-primary/20">
              <span className="font-bold text-xl mr-1">{memberStates.length}</span>
              <span className="text-sm font-medium">會員國 Members</span>
            </div>
            <div className="inline-flex items-center justify-center px-4 py-2 bg-muted/50 text-muted-foreground rounded-full border border-border/50">
              <span className="font-bold text-xl mr-1">{observerStates.length}</span>
              <span className="text-sm font-medium">觀察國 Observers</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "更新中 Updating..." : "重新整理 Refresh"}
            </Button>
          </div>
          {data?.lastUpdated && (
            <p className="text-xs text-muted-foreground mt-2">
              上次更新 Last updated: {new Date(data.lastUpdated).toLocaleString("zh-TW")}
            </p>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center gap-2 mb-6">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            onClick={() => setActiveTab("all")}
            className={activeTab === "all" ? "bg-primary text-primary-foreground" : ""}
          >
            全部 All ({allStates.length})
          </Button>
          <Button
            variant={activeTab === "member" ? "default" : "outline"}
            onClick={() => setActiveTab("member")}
            className={activeTab === "member" ? "bg-primary text-primary-foreground" : ""}
          >
            會員國 Members ({memberStates.length})
          </Button>
          <Button
            variant={activeTab === "observer" ? "default" : "outline"}
            onClick={() => setActiveTab("observer")}
            className={activeTab === "observer" ? "bg-primary text-primary-foreground" : ""}
          >
            觀察國 Observers ({observerStates.length})
          </Button>
        </div>

        <div className="max-w-xl mx-auto mb-12 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="搜尋國家名稱、政體或元首 (Search nations, government type, or leaders)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-14 text-base bg-white shadow-sm border-border/50 focus-visible:ring-secondary"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2 px-1">
              找到 {filteredMembers.length} 個結果
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member, index) => (
            <StateCard key={member.fullName} member={member} index={index} />
          ))}
          
          {filteredMembers.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <p className="text-xl text-muted-foreground">沒有找到符合條件的國家</p>
              <p className="text-sm text-muted-foreground mt-2">請嘗試其他關鍵字</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
