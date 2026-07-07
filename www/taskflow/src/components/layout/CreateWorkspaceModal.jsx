import { useState } from "react";
import { useBoardData } from "../../context/BoardDataContext";
import Icon from "../ui/Icon";

export default function CreateWorkspaceModal({ onClose }) {
  const { createWorkspace } = useBoardData();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Please enter a workspace name.");

    setError("");
    setSubmitting(true);
    const { error: createError } = await createWorkspace(trimmed, description.trim() || null);
    setSubmitting(false);

    if (createError) return setError(createError.message);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(10,15,25,0.55)", backdropFilter: "blur(2px)", padding: "80px 20px", animation: "tf-fade .12s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-hidden rounded-2xl"
        style={{ maxWidth: 440, background: "var(--surface)", boxShadow: "var(--shadow-lg)", animation: "tf-pop .16s ease" }}
      >
        <div className="flex items-start gap-3.5" style={{ padding: "22px 26px", borderBottom: "1px solid var(--border)" }}>
          <Icon name="workspaces" size={22} style={{ color: "var(--text-3)", marginTop: 2 }} />
          <div className="flex-1">
            <div className="text-xl font-extrabold tracking-tight" style={{ lineHeight: 1.25 }}>Create workspace</div>
            <div className="text-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
              You’ll be the owner of this workspace.
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
          <label className="block text-sm font-semibold" style={{ marginBottom: 7 }}>
            Workspace name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="e.g. Marketing Team"
            className="w-full rounded-lg text-sm outline-none focus:border-[var(--primary)]"
            style={{ height: 46, padding: "0 14px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)", marginBottom: 16 }}
          />

          <label className="block text-sm font-semibold" style={{ marginBottom: 7 }}>
            Description <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            placeholder="What is this workspace for?"
            className="w-full resize-none rounded-lg text-sm outline-none focus:border-[var(--primary)]"
            style={{ minHeight: 72, padding: "10px 14px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
          />

          {error && (
            <div
              className="text-sm"
              style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: "var(--danger-soft)", color: "var(--danger-2)" }}
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
              {submitting ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
