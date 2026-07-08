import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Whether the app sidebar is collapsed (hidden). Shared across pages so the toggle
// button — which lives in each page's header — can drive the Sidebar rendered as its
// sibling. Persisted to localStorage so the choice survives navigation and reloads.
const SidebarContext = createContext(null);

const STORAGE_KEY = "tf.sidebarCollapsed";

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // No stored preference yet: start collapsed on small screens so the sidebar
    // (an overlay drawer there) doesn't cover the content on first load.
    if (stored === null) {
      return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    }
    return stored === "1";
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // localStorage may be unavailable (private mode); state still works in-memory
    }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((v) => !v), []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
