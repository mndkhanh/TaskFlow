import { useBoardData } from "../../context/BoardDataContext";
import { useTheme } from "../../context/ThemeContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import SidebarToggle from "./SidebarToggle";

export default function DashboardHeader() {
  const { workspaces, activeWorkspaceId, members } = useBoardData();
  const { theme, toggleTheme } = useTheme();
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const memberList = Object.values(members);

  return (
    <header
      className="flex flex-none items-center gap-4 max-md:gap-2 max-md:!px-4"
      style={{ height: 64, borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 28px" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarToggle />
        {activeWs && (
          <span className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>
            {activeWs.name}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-2 rounded-lg max-lg:hidden"
        style={{ height: 38, padding: "0 12px", border: "1px solid var(--border-2)", background: "var(--bg)", width: 240 }}
      >
        <Icon name="search" size={18} style={{ color: "var(--text-3)" }} />
        <input
          placeholder="Search boards…"
          className="w-full text-sm outline-none"
          style={{ border: "none", background: "none", color: "var(--text)" }}
        />
      </div>

      <div className="flex items-center max-md:hidden">
        {memberList.slice(0, 5).map((m) => (
          <Avatar key={m.id} title={m.name} initials={m.initials} color={m.color} src={m.avatarUrl} overlap />
        ))}
      </div>

      <button
        type="button"
        className="flex items-center gap-1.5 rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)] max-sm:!px-2.5"
        style={{ height: 38, padding: "0 14px", border: "none", background: "var(--primary)" }}
      >
        <Icon name="person_add" size={18} />
        <span className="max-sm:hidden">Invite</span>
      </button>

      <IconButton icon={theme === "light" ? "dark_mode" : "light_mode"} size={38} onClick={toggleTheme} />
    </header>
  );
}
