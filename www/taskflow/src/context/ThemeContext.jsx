import { createContext, useContext, useEffect, useState } from "react";
import { THEMES } from "../lib/theme";

const ThemeContext = createContext(null);
const STORAGE_KEY = "tf.theme";

// Prefer a previously-saved choice; otherwise fall back to the OS setting, then light.
function readInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage unavailable (private mode); fall through to system preference
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    const tokens = THEMES[theme];
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable; theme still applies in-memory
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
