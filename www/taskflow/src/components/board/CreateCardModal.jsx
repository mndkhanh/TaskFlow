import { useState } from "react";
import { useBoardData } from "../../context/BoardDataContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";

function fromDateInput(v) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Popup form for creating a card with its attributes up front (title, description,
// due date, labels, members) rather than the old title-only inline composer.
export default function CreateCardModal({ listId, listTitle, boardColor, onClose }) {
  const { addCard, labelList, members } = useBoardData();
  const memberList = Object.values(members);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [labels, setLabels] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggle = (setter) => (id) =>
    setter((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleLabel = toggle(setLabels);
  const toggleAssignee = toggle(setAssignees);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError("Please enter a card title.");
    setError("");
    setSubmitting(true);
    const { error: createError } = await addCard(listId, t, {
      description,
      dueDate: fromDateInput(due),
      labels,
      assignees,
    });
    setSubmitting(false);
    if (createError) return setError(createError.message);
    onClose();
  };

  const fieldLabel = { color: "var(--text-3)", letterSpacing: "0.05em", marginBottom: 8 };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(10,15,25,0.55)", backdropFilter: "blur(2px)", padding: "60px 20px", animation: "tf-fade .12s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-hidden rounded-2xl"
        style={{ maxWidth: 540, background: "var(--surface)", boxShadow: "var(--shadow-lg)", animation: "tf-pop .16s ease" }}
      >
        <div style={{ height: 8, background: boardColor }} />
        <div className="flex items-start gap-3.5" style={{ padding: "20px 26px", borderBottom: "1px solid var(--border)" }}>
          <Icon name="add_card" size={22} style={{ color: "var(--text-3)", marginTop: 2 }} />
          <div className="flex-1">
            <div className="text-xl font-extrabold tracking-tight" style={{ lineHeight: 1.25 }}>Add card</div>
            <div className="text-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
              to list <strong style={{ color: "var(--text-2)" }}>{listTitle}</strong>
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

        <form onSubmit={handleSubmit} style={{ padding: "22px 26px 26px" }}>
          <div className="text-xs font-bold" style={fieldLabel}>TITLE</div>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="e.g. Design the onboarding flow"
            className="w-full rounded-lg text-sm outline-none focus:border-[var(--primary)]"
            style={{ height: 44, padding: "0 14px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)", marginBottom: 18 }}
          />

          <div className="text-xs font-bold" style={fieldLabel}>DESCRIPTION</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a more detailed description…"
            className="w-full resize-none rounded-lg text-sm outline-none focus:border-[var(--primary)]"
            style={{ minHeight: 72, padding: "10px 12px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)", lineHeight: 1.55, marginBottom: 18 }}
          />

          <div className="flex flex-wrap" style={{ gap: 22, marginBottom: 18 }}>
            <div>
              <div className="text-xs font-bold" style={fieldLabel}>DUE DATE</div>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="rounded-lg text-sm font-semibold outline-none focus:border-[var(--primary)]"
                style={{ padding: "8px 12px", border: "1px solid var(--border-2)", background: "var(--surface-2)", color: "var(--text-2)" }}
              />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold" style={fieldLabel}>MEMBERS</div>
              <div className="flex flex-wrap items-center gap-1.5" style={{ minHeight: 34 }}>
                {memberList.length === 0 && (
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>No members yet.</span>
                )}
                {memberList.map((m) => {
                  const on = assignees.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      title={m.name}
                      onClick={() => toggleAssignee(m.id)}
                      className="rounded-full cursor-pointer"
                      style={{ border: on ? "2px solid var(--primary)" : "2px solid transparent", borderRadius: 999, opacity: on ? 1 : 0.55, lineHeight: 0 }}
                    >
                      <Avatar initials={m.initials} color={m.color} size={30} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-xs font-bold" style={fieldLabel}>LABELS</div>
          <div className="flex flex-wrap gap-1.5" style={{ minHeight: 30, marginBottom: 8 }}>
            {labelList.length === 0 && (
              <span className="text-xs" style={{ color: "var(--text-3)" }}>No labels on this board yet.</span>
            )}
            {labelList.map((l) => {
              const on = labels.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLabel(l.id)}
                  className="flex items-center gap-1.5 rounded-lg text-xs font-bold text-white cursor-pointer"
                  style={{ height: 30, padding: "0 12px", background: l.color, opacity: on ? 1 : 0.4, outline: on ? "2px solid var(--text)" : "none", outlineOffset: 1 }}
                >
                  {l.name || " "}
                  {on && <Icon name="check" size={14} />}
                </button>
              );
            })}
          </div>

          {error && (
            <div
              className="text-sm"
              style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "var(--danger-soft)", color: "var(--danger-2)" }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2.5" style={{ marginTop: 22 }}>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg text-sm font-bold cursor-pointer hover:bg-[var(--surface-2)]"
              style={{ height: 42, padding: "0 18px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ height: 42, padding: "0 18px", border: "none", background: "var(--primary)" }}
            >
              {submitting ? "Adding…" : "Add card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
