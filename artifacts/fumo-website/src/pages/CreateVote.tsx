import { toChineseError } from "@/lib/errorMessage";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

async function createVote(body: {
  name: string;
  description: string;
  deadline: string;
  options: string[];
  allowMultiple: boolean;
  customId: string | null;
  regularMeetingNumber: number;
}) {
  const res = await apiFetch("/api/votes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "建立投票失敗。");
  return data;
}

export default function CreateVote() {
  const { isEnglish } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [options, setOptions] = useState<string[]>(["同意", "反對", "棄權"]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [customId, setCustomId] = useState("");
  const [regularMeetingNumber, setRegularMeetingNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createVote,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["votes"] });
      setLocation(`/votes/${encodeURIComponent(data.publicId || data.id)}`);
    },
    onError: (err: Error) => {
      setError(toChineseError(err));
    },
  });

  const addOption = () => setOptions((prev) => [...prev, ""]);
  const removeOption = (idx: number) => setOptions((prev) => prev.filter((_, i) => i !== idx));
  const updateOption = (idx: number, value: string) =>
    setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));

  const handleSubmit = () => {
    setError(null);
    if (!user || !isAdmin) {
      setError("只有管理員才能建立投票。");
      return;
    }
    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!name.trim()) {
      setError("請輸入投票名稱。");
      return;
    }
    if (!/^\d+$/.test(regularMeetingNumber) || Number(regularMeetingNumber) < 1) {
      setError(isEnglish ? "Enter a valid regular meeting number (1 or greater)." : "請輸入有效的例行大會次數（至少為 1）。");
      return;
    }
    const normalizedCustomId = customId.trim();
    if (normalizedCustomId && (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(normalizedCustomId) || /^\d+$/.test(normalizedCustomId) || /^create$/i.test(normalizedCustomId))) {
      setError(isEnglish ? "Custom ID must be 1–48 letters, numbers, hyphens or underscores; digits only and the reserved word 'create' are not allowed." : "自訂投票 ID 限 1–48 個英文字母、數字、連字號或底線；不可為純數字或保留字 create。");
      return;
    }
    if (!deadline) {
      setError("請設定截止日期。");
      return;
    }
    if (validOptions.length < 2) {
      setError("至少需要兩個選項。");
      return;
    }
    mutation.mutate({
      name: name.trim(),
      description: description.trim(),
      deadline: new Date(deadline).toISOString(),
      options: validOptions,
      allowMultiple,
      customId: normalizedCustomId || null,
      regularMeetingNumber: Number(regularMeetingNumber),
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-muted/20 py-12 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary mb-2">{isEnglish ? "Administrator permission required" : "需要管理員權限"}</h2>
          <p className="text-muted-foreground mb-4">{isEnglish ? "Only administrators can create votes." : "只有管理員才能建立投票。"}</p>
          <Link href="/votes">
            <Button variant="outline">{isEnglish ? "Back to voting" : "返回投票列表"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold text-primary mb-2">{isEnglish ? "Create vote" : "創建投票 Create Vote"}</h1>
        <p className="text-muted-foreground mb-8">
          {isEnglish ? "Set up a new vote for member-state representatives." : "設定一個新的投票，讓成員國代表進行投票。"}
        </p>

        <Card className="border-border/60 bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-primary">{isEnglish ? "Vote configuration" : "投票設定 Vote Configuration"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name">{isEnglish ? "Vote name" : "投票名稱 Vote Name"}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEnglish ? "e.g. Resolution on a new bill" : "例如: 新法案決議案"}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="customId">{isEnglish ? "Custom vote ID (optional)" : "自訂投票 ID（選填）"}</Label>
              <Input
                id="customId"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="例如：FUMO-AG-2026-01"
                maxLength={48}
                className="mt-1"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {isEnglish ? "Leave blank to use the system ID. Use letters, numbers, - or _; digits only and the reserved word 'create' are not allowed." : "留空會使用系統編號；可用英文字母、數字、- 或 _，純數字及保留字 create 不可使用。"}
              </p>
            </div>

            <div>
              <Label htmlFor="regularMeetingNumber">{isEnglish ? "Regular meeting number" : "第幾次例行大會"}</Label>
              <Input
                id="regularMeetingNumber"
                type="number"
                min={1}
                step={1}
                value={regularMeetingNumber}
                onChange={(e) => setRegularMeetingNumber(e.target.value)}
                placeholder={isEnglish ? "e.g. 12" : "例如：12"}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {isEnglish ? "Closed votes will be grouped under this meeting on the voting page." : "投票結束後，會在投票列表歸入該次例行大會的獨立分區。"}
              </p>
            </div>

            <div>
              <Label htmlFor="desc">{isEnglish ? "Description" : "說明 Description"}</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isEnglish ? "Describe this vote..." : "投票的詳細說明..."}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="deadline">{isEnglish ? "Deadline" : "截止日期 Deadline"}</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>{isEnglish ? "Voting options" : "投票選項 Options"}</Label>
              <div className="space-y-2 mt-1">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={isEnglish ? `Option ${idx + 1}` : `選項 ${idx + 1}`}
                    />
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="mt-1"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {isEnglish ? "Add option" : "新增選項"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="allowMultiple"
                checked={allowMultiple}
                onCheckedChange={(checked) => setAllowMultiple(checked as boolean)}
              />
              <Label htmlFor="allowMultiple" className="cursor-pointer">
                {isEnglish ? "Allow multiple selections" : "允許複選"}
              </Label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {mutation.isPending ? (isEnglish ? "Creating..." : "創建中...") : (isEnglish ? "Create vote" : "創建投票")}
              </Button>
              <Button variant="outline" onClick={() => setLocation("/votes")}>
                {isEnglish ? "Cancel" : "取消"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
