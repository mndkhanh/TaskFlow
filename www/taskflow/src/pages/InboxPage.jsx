import { useBoardData } from "../context/BoardDataContext";
import { useTheme } from "../context/ThemeContext";
import Sidebar from "../components/layout/Sidebar";
import SidebarToggle from "../components/layout/SidebarToggle";
import Icon from "../components/ui/Icon";
import IconButton from "../components/ui/IconButton";

export default function InboxPage() {
  const { workspaces, activeWorkspaceId } = useBoardData();
  const { theme, toggleTheme } = useTheme();
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex flex-none items-center gap-2"
          style={{ height: 64, borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 20px" }}
        >
          <SidebarToggle />
          <span className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>
            {activeWs?.name || "Workspace"}
          </span>
          <Icon name="chevron_right" size={18} style={{ color: "var(--text-3)", flex: "none" }} />
          <span className="text-sm font-extrabold" style={{ color: "var(--text)" }}>Inbox</span>
          <div className="flex-1" />
          <IconButton icon={theme === "light" ? "dark_mode" : "light_mode"} size={38} onClick={toggleTheme} />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center" style={{ padding: 32 }}>
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{ width: 64, height: 64, background: "var(--surface-2)", color: "var(--text-3)" }}
          >
            <Icon name="inbox" size={32} />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ margin: 0 }}>Your Inbox</h1>
          <p className="text-sm" style={{ maxWidth: 380, color: "var(--text-3)", margin: 0 }}>
            A quick-capture space for tasks that don’t belong to a board yet. This is coming soon —
            for now, add cards directly to a board.
          </p>
        </div>
      </main>
    </div>
  );
}
