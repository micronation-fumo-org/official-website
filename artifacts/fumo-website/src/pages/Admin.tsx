import { toChineseError } from "@/lib/errorMessage";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Users, AlertTriangle, CheckCircle2, KeyRound, LogIn, Crown, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminWebhooks from "@/components/AdminWebhooks";

interface Account {
  voterId: string;
  voterName: string;
  countryName: string;
  googleEmail: string | null;
  adminLevel: number;
  createdAt: string;
}

interface AuditLog {
  id: number;
  actorVoterId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogPage {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

async function fetchAccounts(): Promise<Account[]> {
  const res = await apiFetch("/api/admin/accounts");
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "載入帳戶資料失敗。");
  }
  return res.json();
}

async function updateAccount(voterId: string, updates: { newPassword?: string; adminLevel?: number }): Promise<any> {
  const res = await apiFetch("/api/admin/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voterId, ...updates }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "更新帳戶資料失敗。");
  return data;
}

async function fetchAuditLogs(query: string, offset: number): Promise<AuditLogPage> {
  const params = new URLSearchParams({ limit: "25", offset: String(offset) });
  if (query) params.set("q", query);
  const res = await apiFetch(`/api/admin/audit-logs?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "載入管理操作紀錄失敗。");
  return data;
}

function auditActionLabel(action: string, isEnglish: boolean) {
  const labels: Record<string, [string, string]> = {
    "vote.create": ["建立投票", "Created vote"],
    "vote.close": ["關閉投票", "Closed vote"],
    "vote.delete": ["刪除整個投票", "Deleted vote"],
    "ballot.delete": ["刪除選票紀錄", "Deleted ballot"],
    "account.password_reset": ["重設帳戶密碼", "Reset account password"],
    "account.admin_level_changed": ["調整管理員級別", "Changed administrator level"],
  };
  return labels[action]?.[isEnglish ? 1 : 0] ?? action;
}

function auditSummary(entry: AuditLog, isEnglish: boolean) {
  const details = entry.details ?? {};
  const voteName = typeof details.voteName === "string" ? details.voteName : "";
  const targetName = typeof details.targetName === "string" ? details.targetName : entry.targetId;
  switch (entry.action) {
    case "vote.create": return isEnglish ? `Created: ${voteName}` : `建立「${voteName}」`;
    case "vote.close": return isEnglish ? `Closed: ${voteName}` : `關閉「${voteName}」`;
    case "vote.delete": {
      const count = Number(details.deletedBallots ?? 0);
      return isEnglish ? `Deleted: ${voteName} (${count} ballots)` : `刪除「${voteName}」（${count} 張選票）`;
    }
    case "ballot.delete": return isEnglish ? `Vote ID: ${String(details.voteId ?? "—")}` : `所屬投票 ID：${String(details.voteId ?? "—")}`;
    case "account.password_reset": return isEnglish ? `Password reset for ${targetName}` : `已重設 ${targetName} 的密碼`;
    case "account.admin_level_changed": {
      const previous = Number(details.previousAdminLevel ?? 0);
      const next = Number(details.newAdminLevel ?? 0);
      return isEnglish ? `${targetName}: level ${previous} → ${next}` : `${targetName}：級別 ${previous} → ${next}`;
    }
    default: return entry.targetId;
  }
}

function adminLevelLabel(level: number, isEnglish = false) {
  if (level >= 9) return { label: isEnglish ? "Super Admin" : "最高管理員", color: "bg-red-100 text-red-800 border-red-200" };
  if (level >= 2) return { label: isEnglish ? "Tier 2 Admin" : "二階管理員", color: "bg-orange-100 text-orange-800 border-orange-200" };
  if (level >= 1) return { label: isEnglish ? "Tier 1 Admin" : "一階管理員", color: "bg-blue-100 text-blue-800 border-blue-200" };
  return { label: isEnglish ? "User" : "一般用戶", color: "bg-gray-100 text-gray-700 border-gray-200" };
}

export default function Admin() {
  const { isEnglish } = useLanguage();
  const { user, isAdmin, isTier2Admin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [resetPassword, setResetPassword] = useState("");
  const [resetTarget, setResetTarget] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [auditSearchInput, setAuditSearchInput] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditOffset, setAuditOffset] = useState(0);

  const { data: accounts, error: accountsError, refetch } = useQuery({
    queryKey: ["admin-accounts", user?.voterId],
    queryFn: () => fetchAccounts(),
    enabled: isAdmin && !!user?.voterId,
    staleTime: 10 * 1000,
  });

  const { data: auditPage, error: auditError, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-logs", user?.voterId, auditSearch, auditOffset],
    queryFn: () => fetchAuditLogs(auditSearch, auditOffset),
    enabled: isSuperAdmin && !!user?.voterId,
    staleTime: 10 * 1000,
  });

  const setMessage = (err: string | null, success: string | null) => {
    setActionError(toChineseError(err));
    setActionSuccess(success);
  };

  const handleResetPassword = async () => {
    setMessage(null, null);
    if (!resetTarget.trim() || !resetPassword.trim()) {
      setActionError("請輸入目標 ID 和新密碼。");
      return;
    }
    try {
      await updateAccount(resetTarget.trim(), { newPassword: resetPassword.trim() });
      setMessage(null, isEnglish ? "Password reset successfully" : "密碼重設成功");
      setResetPassword("");
      setResetTarget("");
      refetch();
    } catch (err: any) {
      setMessage(toChineseError(err), null);
    }
  };

  const handleSetTier = async (targetId: string, newLevel: number) => {
    setMessage(null, null);
    try {
      await updateAccount(targetId, { adminLevel: newLevel });
      const levelInfo = adminLevelLabel(newLevel, isEnglish);
      setMessage(null, isEnglish ? `${targetId} is now ${levelInfo.label}` : `已將 ${targetId} 設為${levelInfo.label}`);
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      refetch();
    } catch (err: any) {
      setMessage(toChineseError(err), null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-muted/20 py-12">
        <div className="container mx-auto px-4 max-w-lg">
          <Card className="border-border/60 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {isEnglish ? "Admin panel" : "管理面板"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 p-4 rounded-md">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {!user ? (isEnglish ? "Please sign in to access the admin panel" : "請先登入才能訪問管理面板") : (isEnglish ? "You do not have administrator permissions" : "您沒有管理員權限")}
                  </p>
                </div>
              </div>
              {!user ? (
                <Link href="/login">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <LogIn className="w-4 h-4 mr-1" />
                    {isEnglish ? "Sign in" : "前往登入"}
                  </Button>
                </Link>
              ) : (
                <Link href="/votes">
                  <Button variant="outline" className="w-full">{isEnglish ? "Back to voting" : "返回投票列表"}</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const levelInfo = adminLevelLabel(user!.adminLevel, isEnglish);

  return (
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-start gap-2 leading-tight">
              <Shield className="w-6 h-6 shrink-0 mt-1" />
              <span className="break-words"><span className="block sm:inline">{isEnglish ? "Welcome back, " : "歡迎回來，"}</span><span className="block sm:inline">{user!.voterName}</span></span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <p className="text-muted-foreground">{isEnglish ? "Admin panel" : "管理面板"}</p>
              <span className={`inline-flex max-w-full whitespace-normal break-words text-xs px-2 py-0.5 rounded-full border font-medium leading-tight ${levelInfo.color}`}>
                {levelInfo.label}
              </span>
            </div>
          </div>
          <Link href="/bot-admin"><Button variant="outline">Discord Bot 後台</Button></Link>
        </div>

        {/* Permissions info */}
        <Card className="mb-8 border-border/60 bg-white">
          <CardHeader>
            <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
              <Crown className="w-4 h-4" />
              {isEnglish ? "Your permissions" : "您的權限"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
              <div className={`p-3 rounded-md border ${isAdmin ? "bg-green-50 border-green-200" : "bg-muted border-muted"}`}>
                <p className="font-medium text-green-800">{isEnglish ? "Tier 1 Admin" : "一階管理員"}</p>
                <ul className="text-xs text-green-700 mt-1 space-y-0.5">
                  <li>{isEnglish ? "View voting data and account information" : "查看投票數據和帳戶資訊"}</li>
                  <li>{isEnglish ? "Create and close votes" : "建立、關閉投票"}</li>
                </ul>
              </div>
              <div className={`p-3 rounded-md border ${isTier2Admin ? "bg-orange-50 border-orange-200" : "bg-muted border-muted"}`}>
                <p className={`font-medium ${isTier2Admin ? "text-orange-800" : "text-muted-foreground"}`}>{isEnglish ? "Tier 2 Admin" : "二階管理員"}</p>
                <ul className={`text-xs mt-1 space-y-0.5 ${isTier2Admin ? "text-orange-700" : "text-muted-foreground"}`}>
                  <li>{isEnglish ? "Reset user passwords" : "重設用戶密碼"}</li>
                  <li>{isEnglish ? "Delete voting records" : "刪除投票記錄"}</li>
                </ul>
              </div>
              <div className={`p-3 rounded-md border ${isSuperAdmin ? "bg-red-50 border-red-200" : "bg-muted border-muted"}`}>
                <p className={`font-medium ${isSuperAdmin ? "text-red-800" : "text-muted-foreground"}`}>{isEnglish ? "Super Admin" : "最高管理員"}</p>
                <ul className={`text-xs mt-1 space-y-0.5 ${isSuperAdmin ? "text-red-700" : "text-muted-foreground"}`}>
                  <li>{isEnglish ? "Set administrator levels" : "設定用戶管理員級別"}</li>
                  <li>{isEnglish ? "Manage all accounts" : "管理所有帳戶"}</li>
                  <li>{isEnglish ? "Delete entire votes" : "刪除整個投票"}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Messages */}
        {(actionError || actionSuccess) && (
          <div className="mb-6">
            {actionError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-sm">{actionError}</span>
              </div>
            )}
            {actionSuccess && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-sm">{actionSuccess}</span>
              </div>
            )}
          </div>
        )}

        {/* Reset Password — only tier-2+ */}
        {isTier2Admin && (
          <Card className="mb-8 border-border/60 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                {isEnglish ? "Reset password" : "重設密碼"}
                <span className="inline-block whitespace-nowrap text-xs font-normal text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full ml-1">
                  {isEnglish ? "Tier 2 Admin" : "二階管理員"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{isEnglish ? "Target Discord ID" : "目標 Discord ID"}</label>
                  <Input
                    value={resetTarget}
                    onChange={(e) => setResetTarget(e.target.value)}
                    placeholder={isEnglish ? "Account ID to reset" : "要重設密碼的帳戶 ID"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{isEnglish ? "New password" : "新密碼"}</label>
                  <Input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder={isEnglish ? "Enter a new password (at least 4 characters)" : "輸入新密碼（至少4個字元）"}
                  />
                </div>
              </div>
              <Button onClick={handleResetPassword} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isEnglish ? "Reset password" : "重設密碼"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Accounts Table */}
        <Card className="border-border/60 bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
              <Users className="w-5 h-5" />
              {isEnglish ? "Account list" : "帳戶列表"}
              <Badge variant="secondary" className="ml-2">{accounts?.length || 0} {isEnglish ? "accounts" : "個帳戶"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accountsError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md mb-4">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{toChineseError(accountsError, "載入帳戶資料失敗，請稍後再試。")}</span>
              </div>
            )}
            {accounts && accounts.length > 0 && (
              <div className="xl:hidden space-y-3">
                {accounts.map((a) => {
                  const info = adminLevelLabel(a.adminLevel, isEnglish);
                  const isSelf = a.voterId === user!.voterId;
                  return (
                    <div key={a.voterId} className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                      <div className="flex min-w-0 flex-col items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-medium break-words">{a.voterName}{isSelf && <span className="ml-1 text-xs text-muted-foreground">{isEnglish ? "(you)" : "(你)"}</span>}</p>
                          <p className="font-mono text-xs text-muted-foreground break-all mt-1">{a.voterId}</p>
                        </div>
                        <span className={`inline-flex w-fit max-w-full whitespace-normal break-words text-left text-xs px-2 py-1 rounded-full border font-medium leading-tight ${info.color}`}>{info.label}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="min-w-0"><p className="text-xs text-muted-foreground">{isEnglish ? "Country" : "國家"}</p><p className="break-words [overflow-wrap:anywhere]">{a.countryName}</p></div>
                        <div className="min-w-0"><p className="text-xs text-muted-foreground">Google Email</p><p className="break-words [overflow-wrap:anywhere]">{a.googleEmail || (isEnglish ? "Not connected" : "尚未綁定")}</p></div>
                        <div><p className="text-xs text-muted-foreground">{isEnglish ? "Created" : "建立時間"}</p><p>{new Date(a.createdAt).toLocaleDateString("zh-TW")}</p></div>
                      </div>
                      {isSuperAdmin && !isSelf && a.adminLevel < 9 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {a.adminLevel !== 0 && <Button variant="outline" size="sm" onClick={() => handleSetTier(a.voterId, 0)}>{isEnglish ? "User" : "一般用戶"}</Button>}
                          {a.adminLevel !== 1 && <Button variant="outline" size="sm" onClick={() => handleSetTier(a.voterId, 1)} className="text-blue-600">{isEnglish ? "Tier 1 Admin" : "一階管理員"}</Button>}
                          {a.adminLevel !== 2 && <Button variant="outline" size="sm" onClick={() => handleSetTier(a.voterId, 2)} className="text-orange-600">{isEnglish ? "Tier 2 Admin" : "二階管理員"}</Button>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {accounts && accounts.length === 0 && (
              <p className="text-muted-foreground text-sm py-4">{isEnglish ? "No accounts yet" : "尚無帳戶"}</p>
            )}
            {accounts && accounts.length > 0 && (
              <div className="hidden xl:block overflow-x-auto">
                <Table className="min-w-[1120px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Discord ID</TableHead>
                      <TableHead>{isEnglish ? "Representative" : "代表名稱"}</TableHead>
                      <TableHead>{isEnglish ? "Country" : "國家"}</TableHead>
                      <TableHead>Google Email</TableHead>
                      <TableHead>{isEnglish ? "Role" : "級別"}</TableHead>
                      <TableHead>{isEnglish ? "Created" : "建立時間"}</TableHead>
                      {isSuperAdmin && <TableHead>{isEnglish ? "Set role" : "設定級別"}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((a) => {
                      const info = adminLevelLabel(a.adminLevel, isEnglish);
                      const isSelf = a.voterId === user!.voterId;
                      return (
                        <TableRow key={a.voterId}>
                          <TableCell className="font-mono text-xs">{a.voterId}</TableCell>
                          <TableCell className="text-sm font-medium">
                            {a.voterName}
                            {isSelf && (
                              <span className="ml-1 text-xs text-muted-foreground">{isEnglish ? "(you)" : "(你)"}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{a.countryName}</TableCell>
                          <TableCell className="max-w-64 break-words text-sm [overflow-wrap:anywhere]">{a.googleEmail || <span className="text-muted-foreground">{isEnglish ? "Not connected" : "尚未綁定"}</span>}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className={`inline-block whitespace-nowrap text-xs px-2 py-0.5 rounded-full border font-medium ${info.color}`}>
                              {info.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(a.createdAt).toLocaleDateString("zh-TW")}
                          </TableCell>
                          {isSuperAdmin && (
                            <TableCell>
                              {isSelf || a.adminLevel >= 9 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {a.adminLevel !== 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSetTier(a.voterId, 0)}
                                      className="text-xs h-7 text-gray-600 hover:text-gray-800"
                                    >
                                      <User className="w-3 h-3 mr-1" />
                                      一般用戶
                                    </Button>
                                  )}
                                  {a.adminLevel !== 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSetTier(a.voterId, 1)}
                                      className="text-xs h-7 text-blue-600 hover:text-blue-800"
                                    >
                                      一階管理員
                                    </Button>
                                  )}
                                  {a.adminLevel !== 2 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSetTier(a.voterId, 2)}
                                      className="text-xs h-7 text-orange-600 hover:text-orange-800"
                                    >
                                      {isEnglish ? "Tier 2 Admin" : "二階管理員"}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {isTier2Admin && <AdminWebhooks isEnglish={isEnglish} />}

        {isSuperAdmin && (
          <Card className="mt-8 border-border/60 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {isEnglish ? "Administrative activity log" : "管理操作紀錄"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isEnglish ? "Visible to Super Admins only. Passwords and vote choices are never recorded." : "僅最高管理員可檢視；系統不記錄密碼或投票選項。"}
              </p>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col sm:flex-row gap-2 mb-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAuditSearch(auditSearchInput.trim());
                  setAuditOffset(0);
                }}
              >
                <Input
                  value={auditSearchInput}
                  onChange={(event) => setAuditSearchInput(event.target.value)}
                  placeholder={isEnglish ? "Search actor, action, or target" : "搜尋操作者、操作或目標"}
                  aria-label={isEnglish ? "Search activity log" : "搜尋管理操作紀錄"}
                  maxLength={100}
                />
                <Button type="submit" variant="outline">{isEnglish ? "Search" : "搜尋"}</Button>
                {auditSearch && (
                  <Button type="button" variant="ghost" onClick={() => { setAuditSearchInput(""); setAuditSearch(""); setAuditOffset(0); }}>
                    {isEnglish ? "Clear" : "清除"}
                  </Button>
                )}
              </form>

              {auditError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md mb-4" role="alert">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{toChineseError(auditError, "載入管理操作紀錄失敗，請稍後再試。")}</span>
                </div>
              )}
              {auditLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{isEnglish ? "Loading activity log…" : "載入操作紀錄中…"}</p>
              ) : auditPage && auditPage.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[880px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isEnglish ? "Time (UTC)" : "時間（UTC）"}</TableHead>
                        <TableHead>{isEnglish ? "Administrator" : "操作者"}</TableHead>
                        <TableHead>{isEnglish ? "Action" : "操作"}</TableHead>
                        <TableHead>{isEnglish ? "Target" : "目標"}</TableHead>
                        <TableHead>{isEnglish ? "Summary" : "摘要"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditPage.items.map((entry) => {
                        const timestamp = new Date(`${entry.createdAt.replace(" ", "T")}Z`);
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="whitespace-nowrap text-xs">{Number.isNaN(timestamp.getTime()) ? entry.createdAt : timestamp.toLocaleString(isEnglish ? "en-US" : "zh-TW", { timeZone: "UTC" })}</TableCell>
                            <TableCell className="min-w-40">
                              <span className="font-medium">{entry.actorName}</span>
                              <span className="block font-mono text-xs text-muted-foreground break-all">{entry.actorVoterId}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{auditActionLabel(entry.action, isEnglish)}</TableCell>
                            <TableCell className="font-mono text-xs">{entry.targetType} · {entry.targetId}</TableCell>
                            <TableCell className="min-w-48">{auditSummary(entry, isEnglish)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : !auditError ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{isEnglish ? "No matching activity." : "沒有符合條件的操作紀錄。"}</p>
              ) : null}

              {auditPage && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {isEnglish ? `${auditPage.total} record(s)` : `共 ${auditPage.total} 筆紀錄`}
                    {auditPage.total > 0 ? ` · ${auditPage.offset + 1}–${Math.min(auditPage.offset + auditPage.items.length, auditPage.total)}` : ""}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={auditPage.offset <= 0} onClick={() => setAuditOffset(Math.max(0, auditOffset - auditPage.limit))}>
                      {isEnglish ? "Previous" : "上一頁"}
                    </Button>
                    <Button variant="outline" size="sm" disabled={auditPage.offset + auditPage.items.length >= auditPage.total} onClick={() => setAuditOffset(auditOffset + auditPage.limit)}>
                      {isEnglish ? "Next" : "下一頁"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
