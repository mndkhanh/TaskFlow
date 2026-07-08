import { useRef, useState } from "react";
import { useBoardData, LABEL_COLORS } from "../../context/BoardDataContext";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";

function toDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fromDateInput(v) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CardModal({ card, listTitle, boardColor, onClose }) {
  const { user } = useAuth();
  const {
    members,
    labels,
    labelList,
    updateCard,
    deleteCard,
    archiveCard,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    addComment,
    deleteComment,
    toggleAssignee,
    toggleCardLabel,
    createLabel,
    uploadAttachment,
    getAttachmentUrl,
    deleteAttachment,
  } = useBoardData();

  const [panel, setPanel] = useState(null); // 'members' | 'labels' | null
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(card.description);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [newLabel, setNewLabel] = useState({ name: "", color: LABEL_COLORS[0] });
  const [uploading, setUploading] = useState(false);

  const dueRef = useRef(null);
  const checklistRef = useRef(null);
  const fileRef = useRef(null);

  const doneCount = card.checklist.filter((i) => i.done).length;
  const totalChecklist = card.checklist.length;
  const checkPct = totalChecklist ? Math.round((doneCount / totalChecklist) * 100) : 0;
  const hasLabels = card.labels.length > 0;
  const hasAttach = card.attachments.length > 0;
  const hasDraft = commentDraft.trim().length > 0;
  const myId = user?.id ?? null;

  const togglePanel = (name) => setPanel((cur) => (cur === name ? null : name));

  const saveTitle = () => {
    const t = titleDraft.trim();
    setEditingTitle(false);
    if (t && t !== card.title) updateCard(card.id, { title: t });
    else setTitleDraft(card.title);
  };

  const saveDesc = () => {
    setEditingDesc(false);
    if (descDraft !== card.description) updateCard(card.id, { description: descDraft });
  };

  const submitChecklist = () => {
    const t = checklistDraft.trim();
    if (!t) return;
    addChecklistItem(card.id, t);
    setChecklistDraft("");
  };

  const submitComment = () => {
    const text = commentDraft.trim();
    if (!text) return;
    addComment(card.id, text);
    setCommentDraft("");
  };

  const submitNewLabel = () => {
    const color = newLabel.color;
    createLabel(newLabel.name, color).then((res) => {
      if (res?.data) toggleCardLabel(card.id, res.data.id);
    });
    setNewLabel({ name: "", color: LABEL_COLORS[0] });
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    await uploadAttachment(card.id, file);
    setUploading(false);
  };

  const openAttachment = async (att) => {
    const res = await getAttachmentUrl(att.path);
    if (res.url) window.open(res.url, "_blank", "noopener");
  };

  const dueSet = !!card.dueDate;
  const sidePanelBtn =
    "flex w-full items-center gap-2.5 rounded-lg text-left text-sm font-semibold cursor-pointer hover:bg-[var(--surface-3)]";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(10,15,25,0.55)", backdropFilter: "blur(2px)", padding: "48px 20px", animation: "tf-fade .12s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-hidden rounded-2xl"
        style={{ maxWidth: 760, background: "var(--surface)", boxShadow: "var(--shadow-lg)", animation: "tf-pop .16s ease" }}
      >
        <div style={{ height: 8, background: boardColor }} />
        <div className="flex items-start gap-3.5" style={{ padding: "22px 26px", borderBottom: "1px solid var(--border)" }}>
          <Icon name="credit_card" size={22} style={{ color: "var(--text-3)", marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setTitleDraft(card.title);
                    setEditingTitle(false);
                  }
                }}
                className="w-full rounded-lg text-xl font-extrabold tracking-tight outline-none focus:border-[var(--primary)]"
                style={{ padding: "3px 8px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)", lineHeight: 1.25 }}
              />
            ) : (
              <div
                onClick={() => {
                  setTitleDraft(card.title);
                  setEditingTitle(true);
                }}
                className="text-xl font-extrabold tracking-tight cursor-text rounded-lg hover:bg-[var(--surface-2)]"
                style={{ lineHeight: 1.25, padding: "3px 8px", margin: "0 -8px" }}
              >
                {card.title}
              </div>
            )}
            <div className="text-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
              in list <strong style={{ color: "var(--text-2)" }}>{listTitle}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-3)]"
            style={{ width: 36, height: 36, border: "none", background: "var(--surface-2)", color: "var(--text-2)" }}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="grid gap-6.5" style={{ gridTemplateColumns: "1fr 200px", padding: "24px 26px 28px" }}>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-6.5" style={{ marginBottom: 22 }}>
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--text-3)", letterSpacing: "0.05em", marginBottom: 8 }}>MEMBERS</div>
                <div className="flex gap-1.5">
                  {card.assignees.map((id) =>
                    members[id] ? (
                      <Avatar key={id} title={members[id].name} initials={members[id].initials} color={members[id].color} src={members[id].avatarUrl} size={34} />
                    ) : null
                  )}
                  <button
                    type="button"
                    onClick={() => togglePanel("members")}
                    className="flex items-center justify-center rounded-full cursor-pointer hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    style={{ width: 34, height: 34, border: "1px dashed var(--border-2)", background: "none", color: "var(--text-3)" }}
                  >
                    <Icon name="add" size={18} />
                  </button>
                </div>
              </div>

              {hasLabels && (
                <div>
                  <div className="text-xs font-bold" style={{ color: "var(--text-3)", letterSpacing: "0.05em", marginBottom: 8 }}>LABELS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {card.labels.map((labelId) =>
                      labels[labelId] ? (
                        <span
                          key={labelId}
                          className="flex items-center rounded-lg text-xs font-bold text-white"
                          style={{ height: 30, padding: "0 12px", background: labels[labelId].color }}
                        >
                          {labels[labelId].name || " "}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-bold" style={{ color: "var(--text-3)", letterSpacing: "0.05em", marginBottom: 8 }}>DUE DATE</div>
                <div className="flex items-center gap-2">
                  <input
                    ref={dueRef}
                    type="date"
                    value={toDateInput(card.dueDate)}
                    onChange={(e) => updateCard(card.id, { dueDate: fromDateInput(e.target.value) })}
                    className="rounded-lg text-sm font-semibold outline-none focus:border-[var(--primary)]"
                    style={{
                      padding: "6px 10px",
                      border: "1px solid var(--border-2)",
                      background: dueSet && card.due?.soon ? "var(--danger-soft)" : "var(--surface-2)",
                      color: dueSet && card.due?.soon ? "var(--danger)" : "var(--text-2)",
                    }}
                  />
                  {dueSet && (
                    <button
                      type="button"
                      title="Clear due date"
                      onClick={() => updateCard(card.id, { dueDate: null })}
                      className="flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-2)]"
                      style={{ width: 30, height: 30, border: "none", background: "none", color: "var(--text-3)" }}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5" style={{ marginBottom: 10 }}>
              <Icon name="notes" size={20} style={{ color: "var(--text-2)" }} />
              <span className="flex-1 text-sm font-bold">Description</span>
              {!editingDesc && (
                <button
                  type="button"
                  onClick={() => {
                    setDescDraft(card.description);
                    setEditingDesc(true);
                  }}
                  className="text-xs font-semibold cursor-pointer rounded-md hover:bg-[var(--surface-2)]"
                  style={{ padding: "4px 8px", border: "none", background: "none", color: "var(--text-3)" }}
                >
                  Edit
                </button>
              )}
            </div>
            {editingDesc ? (
              <div style={{ marginBottom: 26 }}>
                <textarea
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  placeholder="Add a more detailed description…"
                  className="w-full resize-none rounded-lg text-sm outline-none focus:border-[var(--primary)]"
                  style={{ minHeight: 96, padding: "10px 12px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)", lineHeight: 1.6 }}
                />
                <div className="flex gap-2" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={saveDesc}
                    className="rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)]"
                    style={{ height: 34, padding: "0 15px", border: "none", background: "var(--primary)" }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDescDraft(card.description);
                      setEditingDesc(false);
                    }}
                    className="rounded-lg text-sm font-semibold cursor-pointer hover:bg-[var(--surface-3)]"
                    style={{ height: 34, padding: "0 15px", border: "none", background: "var(--surface-2)", color: "var(--text-2)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  setDescDraft(card.description);
                  setEditingDesc(true);
                }}
                className="text-sm cursor-text rounded-lg hover:bg-[var(--surface-2)]"
                style={{ lineHeight: 1.6, color: card.description ? "var(--text-2)" : "var(--text-3)", whiteSpace: "pre-line", marginBottom: 26, padding: "8px 10px", margin: "0 -10px 26px" }}
              >
                {card.description || "Add a more detailed description…"}
              </div>
            )}

            <div style={{ marginBottom: 26 }}>
              <div className="flex items-center gap-2.5" style={{ marginBottom: 11 }}>
                <Icon name="checklist" size={20} style={{ color: "var(--text-2)" }} />
                <span className="flex-1 text-sm font-bold">Checklist</span>
                {totalChecklist > 0 && (
                  <span className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>{doneCount}/{totalChecklist}</span>
                )}
              </div>
              {totalChecklist > 0 && (
                <div className="rounded-md overflow-hidden" style={{ height: 8, background: "var(--surface-2)", marginBottom: 14 }}>
                  <div className="h-full rounded-md transition-[width]" style={{ background: "var(--primary)", width: `${checkPct}%` }} />
                </div>
              )}
              {card.checklist.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-2.5 rounded-lg hover:bg-[var(--surface-2)]"
                  style={{ padding: "7px 8px" }}
                >
                  <button
                    type="button"
                    onClick={() => toggleChecklistItem(card.id, item.id)}
                    className="flex items-center cursor-pointer"
                    style={{ border: "none", background: "none", padding: 0 }}
                  >
                    <Icon name={item.done ? "check_box" : "check_box_outline_blank"} size={22} style={{ color: item.done ? "var(--primary)" : "var(--text-3)" }} />
                  </button>
                  <span className="flex-1 text-sm" style={item.done ? { color: "var(--text-3)", textDecoration: "line-through" } : { color: "var(--text)" }}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteChecklistItem(card.id, item.id)}
                    className="flex items-center justify-center rounded-md cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-3)]"
                    style={{ width: 26, height: 26, border: "none", background: "none", color: "var(--text-3)" }}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                <input
                  ref={checklistRef}
                  value={checklistDraft}
                  onChange={(e) => setChecklistDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitChecklist();
                  }}
                  placeholder="Add an item…"
                  className="flex-1 rounded-lg text-sm outline-none focus:border-[var(--primary)]"
                  style={{ padding: "8px 10px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
                />
                {checklistDraft.trim() && (
                  <button
                    type="button"
                    onClick={submitChecklist}
                    className="rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)]"
                    style={{ height: 34, padding: "0 13px", border: "none", background: "var(--primary)" }}
                  >
                    Add
                  </button>
                )}
              </div>
            </div>

            {hasAttach && (
              <div style={{ marginBottom: 26 }}>
                <div className="flex items-center gap-2.5" style={{ marginBottom: 11 }}>
                  <Icon name="attach_file" size={20} style={{ color: "var(--text-2)" }} />
                  <span className="text-sm font-bold">Attachments</span>
                </div>
                {card.attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg"
                    style={{ padding: "10px 12px", border: "1px solid var(--border)", marginBottom: 8 }}
                  >
                    <span
                      className="flex items-center justify-center rounded-lg text-xs font-bold"
                      style={{ width: 40, height: 40, background: "var(--primary-soft)", color: "var(--primary)", fontFamily: "'JetBrains Mono',monospace" }}
                    >
                      {file.ext}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold">{file.name}</div>
                      <div className="text-xs" style={{ color: "var(--text-3)" }}>{file.size}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAttachment(file)}
                      className="flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-2)]"
                      style={{ width: 32, height: 32, border: "none", background: "none", color: "var(--text-3)" }}
                    >
                      <Icon name="download" size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAttachment(card.id, file)}
                      className="flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-2)]"
                      style={{ width: 32, height: 32, border: "none", background: "none", color: "var(--text-3)" }}
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2.5" style={{ marginBottom: 13 }}>
                <Icon name="chat_bubble_outline" size={20} style={{ color: "var(--text-2)" }} />
                <span className="text-sm font-bold">Activity</span>
              </div>
              <div className="flex gap-2.5" style={{ marginBottom: 18 }}>
                <Avatar initials={members[myId]?.initials ?? "?"} color={members[myId]?.color ?? "var(--primary)"} src={members[myId]?.avatarUrl} />
                <div className="flex-1">
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitComment();
                      }
                    }}
                    placeholder="Write a comment…"
                    className="w-full resize-none rounded-lg text-sm outline-none focus:border-[var(--primary)]"
                    style={{ minHeight: 42, padding: "10px 12px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
                  />
                  {hasDraft && (
                    <button
                      type="button"
                      onClick={submitComment}
                      className="rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)]"
                      style={{ marginTop: 8, height: 34, padding: "0 15px", border: "none", background: "var(--primary)" }}
                    >
                      Comment
                    </button>
                  )}
                </div>
              </div>
              {card.comments.map((c) => {
                const author = members[c.userId];
                return (
                  <div key={c.id} className="group flex gap-2.5" style={{ marginBottom: 16 }}>
                    <Avatar initials={author?.initials ?? "?"} color={author?.color ?? "var(--text-3)"} src={author?.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2" style={{ marginBottom: 4 }}>
                        <span className="text-sm font-bold">{author?.name ?? "Member"}</span>
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>{timeAgo(c.createdAt)}</span>
                        {c.userId === myId && (
                          <button
                            type="button"
                            onClick={() => deleteComment(card.id, c.id)}
                            className="text-xs font-semibold cursor-pointer opacity-0 group-hover:opacity-100"
                            style={{ border: "none", background: "none", color: "var(--text-3)" }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="text-sm rounded-lg" style={{ lineHeight: 1.55, color: "var(--text-2)", background: "var(--surface-2)", padding: "9px 13px" }}>
                        {c.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="text-xs font-bold" style={{ color: "var(--text-3)", letterSpacing: "0.05em", marginBottom: 10 }}>ADD TO CARD</div>

            <div className="relative">
              <button type="button" onClick={() => togglePanel("members")} className={sidePanelBtn} style={{ padding: "9px 12px", marginBottom: 7, border: "none", background: "var(--surface-2)", color: "var(--text)" }}>
                <Icon name="person_add" size={18} style={{ color: "var(--text-2)" }} />
                Members
              </button>
              {panel === "members" && (
                <Popover title="Members" onClose={() => setPanel(null)}>
                  {Object.values(members).length === 0 && (
                    <div className="text-xs" style={{ color: "var(--text-3)", padding: "4px 2px" }}>No members in this workspace.</div>
                  )}
                  {Object.values(members).map((m) => {
                    const on = card.assignees.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleAssignee(card.id, m.id)}
                        className="flex w-full items-center gap-2.5 rounded-lg cursor-pointer hover:bg-[var(--surface-2)]"
                        style={{ padding: "6px 8px", border: "none", background: "none", color: "var(--text)" }}
                      >
                        <Avatar initials={m.initials} color={m.color} src={m.avatarUrl} size={28} />
                        <span className="flex-1 text-left text-sm font-semibold truncate">{m.name}</span>
                        {on && <Icon name="check" size={18} style={{ color: "var(--primary)" }} />}
                      </button>
                    );
                  })}
                </Popover>
              )}
            </div>

            <div className="relative">
              <button type="button" onClick={() => togglePanel("labels")} className={sidePanelBtn} style={{ padding: "9px 12px", marginBottom: 7, border: "none", background: "var(--surface-2)", color: "var(--text)" }}>
                <Icon name="label" size={18} style={{ color: "var(--text-2)" }} />
                Labels
              </button>
              {panel === "labels" && (
                <Popover title="Labels" onClose={() => setPanel(null)}>
                  {labelList.map((l) => {
                    const on = card.labels.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggleCardLabel(card.id, l.id)}
                        className="flex w-full items-center gap-2.5 rounded-lg cursor-pointer hover:bg-[var(--surface-2)]"
                        style={{ padding: "5px 6px", border: "none", background: "none" }}
                      >
                        <span className="flex flex-1 items-center rounded-md text-xs font-bold text-white" style={{ height: 28, padding: "0 10px", background: l.color }}>
                          {l.name || " "}
                        </span>
                        {on && <Icon name="check" size={18} style={{ color: "var(--primary)" }} />}
                      </button>
                    );
                  })}
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8 }}>
                    <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 8 }}>
                      {LABEL_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewLabel((n) => ({ ...n, color: c }))}
                          className="rounded-md cursor-pointer"
                          style={{ width: 22, height: 22, background: c, border: newLabel.color === c ? "2px solid var(--text)" : "2px solid transparent" }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newLabel.name}
                        onChange={(e) => setNewLabel((n) => ({ ...n, name: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitNewLabel();
                        }}
                        placeholder="New label name"
                        className="flex-1 min-w-0 rounded-lg text-sm outline-none focus:border-[var(--primary)]"
                        style={{ padding: "7px 9px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
                      />
                      <button
                        type="button"
                        onClick={submitNewLabel}
                        className="rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)]"
                        style={{ height: 34, padding: "0 12px", border: "none", background: "var(--primary)" }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </Popover>
              )}
            </div>

            <button type="button" onClick={() => dueRef.current?.focus()} className={sidePanelBtn} style={{ padding: "9px 12px", marginBottom: 7, border: "none", background: "var(--surface-2)", color: "var(--text)" }}>
              <Icon name="schedule" size={18} style={{ color: "var(--text-2)" }} />
              Due date
            </button>
            <button
              type="button"
              onClick={() => {
                checklistRef.current?.focus();
                checklistRef.current?.scrollIntoView({ block: "center" });
              }}
              className={sidePanelBtn}
              style={{ padding: "9px 12px", marginBottom: 7, border: "none", background: "var(--surface-2)", color: "var(--text)" }}
            >
              <Icon name="checklist" size={18} style={{ color: "var(--text-2)" }} />
              Checklist
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={sidePanelBtn} style={{ padding: "9px 12px", marginBottom: 7, border: "none", background: "var(--surface-2)", color: "var(--text)", opacity: uploading ? 0.6 : 1 }}>
              <Icon name="attach_file" size={18} style={{ color: "var(--text-2)" }} />
              {uploading ? "Uploading…" : "Attachment"}
            </button>
            <input ref={fileRef} type="file" onChange={onPickFile} style={{ display: "none" }} />

            <div className="text-xs font-bold" style={{ color: "var(--text-3)", letterSpacing: "0.05em", margin: "18px 0 10px" }}>ACTIONS</div>
            <button
              type="button"
              onClick={() => archiveCard(card.id)}
              className={sidePanelBtn}
              style={{ padding: "9px 12px", marginBottom: 7, border: "none", background: "var(--surface-2)", color: "var(--text)" }}
            >
              <Icon name="archive" size={18} style={{ color: "var(--text-2)" }} />
              Archive
            </button>
            <button
              type="button"
              onClick={() => deleteCard(card.id)}
              className="flex w-full items-center gap-2.5 rounded-lg text-left text-sm font-semibold cursor-pointer hover:bg-[var(--danger)] hover:text-white"
              style={{ padding: "9px 12px", border: "none", background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              <Icon name="delete" size={18} />
              Delete card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// A small dropdown panel anchored under its trigger button in the right column.
function Popover({ title, onClose, children }) {
  return (
    <div
      className="absolute z-10 rounded-xl"
      style={{ top: "100%", right: 0, width: 250, marginTop: 4, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", padding: 12 }}
    >
      <div className="flex items-center" style={{ marginBottom: 8 }}>
        <span className="flex-1 text-xs font-bold" style={{ color: "var(--text-2)", letterSpacing: "0.04em" }}>{title.toUpperCase()}</span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center rounded-md cursor-pointer hover:bg-[var(--surface-2)]"
          style={{ width: 24, height: 24, border: "none", background: "none", color: "var(--text-3)" }}
        >
          <Icon name="close" size={15} />
        </button>
      </div>
      {children}
    </div>
  );
}
