import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBoardData } from "../context/BoardDataContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Sidebar from "../components/layout/Sidebar";
import SidebarToggle from "../components/layout/SidebarToggle";
import Avatar from "../components/ui/Avatar";
import Icon from "../components/ui/Icon";
import IconButton from "../components/ui/IconButton";

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Turn an activity row into an icon + human-readable message.
function describe(a) {
  const p = a.payload || {};
  const q = (v) => (v ? `“${v}”` : "a card");
  switch (a.type) {
    case "board_created":
      return { icon: "dashboard", text: `created board ${p.title ? `“${p.title}”` : ""}`.trim() };
    case "card_created":
      return { icon: "add_card", text: `added ${q(p.title)}${p.listTitle ? ` to ${p.listTitle}` : ""}` };
    case "card_moved":
      return { icon: "swap_horiz", text: `moved ${q(p.cardTitle)}${p.from && p.to ? ` from ${p.from} to ${p.to}` : ""}` };
    case "card_archived":
      return { icon: "archive", text: `archived ${q(p.cardTitle)}` };
    case "comment_added":
      return { icon: "chat_bubble", text: `commented on ${q(p.cardTitle)}${p.snippet ? `: ${p.snippet}` : ""}` };
    default:
      return { icon: "bolt", text: a.type };
  }
}

export default function InboxPage() {
  const {
    workspaces,
    activeWorkspaceId,
    members,
    boards,
    activities,
    activitiesLoading,
    unreadCount,
    refreshActivities,
    markActivityRead,
    markActivityUnread,
    markAllActivitiesRead,
  } = useBoardData();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  // Pull the freshest feed each time the Inbox is opened.
  useEffect(() => {
    refreshActivities();
  }, [refreshActivities]);

  const openActivity = (a) => {
    markActivityRead(a.id);
    if (a.boardId) navigate(`/board/${a.boardId}`);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex flex-none items-center gap-2"
          style={{ height: 64, borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 20px" }}
        >
          <SidebarToggle />
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            title="Back to your boards"
            className="flex min-w-0 items-center rounded-md cursor-pointer hover:bg-[var(--surface-2)]"
            style={{ height: 32, padding: "0 8px", border: "none", background: "none" }}
          >
            <span className="truncate" style={{ maxWidth: 220, fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>
              {activeWs?.name || "Workspace"}
            </span>
          </button>
          <Icon name="chevron_right" size={18} style={{ color: "var(--text-3)", flex: "none" }} />
          <span className="text-sm font-extrabold" style={{ color: "var(--text)" }}>Inbox</span>
          {unreadCount > 0 && (
            <span
              className="flex items-center justify-center rounded-full text-white"
              style={{ minWidth: 20, height: 20, padding: "0 6px", fontSize: 11, fontWeight: 700, background: "var(--primary)" }}
            >
              {unreadCount}
            </span>
          )}
          <div className="flex-1" />
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllActivitiesRead}
              className="flex items-center gap-1.5 rounded-lg text-sm font-semibold cursor-pointer hover:bg-[var(--surface-2)]"
              style={{ height: 36, padding: "0 12px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-2)" }}
            >
              <Icon name="done_all" size={18} />
              Mark all read
            </button>
          )}
          <IconButton icon={theme === "light" ? "dark_mode" : "light_mode"} size={38} onClick={toggleTheme} />
        </header>

        <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {activitiesLoading && activities.length === 0 ? (
              <div className="text-sm" style={{ padding: 24, textAlign: "center", color: "var(--text-3)" }}>
                Loading activity…
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center" style={{ padding: "64px 20px" }}>
                <div
                  className="flex items-center justify-center rounded-2xl"
                  style={{ width: 64, height: 64, background: "var(--surface-2)", color: "var(--text-3)" }}
                >
                  <Icon name="inbox" size={32} />
                </div>
                <h1 className="text-xl font-extrabold tracking-tight" style={{ margin: 0 }}>No activity yet</h1>
                <p className="text-sm" style={{ maxWidth: 380, color: "var(--text-3)", margin: 0 }}>
                  Board and card activity across this workspace — new boards, cards, moves, and comments — will show up here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {activities.map((a) => {
                  const actor = members[a.actorId];
                  const actorName = a.actorId === user?.id ? "You" : actor?.name || "Someone";
                  const boardName = boards.find((b) => b.id === a.boardId)?.name;
                  const { icon, text } = describe(a);
                  const unread = !a.read && a.actorId !== user?.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => openActivity(a)}
                      className="flex cursor-pointer items-start gap-3 rounded-xl hover:bg-[var(--surface-2)]"
                      style={{
                        padding: "12px 14px",
                        border: "1px solid var(--border)",
                        background: unread ? "var(--primary-soft)" : "var(--surface)",
                      }}
                    >
                      <div className="relative flex-none" style={{ marginTop: 1 }}>
                        <Avatar initials={actor?.initials || "?"} color={actor?.color || "var(--text-3)"} src={actor?.avatarUrl} size={34} />
                        <span
                          className="absolute flex items-center justify-center rounded-full"
                          style={{ right: -3, bottom: -3, width: 18, height: 18, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-3)" }}
                        >
                          <Icon name={icon} size={12} />
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm" style={{ color: "var(--text)", lineHeight: 1.4 }}>
                          <span className="font-bold">{actorName}</span> {text}
                        </div>
                        <div className="flex items-center gap-2" style={{ marginTop: 3 }}>
                          {boardName && (
                            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--text-3)" }}>
                              <Icon name="dashboard" size={13} />
                              {boardName}
                            </span>
                          )}
                          <span className="text-xs" style={{ color: "var(--text-3)" }}>· {timeAgo(a.createdAt)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          (a.read ? markActivityUnread : markActivityRead)(a.id);
                        }}
                        title={a.read ? "Mark as unread" : "Mark as read"}
                        className="flex flex-none items-center justify-center rounded-md cursor-pointer hover:bg-[var(--surface-3)]"
                        style={{ width: 30, height: 30, border: "none", background: "none", color: unread ? "var(--primary)" : "var(--text-3)" }}
                      >
                        <Icon name={a.read ? "mark_email_unread" : "check_circle"} size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
