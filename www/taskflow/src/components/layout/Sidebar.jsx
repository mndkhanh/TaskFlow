import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBoardData } from "../../context/BoardDataContext";
import { useSidebar } from "../../context/SidebarContext";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import CreateBoardModal from "../board/CreateBoardModal";
import Icon from "../ui/Icon";

export default function Sidebar() {
  const { boards, boardsLoading, unreadCount } = useBoardData();
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showCreateBoard, setShowCreateBoard] = useState(false);

  if (collapsed) return null;

  return (
    <aside
      className="flex flex-none flex-col"
      style={{
        width: 264,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        padding: "20px 14px",
      }}
    >
      <WorkspaceSwitcher />

      <div
        style={{ height: 1, background: "var(--border)", margin: "16px 8px" }}
      />

      <button
        type="button"
        onClick={() => navigate("/inbox")}
        className="flex w-full items-center gap-2.5 rounded-lg text-sm font-medium cursor-pointer hover:bg-[var(--surface-2)]"
        style={{
          padding: "9px 8px",
          border: "none",
          background: pathname === "/inbox" ? "var(--primary-soft)" : "none",
          color: pathname === "/inbox" ? "var(--primary)" : "var(--text-2)",
        }}
      >
        <Icon name="inbox" size={18} style={{ flex: "none" }} />
        <span className="min-w-0 flex-1 truncate text-left">Inbox</span>
        {unreadCount > 0 && (
          <span
            className="flex flex-none items-center justify-center rounded-full text-white"
            style={{ minWidth: 20, height: 20, padding: "0 6px", fontSize: 11, fontWeight: 700, background: "var(--primary)" }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div
          className="flex items-center justify-between"
          style={{ padding: "0 8px", margin: "18px 0 8px" }}
        >
          <span
            className="text-xs font-bold"
            style={{ color: "var(--text-3)", letterSpacing: "0.06em" }}
          >
            BOARDS
          </span>
          <button
            type="button"
            onClick={() => setShowCreateBoard(true)}
            title="Create board"
            className="flex items-center justify-center rounded-md cursor-pointer hover:bg-[var(--surface-2)]"
            style={{
              width: 24,
              height: 24,
              border: "none",
              background: "none",
              color: "var(--text-3)",
            }}
          >
            <Icon name="add" size={18} />
          </button>
        </div>

        {boardsLoading ? (
          <div
            className="text-sm"
            style={{ padding: "6px 8px", color: "var(--text-3)" }}
          >
            Loading…
          </div>
        ) : boards.length === 0 ? (
          <div
            className="text-sm"
            style={{ padding: "6px 8px", color: "var(--text-3)" }}
          >
            No boards yet
          </div>
        ) : (
          boards.map((board) => {
            const active = pathname === `/board/${board.id}`;
            return (
              <button
                key={board.id}
                type="button"
                onClick={() => navigate(`/board/${board.id}`)}
                className="flex w-full items-center gap-2.5 rounded-lg text-sm font-medium cursor-pointer hover:bg-[var(--surface-2)]"
                style={{
                  padding: "9px 8px",
                  border: "none",
                  background: active ? "var(--primary-soft)" : "none",
                  color: active ? "var(--primary)" : "var(--text-2)",
                }}
              >
                <span
                  className="flex-none rounded"
                  style={{ width: 14, height: 14, background: board.color }}
                />
                <span className="min-w-0 flex-1 truncate text-left">
                  {board.name}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div
        style={{ height: 1, background: "var(--border)", margin: "8px 8px" }}
      />
      <div
        className="flex items-center gap-2.5"
        style={{ padding: "8px 8px 4px" }}
      >
        <div
          className="relative flex-none rounded-lg"
          style={{ width: 30, height: 30, background: "var(--primary)" }}
        >
          <div
            className="absolute rounded-sm bg-white"
            style={{ left: 6, top: 6, width: 5, height: 18 }}
          />
          <div
            className="absolute rounded-sm"
            style={{
              left: 13,
              top: 6,
              width: 5,
              height: 11,
              background: "#8fc0f0",
            }}
          />
          <div
            className="absolute rounded-sm"
            style={{
              left: 20,
              top: 6,
              width: 5,
              height: 14,
              background: "var(--danger)",
            }}
          />
        </div>
        <span className="text-lg font-extrabold tracking-tight">
          SRT TaskFlow
        </span>
      </div>

      {showCreateBoard && (
        <CreateBoardModal onClose={() => setShowCreateBoard(false)} />
      )}
    </aside>
  );
}
