import { z } from "zod";

const DISCORD_ROLE_ID_PATTERN = /^\d{17,20}$/;

export const botAnnouncementSchema = z.object({
  channelId: z.string().regex(/^\d{15,25}$/),
  mode: z.enum(["embed", "text"]).default("embed"),
  title: z.string().trim().max(256).optional().default(""),
  content: z.string().trim().min(1).max(1900),
  roleIds: z.array(z.string().regex(DISCORD_ROLE_ID_PATTERN)).max(100).optional(),
  roleId: z.string().regex(DISCORD_ROLE_ID_PATTERN).optional().or(z.literal("")),
  author: z.string().trim().min(1).max(80).optional(),
}).superRefine((data, context) => {
  if (data.mode === "embed" && !data.title) {
    context.addIssue({ code: "custom", path: ["title"], message: "Embed 公告需要標題。" });
  }
});
