import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBoardData } from "../../context/BoardDataContext";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import WorkspaceModal from "./WorkspaceModal";
import Icon from "../ui/Icon";

// A single row in the workspace menu.
function MenuRow({ icon, label, onClick, onMouseEnter, trailing, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="flex w-full items-center gap-2.5 rounded-md text-sm font-semibold cursor-pointer hover:bg-[var(--surface-2)]"
      style={{ padding: 8, border: "none", background: "none", color: danger ? "var(--danger)" : "var(--text)" }}
    >
      <Icon name={icon} size={18} style={{ color: danger ? "var(--danger)" : "var(--text-3)", flex: "none" }} />
      <span className="flex-1 text-left">{label}</span>
      {trailing}
    </button>
  );
}

// Small count badge used to flag pending invitations.
function CountBadge({ count, style }) {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ minWidth: 18, height: 18, padding: "0 5px", background: "var(--danger)", ...style }}
    >
      {count}
    </span>
  );
}

export default function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, selectWorkspace, myInvitations, refreshMyInvitations, acceptInvitation, declineInvitation } =
    useBoardData();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [manageTab, setManageTab] = useState(null); // "members" | "settings" | null
  const [busyInvite, setBusyInvite] = useState(null);
  const rootRef = useRef(null);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const inviteCount = myInvitations.length;

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

  // Reset the submenu whenever the whole menu closes.
  useEffect(() => {
    if (!open) setShowSwitch(false);
  }, [open]);

  // There's no realtime yet, so re-pull pending invitations each time the menu
  // opens — this is how an invite from another user shows up without a full reload.
  useEffect(() => {
    if (open) refreshMyInvitations();
  }, [open, refreshMyInvitations]);

  const closeMenu = () => {
    setOpen(false);
    setShowSwitch(false);
  };

  const handleSelect = (id) => {
    selectWorkspace(id);
    closeMenu();
  };

  const openCreate = () => {
    closeMenu();
    setShowCreate(true);
  };

  const openManage = (tab) => {
    closeMenu();
    setManageTab(tab);
  };

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate("/login");
  };

  const handleAccept = async (id) => {
    setBusyInvite(id);
    const { error } = await acceptInvitation(id);
    setBusyInvite(null);
    if (!error) closeMenu();
  };

  const handleDecline = async (id) => {
    setBusyInvite(id);
    await declineInvitation(id);
    setBusyInvite(null);
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
        {inviteCount > 0 && <CountBadge count={inviteCount} />}
        <Icon name="unfold_more" size={18} style={{ color: "var(--text-3)", flex: "none" }} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-40 rounded-lg"
          style={{
            top: "calc(100% + 6px)",
            background: "var(--surface)",
            border: "1px solid var(--border-2)",
            boxShadow: "var(--shadow-lg)",
            padding: 6,
            animation: "tf-pop .14s ease",
          }}
        >
          <MenuRow
            icon="group"
            label="Invite and manage members"
            onClick={() => openManage("members")}
            onMouseEnter={() => setShowSwitch(false)}
          />
          <MenuRow icon="settings" label="Settings" onClick={() => openManage("settings")} onMouseEnter={() => setShowSwitch(false)} />

          <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />

          {/* Switch workspace — reveals the workspace list as a flyout to the right on hover. */}
          <div
            className="relative"
            onMouseEnter={() => setShowSwitch(true)}
            onMouseLeave={() => setShowSwitch(false)}
          >
            <MenuRow
              icon="swap_horiz"
              label="Switch workspace"
              onClick={() => setShowSwitch((v) => !v)}
              trailing={
                <span className="flex items-center gap-1.5">
                  {inviteCount > 0 && <CountBadge count={inviteCount} />}
                  <Icon name="chevron_right" size={18} style={{ color: "var(--text-3)", flex: "none" }} />
                </span>
              }
            />

            {showSwitch && (
              <div
                className="absolute z-50 rounded-lg"
                style={{
                  left: "calc(100% + 6px)",
                  top: -6,
                  width: 232,
                  background: "var(--surface)",
                  border: "1px solid var(--border-2)",
                  boxShadow: "var(--shadow-lg)",
                  padding: 6,
                  animation: "tf-pop .14s ease",
                }}
              >
                <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
                  {workspaces.length === 0 && (
                    <div className="text-sm" style={{ padding: 8, color: "var(--text-3)" }}>No workspaces</div>
                  )}
                  {workspaces.map((ws) => {
                    const isActive = ws.id === activeWs?.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => handleSelect(ws.id)}
                        className="flex w-full items-center gap-2.5 rounded-md cursor-pointer hover:bg-[var(--surface-2)]"
                        style={{ padding: 8, border: "none", background: isActive ? "var(--primary-soft)" : "none" }}
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

                {/* Pending invitations addressed to the current user. */}
                {inviteCount > 0 && (
                  <>
                    <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />
                    <div
                      className="text-xs font-bold"
                      style={{ color: "var(--text-3)", letterSpacing: "0.05em", padding: "2px 8px 6px" }}
                    >
                      INVITATIONS
                    </div>
                    {myInvitations.map((inv) => {
                      const busy = busyInvite === inv.id;
                      return (
                        <div key={inv.id} className="rounded-md" style={{ padding: 8, background: "var(--surface-2)", marginBottom: 6 }}>
                          <div className="flex items-center gap-2">
                            <span
                              className="flex flex-none items-center justify-center rounded-md text-xs font-bold text-white"
                              style={{ width: 24, height: 24, background: "var(--primary)" }}
                            >
                              {(inv.workspace_name?.trim()?.[0] ?? "?").toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold">
                                {inv.workspace_name}
                              </div>
                              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs" style={{ color: "var(--text-3)" }}>
                                From {inv.invited_by_name || "a member"} · {inv.role}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5" style={{ marginTop: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleAccept(inv.id)}
                              disabled={busy}
                              className="flex-1 rounded-md text-xs font-bold text-white cursor-pointer hover:bg-[var(--primary-2)] disabled:opacity-60"
                              style={{ height: 30, border: "none", background: "var(--primary)" }}
                            >
                              {busy ? "…" : "Accept"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecline(inv.id)}
                              disabled={busy}
                              className="flex-1 rounded-md text-xs font-bold cursor-pointer hover:bg-[var(--surface-3)] disabled:opacity-60"
                              style={{ height: 30, border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text-2)" }}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

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
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />

          <MenuRow icon="logout" label="Log out" onClick={handleLogout} onMouseEnter={() => setShowSwitch(false)} danger />
        </div>
      )}

      {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
      {manageTab && <WorkspaceModal initialTab={manageTab} onClose={() => setManageTab(null)} />}
    </div>
  );
}
