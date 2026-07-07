import { useState } from "react";
import { useBoardData } from "../../context/BoardDataContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";

const MODAL_ACTIONS = [
  { icon: "person_add", label: "Members" },
  { icon: "label", label: "Labels" },
  { icon: "schedule", label: "Due date" },
  { icon: "checklist", label: "Checklist" },
  { icon: "attach_file", label: "Attachment" },
];

export default function CardModal({ card, listTitle, boardColor, onClose }) {
  const { members, labels, toggleChecklistItem, addComment } = useBoardData();
  const [commentDraft, setCommentDraft] = useState("");

  const doneCount = card.checklist.filter((i) => i.done).length;
  const totalChecklist = card.checklist.length;
  const checkPct = totalChecklist ? Math.round((doneCount / totalChecklist) * 100) : 0;
  const hasLabels = card.labels.length > 0;
  const hasDue = !!card.due;
  const hasChecklist = totalChecklist > 0;
  const hasAttach = card.attachments.length > 0;
  const hasDraft = commentDraft.trim().length > 0;

  const submitComment = () => {
    const text = commentDraft.trim();
    if (!text) return;
    addComment(card.id, text);
    setCommentDraft("");
  };

  const handleCommentKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  };

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
          <div className="flex-1">
            <div className="text-xl font-extrabold tracking-tight" style={{ lineHeight: 1.25 }}>{card.title}</div>
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
                  {card.assignees.map((id) => (
                    <Avatar key={id} title={members[id].name} initials={members[id].initials} color={members[id].color} size={34} />
                  ))}
                  <button
                    type="button"
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
                    {card.labels.map((labelId) => (
                      <span
                        key={labelId}
                        className="flex items-center rounded-lg text-xs font-bold text-white"
                        style={{ height: 30, padding: "0 12px", background: labels[labelId].color }}
                      >
                        {labels[labelId].name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasDue && (
                <div>
                  <div className="text-xs font-bold" style={{ color: "var(--text-3)", letterSpacing: "0.05em", marginBottom: 8 }}>DUE DATE</div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold"
                    style={{
                      padding: "6px 12px",
                      ...(card.due.soon ? { background: "var(--danger-soft)", color: "var(--danger)" } : { background: "var(--surface-2)", color: "var(--text-2)" }),
                    }}
                  >
                    <Icon name="schedule" size={16} />
                    {card.due.label}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5" style={{ marginBottom: 10 }}>
              <Icon name="notes" size={20} style={{ color: "var(--text-2)" }} />
              <span className="text-sm font-bold">Description</span>
            </div>
            <div className="text-sm" style={{ lineHeight: 1.6, color: "var(--text-2)", whiteSpace: "pre-line", marginBottom: 26 }}>
              {card.description || "No description yet."}
            </div>

            {hasChecklist && (
              <div style={{ marginBottom: 26 }}>
                <div className="flex items-center gap-2.5" style={{ marginBottom: 11 }}>
                  <Icon name="checklist" size={20} style={{ color: "var(--text-2)" }} />
                  <span className="flex-1 text-sm font-bold">Checklist</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>{doneCount}/{totalChecklist}</span>
                </div>
                <div className="rounded-md overflow-hidden" style={{ height: 8, background: "var(--surface-2)", marginBottom: 14 }}>
                  <div className="h-full rounded-md transition-[width]" style={{ background: "var(--primary)", width: `${checkPct}%` }} />
                </div>
                {card.checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(card.id, item.id)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg hover:bg-[var(--surface-2)]"
                    style={{ padding: "7px 8px" }}
                  >
                    <Icon name={item.done ? "check_box" : "check_box_outline_blank"} size={22} style={{ color: item.done ? "var(--primary)" : "var(--text-3)" }} />
                    <span className="text-sm" style={item.done ? { color: "var(--text-3)", textDecoration: "line-through" } : { color: "var(--text)" }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {hasAttach && (
              <div style={{ marginBottom: 26 }}>
                <div className="flex items-center gap-2.5" style={{ marginBottom: 11 }}>
                  <Icon name="attach_file" size={20} style={{ color: "var(--text-2)" }} />
                  <span className="text-sm font-bold">Attachments</span>
                </div>
                {card.attachments.map((file) => (
                  <div
                    key={file.name}
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
                      className="flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-2)]"
                      style={{ width: 32, height: 32, border: "none", background: "none", color: "var(--text-3)" }}
                    >
                      <Icon name="download" size={18} />
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
                <Avatar initials="YO" color="var(--primary)" />
                <div className="flex-1">
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={handleCommentKey}
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
              {card.comments.map((c, i) => (
                <div key={i} className="flex gap-2.5" style={{ marginBottom: 16 }}>
                  <Avatar initials={c.initials} color={c.color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2" style={{ marginBottom: 4 }}>
                      <span className="text-sm font-bold">{c.author}</span>
                      <span className="text-xs" style={{ color: "var(--text-3)" }}>{c.time}</span>
                    </div>
                    <div className="text-sm rounded-lg" style={{ lineHeight: 1.55, color: "var(--text-2)", background: "var(--surface-2)", padding: "9px 13px" }}>
                      {c.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold" style={{ color: "var(--text-3)", letterSpacing: "0.05em", marginBottom: 10 }}>ADD TO CARD</div>
            {MODAL_ACTIONS.map((act) => (
              <button
                key={act.label}
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg text-left text-sm font-semibold cursor-pointer hover:bg-[var(--surface-3)]"
                style={{ padding: "9px 12px", marginBottom: 7, border: "none", background: "var(--surface-2)", color: "var(--text)" }}
              >
                <Icon name={act.icon} size={18} style={{ color: "var(--text-2)" }} />
                {act.label}
              </button>
            ))}
            <div className="text-xs font-bold" style={{ color: "var(--text-3)", letterSpacing: "0.05em", margin: "18px 0 10px" }}>ACTIONS</div>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg text-left text-sm font-semibold cursor-pointer hover:bg-[var(--surface-3)]"
              style={{ padding: "9px 12px", marginBottom: 7, border: "none", background: "var(--surface-2)", color: "var(--text)" }}
            >
              <Icon name="archive" size={18} style={{ color: "var(--text-2)" }} />
              Archive
            </button>
            <button
              type="button"
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
