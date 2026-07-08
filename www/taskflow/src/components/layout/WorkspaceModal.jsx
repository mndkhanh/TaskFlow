import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useBoardData } from "../../context/BoardDataContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";

// Same stable-color scheme the board data uses, so a member keeps one accent color.
const MEMBER_COLORS = ["#0c55a3", "#0f9d58", "#d97706", "#7c3aed", "#e61c23", "#0891b2", "#be185d", "#4338ca"];
function colorForId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return MEMBER_COLORS[h % MEMBER_COLORS.length];
}
function initialsFrom(name, email) {
  const src = (name || "").trim() || (email || "").trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const ROLE_LABEL = { owner: "Owner", member: "Member", viewer: "Viewer" };

const TABS = [
  { key: "members", icon: "group", label: "Members" },
  { key: "settings", icon: "settings", label: "Settings" },
];

const inputStyle = {
  height: 40,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--border-2)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
};

const selectStyle = {
  height: 34,
  padding: "0 8px",
  borderRadius: 7,
  border: "1px solid var(--border-2)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  outline: "none",
};

const primaryBtn = {
  height: 40,
  padding: "0 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--primary)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

function Notice({ tone = "info", children }) {
  const map = {
    info: { bg: "var(--primary-soft)", fg: "var(--primary)" },
    danger: { bg: "var(--danger-soft)", fg: "var(--danger-2)" },
    success: { bg: "var(--primary-soft)", fg: "var(--primary)" },
  };
  const c = map[tone] ?? map.info;
  return (
    <div className="text-sm" style={{ padding: "9px 12px", borderRadius: 8, background: c.bg, color: c.fg }}>
      {children}
    </div>
  );
}

// ---- Members tab ------------------------------------------------------------
function MembersTab({ workspace, isOwner, members, invites, loading, error, reload }) {
  const { user } = useAuth();
  const { inviteToWorkspace, updateMemberRole, removeMember, revokeInvitation } = useBoardData();

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null); // { tone, text }
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState(null);

  const ownerCount = useMemo(() => members.filter((m) => m.role === "owner").length, [members]);

  const handleInvite = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setInviteBusy(true);
    setInviteMsg(null);
    const { status, error: inviteError, emailSent, emailError } = await inviteToWorkspace(
      workspace.id,
      value,
      inviteRole
    );
    setInviteBusy(false);
    if (inviteError) return setInviteMsg({ tone: "danger", text: inviteError.message });
    if (status === "already_member") return setInviteMsg({ tone: "info", text: `${value} is already a member.` });
    if (emailSent) {
      setInviteMsg({ tone: "success", text: `Invitation emailed to ${value}. They can accept it from their account.` });
    } else {
      // The invite is queued regardless; the email just couldn't be delivered.
      setInviteMsg({
        tone: "info",
        text: `${value} was invited and can accept it from their account.`
          + (emailError ? ` (Email not sent: ${emailError})` : ""),
      });
    }
    setEmail("");
    await reload();
  };

  const handleRole = async (memberId, role) => {
    setBusyId(memberId);
    setRowError(null);
    const { error: roleError } = await updateMemberRole(workspace.id, memberId, role);
    setBusyId(null);
    if (roleError) return setRowError(roleError.message);
    await reload();
  };

  const handleRemove = async (memberId) => {
    setBusyId(memberId);
    setRowError(null);
    const { error: removeError } = await removeMember(workspace.id, memberId);
    setBusyId(null);
    if (removeError) return setRowError(removeError.message);
    await reload();
  };

  const handleRevoke = async (inviteId) => {
    setBusyId(inviteId);
    const { error: revokeError } = await revokeInvitation(inviteId);
    setBusyId(null);
    if (revokeError) return setRowError(revokeError.message);
    await reload();
  };

  return (
    <div>
      {isOwner && (
        <form onSubmit={handleInvite} style={{ marginBottom: 20 }}>
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-3)", marginBottom: 8 }}>
            Invite by email
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="flex-1 focus:border-[var(--primary)]"
              style={inputStyle}
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ ...selectStyle, height: 40 }}>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={inviteBusy || !email.trim()}
              className="hover:bg-[var(--primary-2)] disabled:cursor-not-allowed disabled:opacity-60"
              style={primaryBtn}
            >
              {inviteBusy ? "Sending…" : "Invite"}
            </button>
          </div>
          {inviteMsg && (
            <div style={{ marginTop: 10 }}>
              <Notice tone={inviteMsg.tone}>{inviteMsg.text}</Notice>
            </div>
          )}
        </form>
      )}

      <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-3)", marginBottom: 8 }}>
        {members.length} member{members.length === 1 ? "" : "s"}
      </div>

      {error && <Notice tone="danger">{error}</Notice>}
      {loading && !members.length && <div className="text-sm" style={{ color: "var(--text-3)" }}>Loading members…</div>}
      {rowError && (
        <div style={{ marginBottom: 10 }}>
          <Notice tone="danger">{rowError}</Notice>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight: 300, margin: "0 -4px" }}>
        {members.map((m) => {
          const isSelf = m.user_id === user?.id;
          const soleOwner = m.role === "owner" && ownerCount === 1;
          const rowBusy = busyId === m.user_id;
          return (
            <div key={m.user_id} className="flex items-center gap-3 rounded-lg" style={{ padding: "8px 4px" }}>
              <Avatar initials={initialsFrom(m.display_name, m.email)} color={colorForId(m.user_id)} src={m.avatar_url} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold">
                    {m.display_name || m.email}
                  </span>
                  {isSelf && (
                    <span
                      className="flex-none rounded text-xs font-bold"
                      style={{ padding: "1px 6px", background: "var(--surface-2)", color: "var(--text-3)" }}
                    >
                      You
                    </span>
                  )}
                </div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs" style={{ color: "var(--text-3)" }}>
                  {m.email}
                </div>
              </div>

              {isOwner ? (
                <select
                  value={m.role}
                  disabled={rowBusy || soleOwner}
                  onChange={(e) => handleRole(m.user_id, e.target.value)}
                  title={soleOwner ? "A workspace must have at least one owner." : undefined}
                  style={{ ...selectStyle, opacity: soleOwner ? 0.6 : 1 }}
                >
                  <option value="owner">Owner</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : (
                <span className="text-xs font-bold" style={{ color: "var(--text-2)" }}>
                  {ROLE_LABEL[m.role]}
                </span>
              )}

              {isOwner && !isSelf && (
                <button
                  type="button"
                  onClick={() => handleRemove(m.user_id)}
                  disabled={rowBusy}
                  title="Remove from workspace"
                  className="flex flex-none items-center justify-center rounded-md cursor-pointer hover:bg-[var(--danger-soft)] disabled:opacity-50"
                  style={{ width: 32, height: 32, border: "none", background: "none", color: "var(--danger)" }}
                >
                  <Icon name="person_remove" size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {invites.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-3)", marginBottom: 8 }}>
            Pending invitations
          </div>
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3" style={{ padding: "8px 4px" }}>
              <span
                className="flex flex-none items-center justify-center rounded-full"
                style={{ width: 34, height: 34, background: "var(--surface-2)", color: "var(--text-3)" }}
              >
                <Icon name="mail" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold">{inv.email}</div>
                <div className="text-xs" style={{ color: "var(--text-3)" }}>Invited as {ROLE_LABEL[inv.role]} · pending</div>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRevoke(inv.id)}
                  disabled={busyId === inv.id}
                  className="rounded-md text-xs font-bold cursor-pointer hover:bg-[var(--surface-2)] disabled:opacity-50"
                  style={{ height: 30, padding: "0 10px", border: "1px solid var(--border-2)", background: "none", color: "var(--text-2)" }}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Settings tab -----------------------------------------------------------
function SettingsTab({ workspace, isOwner, ownerCount, onClose }) {
  const { renameWorkspace, deleteWorkspace, leaveWorkspace } = useBoardData();

  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const dirty = name.trim() !== workspace.name || (description.trim() || "") !== (workspace.description || "");
  const soleOwner = isOwner && ownerCount === 1;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMsg(false);
    const { error: saveError } = await renameWorkspace(workspace.id, { name, description });
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setSavedMsg(true);
  };

  const handleLeave = async () => {
    setBusy(true);
    setError(null);
    const { error: leaveError } = await leaveWorkspace(workspace.id);
    setBusy(false);
    if (leaveError) return setError(leaveError.message);
    onClose();
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    const { error: deleteError } = await deleteWorkspace(workspace.id);
    setBusy(false);
    if (deleteError) return setError(deleteError.message);
    onClose();
  };

  return (
    <div>
      <form onSubmit={handleSave} style={{ marginBottom: 24 }}>
        <label className="block text-sm font-semibold" style={{ marginBottom: 7 }}>Workspace name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isOwner}
          maxLength={80}
          className="w-full focus:border-[var(--primary)] disabled:opacity-70"
          style={{ ...inputStyle, height: 44, marginBottom: 16 }}
        />

        <label className="block text-sm font-semibold" style={{ marginBottom: 7 }}>
          Description <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!isOwner}
          maxLength={280}
          placeholder="What is this workspace for?"
          className="w-full resize-none focus:border-[var(--primary)] disabled:opacity-70"
          style={{ ...inputStyle, height: "auto", minHeight: 74, padding: "10px 12px" }}
        />

        {error && (
          <div style={{ marginTop: 14 }}>
            <Notice tone="danger">{error}</Notice>
          </div>
        )}

        {isOwner && (
          <div className="flex items-center gap-3" style={{ marginTop: 16 }}>
            <button
              type="submit"
              disabled={saving || !dirty}
              className="hover:bg-[var(--primary-2)] disabled:cursor-not-allowed disabled:opacity-60"
              style={primaryBtn}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {savedMsg && !dirty && <span className="text-sm" style={{ color: "var(--text-3)" }}>Saved.</span>}
          </div>
        )}
        {!isOwner && (
          <div style={{ marginTop: 14 }}>
            <Notice tone="info">Only the workspace owner can change these settings.</Notice>
          </div>
        )}
      </form>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
        <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--danger)", marginBottom: 12 }}>
          Danger zone
        </div>

        {/* Leave — available to anyone who isn't the sole owner. */}
        <div className="flex items-center justify-between gap-3" style={{ marginBottom: 12 }}>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Leave workspace</div>
            <div className="text-xs" style={{ color: "var(--text-3)" }}>
              {soleOwner
                ? "You're the only owner — assign another owner or delete the workspace instead."
                : "Remove yourself from this workspace."}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLeave}
            disabled={busy || soleOwner}
            className="flex-none rounded-lg text-sm font-bold cursor-pointer hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ height: 38, padding: "0 14px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
          >
            Leave
          </button>
        </div>

        {/* Delete — owner only. */}
        {isOwner && (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Delete workspace</div>
              <div className="text-xs" style={{ color: "var(--text-3)" }}>
                Permanently delete this workspace and all its boards, lists, and cards.
              </div>
            </div>
            {confirmDelete ? (
              <div className="flex flex-none items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg text-sm font-bold cursor-pointer hover:bg-[var(--surface-2)]"
                  style={{ height: 38, padding: "0 12px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--danger-2)] disabled:opacity-60"
                  style={{ height: 38, padding: "0 14px", border: "none", background: "var(--danger)" }}
                >
                  {busy ? "Deleting…" : "Delete forever"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex-none rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--danger-2)]"
                style={{ height: 38, padding: "0 14px", border: "none", background: "var(--danger)" }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkspaceModal({ initialTab = "members", onClose }) {
  const { activeWorkspace, activeRole, listWorkspaceMembers, listWorkspaceInvitations } = useBoardData();
  const [tab, setTab] = useState(initialTab);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const workspaceId = activeWorkspace?.id ?? null;
  const isOwner = activeRole === "owner";
  const ownerCount = useMemo(() => members.filter((m) => m.role === "owner").length, [members]);

  const reload = useCallback(async () => {
    if (!workspaceId) return;
    const [mRes, iRes] = await Promise.all([listWorkspaceMembers(workspaceId), listWorkspaceInvitations(workspaceId)]);
    if (mRes.error) setError(mRes.error.message);
    else setMembers(mRes.members);
    if (!iRes.error) setInvites(iRes.invitations);
    setLoading(false);
  }, [workspaceId, listWorkspaceMembers, listWorkspaceInvitations]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      if (!workspaceId) return;
      const [mRes, iRes] = await Promise.all([listWorkspaceMembers(workspaceId), listWorkspaceInvitations(workspaceId)]);
      if (cancelled) return;
      if (mRes.error) setError(mRes.error.message);
      else setMembers(mRes.members);
      if (!iRes.error) setInvites(iRes.invitations);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, listWorkspaceMembers, listWorkspaceInvitations]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!activeWorkspace) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(10,15,25,0.55)", backdropFilter: "blur(2px)", padding: "64px 20px", animation: "tf-fade .12s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-hidden rounded-2xl"
        style={{ maxWidth: 560, background: "var(--surface)", boxShadow: "var(--shadow-lg)", animation: "tf-pop .16s ease" }}
      >
        <div className="flex items-start gap-3.5" style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <span
            className="flex flex-none items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ width: 34, height: 34, background: activeWorkspace.color }}
          >
            {activeWorkspace.initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-extrabold tracking-tight">
              {activeWorkspace.name}
            </div>
            <div className="text-sm" style={{ color: "var(--text-3)" }}>Manage members and workspace settings</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex flex-none items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-3)]"
            style={{ width: 34, height: 34, border: "none", background: "var(--surface-2)", color: "var(--text-2)" }}
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1" style={{ padding: "10px 16px 0" }}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 text-sm font-bold cursor-pointer"
                style={{
                  padding: "8px 12px",
                  border: "none",
                  background: "none",
                  color: active ? "var(--primary)" : "var(--text-3)",
                  borderBottom: `2px solid ${active ? "var(--primary)" : "transparent"}`,
                }}
              >
                <Icon name={t.icon} size={18} />
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ height: 1, background: "var(--border)", marginTop: -1 }} />

        <div style={{ padding: "20px 24px 24px" }}>
          {tab === "members" ? (
            <MembersTab
              workspace={activeWorkspace}
              isOwner={isOwner}
              members={members}
              invites={invites}
              loading={loading}
              error={error}
              reload={reload}
            />
          ) : (
            <SettingsTab workspace={activeWorkspace} isOwner={isOwner} ownerCount={ownerCount} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
