import charterEn from "@/data/charter.en.md?raw";
import charterZh from "@/data/charter.zh.md?raw";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { charterUrlEn, charterUrlZh } from "@/data/regulations";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineMarkdown(value: string): string {
  const normalized = value.replace(/\\([\\`*_{}[\]()#+.!-])/g, "$1");
  return escapeHtml(normalized)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function isStandaloneIdentifier(line: string): boolean {
  return /^`[^`]+`(?:\s+`[^`]+`)*$/.test(line.trim());
}

function markdownToHtml(source: string): string {
  const rawLines = source.replace(/\r/g, "").split("\n");
  const lines: string[] = [];
  let inFrontMatter = false;
  let frontMatterStarted = false;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!frontMatterStarted && trimmed === "---") {
      frontMatterStarted = true;
      inFrontMatter = true;
      continue;
    }
    if (inFrontMatter) {
      if (trimmed === "---") inFrontMatter = false;
      continue;
    }
    if (isStandaloneIdentifier(line)) continue;
    lines.push(line);
  }

  const blocks: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const header = tableCells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().includes("|")) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push(
        `<div class="overflow-x-auto"><table><thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
      );
      continue;
    }

    if (/^>/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(`<blockquote>${inlineMarkdown(quoteLines.join("\n")).replace(/\n/g, "<br />")}</blockquote>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index];
      const currentTrimmed = current.trim();
      if (!currentTrimmed || /^(#{1,6})\s+/.test(currentTrimmed) || /^>/.test(currentTrimmed)) break;
      if (current.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) break;
      paragraphLines.push(currentTrimmed);
      index += 1;
    }
    blocks.push(`<p>${inlineMarkdown(paragraphLines.join("\n")).replace(/\n/g, "<br />")}</p>`);
  }

  return blocks.join("\n");
}

export default function Charter() {
  const { isEnglish } = useLanguage();
  const document = isEnglish ? charterEn : charterZh;
  const sourceUrl = isEnglish ? charterUrlEn : charterUrlZh;

  return (
    <div className="min-h-screen bg-muted/10 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">
            {isEnglish ? "Charter of the Federation of United Micronations Organisation" : "聯合微國家組織憲章"}
          </h1>
          <p className="text-foreground/70 mb-6 max-w-3xl mx-auto">
            {isEnglish
              ? "The complete Version VII Charter, including the articles, amendment history and supplementary provisions adopted at the 37th Regular Conference."
              : "第七版《聯合微國家組織憲章》完整內容，包含正式條文、憲章修改歷史及第三十七次組織例會通過的附章。"}
          </p>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {isEnglish ? "Open the original HackMD document" : "在 HackMD 閱讀原始憲章"}
              <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </Button>
        </div>

        <article
          className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden prose prose-slate max-w-none prose-headings:text-primary prose-h1:text-center prose-h1:text-3xl prose-h2:border-l-4 prose-h2:border-secondary prose-h2:pl-4 prose-h2:py-1 prose-h2:mt-12 prose-h3:text-xl prose-h3:mt-8 prose-p:leading-8 prose-blockquote:border-secondary prose-blockquote:bg-muted/40 prose-blockquote:rounded-r-md prose-table:text-sm"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(document) }}
        />
      </div>
    </div>
  );
}
