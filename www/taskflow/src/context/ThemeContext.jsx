import { createContext, useContext, useEffect, useState } from "react";
import { THEMES } from "../lib/theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const tokens = THEMES[theme];
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
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
