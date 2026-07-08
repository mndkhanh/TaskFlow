import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBoardData } from "../../context/BoardDataContext";
import { useTheme } from "../../context/ThemeContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import SidebarToggle from "./SidebarToggle";

// One segment of the breadcrumb: a URL-style label that opens a dropdown of siblings.
function CrumbDropdown({ label, strong, items, activeId, emptyLabel, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 items-center gap-1 rounded-md cursor-pointer hover:bg-[var(--surface-2)]"
        style={{ height: 32, padding: "0 8px", border: "none", background: open ? "var(--surface-2)" : "none" }}
      >
        <span
          className="truncate"
          style={{ maxWidth: 220, fontSize: 14, fontWeight: strong ? 800 : 600, color: strong ? "var(--text)" : "var(--text-2)" }}
        >
          {label}
        </span>
        <Icon name="expand_more" size={16} style={{ color: "var(--text-3)", flex: "none" }} />
      </button>

      {open && (
        <div
          className="absolute z-50 rounded-lg"
          style={{
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: 224,
            maxWidth: 320,
            background: "var(--surface)",
            border: "1px solid var(--border-2)",
            boxShadow: "var(--shadow-lg)",
            padding: 6,
            animation: "tf-pop .14s ease",
          }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
            {items.length === 0 && (
              <div className="text-sm" style={{ padding: 8, color: "var(--text-3)" }}>{emptyLabel}</div>
            )}
            {items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelect(item);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md cursor-pointer hover:bg-[var(--surface-2)]"
                  style={{ padding: 8, border: "none", background: isActive ? "var(--primary-soft)" : "none" }}
                >
                  <span className="flex-none rounded" style={{ width: 14, height: 14, background: item.color }} />
                  <span
                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold"
                    style={isActive ? { color: "var(--primary)" } : { color: "var(--text)" }}
                  >
                    {item.name}
                  </span>
                  {isActive && <Icon name="check" size={16} style={{ color: "var(--primary)", flex: "none" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BoardHeader({ board, workspaceName, panelOpen, onTogglePanel, filterCount }) {
  const { members, boards } = useBoardData();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleBoardSelect = (b) => {
    if (b.id !== board.id) navigate(`/board/${b.id}`);
  };

  return (
    <header
      className="flex flex-none items-center gap-3.5"
      style={{ height: 60, borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 20px" }}
    >
      <div className="flex min-w-0 flex-1 items-center" style={{ gap: 2 }}>
        <SidebarToggle />
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex min-w-0 items-center rounded-md cursor-pointer hover:bg-[var(--surface-2)]"
          style={{ height: 32, padding: "0 8px", border: "none", background: "none" }}
        >
          <span className="truncate" style={{ maxWidth: 220, fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>
            {workspaceName || "Workspace"}
          </span>
        </button>
        <Icon name="chevron_right" size={18} style={{ color: "var(--text-3)", flex: "none" }} />
        <CrumbDropdown
          label={board.name}
          strong
          items={boards}
          activeId={board.id}
          emptyLabel="No boards"
          onSelect={handleBoardSelect}
        />
      </div>
      <div className="flex items-center">
        {Object.values(members).slice(0, 5).map((m) => (
          <Avatar key={m.id} title={m.name} initials={m.initials} color={m.color} src={m.avatarUrl} overlap />
        ))}
      </div>
      <button
        type="button"
        onClick={onTogglePanel}
        aria-pressed={panelOpen}
        title="Board panel (info, members, labels, filter)"
        className="flex items-center gap-1.5 rounded-lg text-sm font-semibold cursor-pointer hover:bg-[var(--surface-2)]"
        style={{
          height: 36,
          padding: "0 12px",
          border: "1px solid var(--border)",
          background: panelOpen ? "var(--surface-2)" : "var(--surface)",
          color: "var(--text-2)",
        }}
      >
        <Icon name="tune" size={18} />
        Panel
        {filterCount > 0 && (
          <span
            className="flex items-center justify-center rounded-full text-white"
            style={{ minWidth: 18, height: 18, padding: "0 5px", fontSize: 11, fontWeight: 700, background: "var(--primary)" }}
          >
            {filterCount}
          </span>
        )}
      </button>
      <IconButton icon={theme === "light" ? "dark_mode" : "light_mode"} size={36} onClick={toggleTheme} />
    </header>
  );
}
