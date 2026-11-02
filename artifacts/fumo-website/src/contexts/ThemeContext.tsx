import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "fumo_theme";

function getStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function getSystemPreference() {
  return Boolean(typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPreference);
  const isDark = mode === "dark" || (mode === "system" && systemPrefersDark);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    query.addEventListener?.("change", handleChange);
    return () => query.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#17191c" : "#ffffff");
    try {
      if (mode === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // The visual preference still works when storage is unavailable.
    }
  }, [isDark, mode]);

  const toggleTheme = () => setMode(isDark ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ mode, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
