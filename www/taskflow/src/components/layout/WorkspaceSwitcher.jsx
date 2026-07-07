import { useEffect, useRef, useState } from "react";
import { useBoardData } from "../../context/BoardDataContext";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import Icon from "../ui/Icon";

export default function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, selectWorkspace } = useBoardData();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const rootRef = useRef(null);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
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

  const handleSelect = (id) => {
    selectWorkspace(id);
    setOpen(false);
  };

  const openCreate = () => {
    setOpen(false);
    setShowCreate(true);
  };

  return (
    <div ref={rootRef} className="relative" style={{ marginBottom: 4 }}>
      <div
        className="text-xs font-bold"
        style={{ color: "var(--text-3)", letterSpacing: "0.06em", padding: "0 8px", marginBottom: 8 }}
      >
        WORKSPACE
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg cursor-pointer hover:bg-[var(--surface-2)]"
        style={{ padding: 8, border: "1px solid var(--border-2)", background: "var(--surface)" }}
      >
        {activeWs ? (
          <>
            <span
              className="flex flex-none items-center justify-center rounded-md text-xs font-bold text-white"
              style={{ width: 26, height: 26, background: activeWs.color }}
            >
              {activeWs.initial}
            </span>
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-semibold">
              {activeWs.name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-left text-sm font-semibold" style={{ color: "var(--text-3)" }}>
            No workspace
          </span>
        )}
        <Icon
          name="unfold_more"
          size={18}
          style={{ color: "var(--text-3)", flex: "none" }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-40 rounded-lg overflow-hidden"
          style={{
            top: "calc(100% + 6px)",
            background: "var(--surface)",
            border: "1px solid var(--border-2)",
            boxShadow: "var(--shadow-lg)",
            padding: 6,
            animation: "tf-pop .14s ease",
          }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWs?.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => handleSelect(ws.id)}
                  className="flex w-full items-center gap-2.5 rounded-md cursor-pointer hover:bg-[var(--surface-2)]"
                  style={{
                    padding: 8,
                    border: "none",
                    background: isActive ? "var(--primary-soft)" : "none",
                  }}
                >
                  <span
                    className="flex flex-none items-center justify-center rounded-md text-xs font-bold text-white"
                    style={{ width: 26, height: 26, background: ws.color }}
                  >
                    {ws.initial}
                  </span>
                  <span
                    className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-semibold"
                    style={isActive ? { color: "var(--primary)" } : { color: "var(--text)" }}
                  >
                    {ws.name}
                  </span>
                  {isActive && <Icon name="check" size={18} style={{ color: "var(--primary)", flex: "none" }} />}
                </button>
              );
            })}
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />

          <button
            type="button"
            onClick={openCreate}
            className="flex w-full items-center gap-2.5 rounded-md text-sm font-semibold cursor-pointer hover:bg-[var(--surface-2)]"
            style={{ padding: 8, border: "none", background: "none", color: "var(--primary)" }}
          >
            <span
              className="flex flex-none items-center justify-center rounded-md"
              style={{ width: 26, height: 26, background: "var(--primary-soft)" }}
            >
              <Icon name="add" size={18} style={{ color: "var(--primary)" }} />
            </span>
            Create workspace
          </button>
        </div>
      )}

      {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
