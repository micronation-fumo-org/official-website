import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  isEnglish: boolean;
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ isEnglish, compact = true, className = "" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark
    ? (isEnglish ? "Switch to light mode" : "切換至淺色模式")
    : (isEnglish ? "Switch to dark mode" : "切換至深色模式");

  return (
    <button
      type="button"
      className={`fumo-theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      {isDark ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
      {!compact && <span>{label}</span>}
    </button>
  );
}
