import { useRef, useState } from "react";
import { useBoardData, LABEL_COLORS } from "../../context/BoardDataContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";

const TABS = [
  { key: "info", icon: "info", label: "Info" },
  { key: "members", icon: "group", label: "Members" },
  { key: "labels", icon: "sell", label: "Labels" },
  { key: "filter", icon: "tune", label: "Filter" },
];

const DUE_OPTIONS = [
  { key: "any", label: "Any" },
  { key: "has", label: "Has due" },
  { key: "soon", label: "Due soon" },
  { key: "none", label: "No due" },
];

export const EMPTY_FILTER = { keyword: "", members: [], labels: [], due: "any" };

export function filterActiveCount(filter) {
  let n = 0;
  if (filter.keyword.trim()) n += 1;
  n += filter.members.length;
  n += filter.labels.length;
  if (filter.due !== "any") n += 1;
  return n;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// A small labelled section wrapper used across tabs.
function Field({ label, children, action }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 7 }}>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  height: 38,
  padding: "0 11px",
  border: "1px solid var(--border-2)",
  background: "var(--surface)",
  color: "var(--text)",
};

// ---- Info tab ---------------------------------------------------------------
function InfoTab({ board, lists, onBoardDeleted }) {
  const { renameBoard, deleteBoard, setBoardBannerUrl, updateBoardBanner, removeBoardBanner } = useBoardData();
  const [name, setName] = useState(board.name);
  const [bannerUrl, setBannerUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const cardCount = lists.reduce((sum, l) => sum + l.cards.length, 0);

  const saveName = async () => {
    const t = name.trim();
    if (!t || t === board.name) return setName(board.name);
    await renameBoard(board.id, t);
  };

  const applyUrl = async () => {
    setError("");
    setBusy(true);
    const { error: err } = await setBoardBannerUrl(board.id, bannerUrl);
    setBusy(false);
    if (err) return setError(err.message);
    setBannerUrl("");
  };

  const applyUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    const { error: err } = await updateBoardBanner(board.id, file);
    setBusy(false);
    if (err) setError(err.message);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete board "${board.name}" and everything in it? This can't be undone.`)) return;
    setBusy(true);
    const { error: err } = await deleteBoard(board.id);
    setBusy(false);
    if (err) return setError(err.message);
    onBoardDeleted();
  };

  return (
    <div>
      <Field label="Board name">
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setName(board.name);
            }}
            className="min-w-0 flex-1 rounded-lg text-sm font-semibold outline-none focus:border-[var(--primary)]"
            style={inputStyle}
          />
        </div>
      </Field>

      <Field label="Banner">
        {board.image && (
          <div className="relative overflow-hidden rounded-lg" style={{ height: 84, marginBottom: 8, border: "1px solid var(--border-2)" }}>
            <img src={board.image} alt="Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <input
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyUrl();
              }
            }}
            placeholder="https://…/image.jpg"
            className="min-w-0 flex-1 rounded-lg text-sm outline-none focus:border-[var(--primary)]"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={applyUrl}
            disabled={busy || !bannerUrl.trim()}
            className="flex-none rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ height: 38, padding: "0 13px", border: "none", background: "var(--primary)" }}
          >
            Set
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={applyUpload} style={{ display: "none" }} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold cursor-pointer hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ height: 38, border: "2px dashed var(--border-2)", background: "none", color: "var(--text-2)" }}
          >
            <Icon name="upload" size={17} />
            Upload
          </button>
          {board.image && (
            <button
              type="button"
              onClick={() => removeBoardBanner(board.id)}
              disabled={busy}
              title="Remove banner"
              className="flex flex-none items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ width: 38, height: 38, border: "1px solid var(--border-2)", background: "none", color: "var(--danger)" }}
            >
              <Icon name="delete" size={17} />
            </button>
          )}
        </div>
        {error && <div className="text-xs" style={{ marginTop: 8, color: "var(--danger-2)" }}>{error}</div>}
      </Field>

      <Field label="Details">
        <div className="rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
          {[
            ["Created", fmtDate(board.created)],
            ["Lists", String(lists.length)],
            ["Cards", String(cardCount)],
            ["Status", board.archived ? "Archived" : "Active"],
          ].map(([k, v], i) => (
            <div
              key={k}
              className="flex items-center justify-between"
              style={{ padding: "9px 12px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <span style={{ color: "var(--text-3)" }}>{k}</span>
              <span className="font-semibold" style={{ color: "var(--text)" }}>{v}</span>
            </div>
          ))}
        </div>
      </Field>

      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg text-sm font-bold cursor-pointer hover:bg-[var(--danger)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        style={{ height: 40, border: "1px solid var(--danger)", background: "none", color: "var(--danger)" }}
      >
        <Icon name="delete" size={17} />
        Delete board
      </button>
    </div>
  );
}

// ---- Members tab ------------------------------------------------------------
function MembersTab() {
  const { members } = useBoardData();
  const list = Object.values(members);
  if (list.length === 0) {
    return <div className="text-sm" style={{ color: "var(--text-3)" }}>No members yet.</div>;
  }
  return (
    <div className="flex flex-col gap-1">
      {list.map((m) => (
        <div key={m.id} className="flex items-center gap-2.5 rounded-lg" style={{ padding: "7px 8px" }}>
          <Avatar initials={m.initials} color={m.color} src={m.avatarUrl} size={30} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: "var(--text)" }}>{m.name}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Labels tab -------------------------------------------------------------
function LabelRow({ label }) {
  const { updateLabel, deleteLabel } = useBoardData();
  const [name, setName] = useState(label.name);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="rounded-lg" style={{ border: "1px solid var(--border)", background: "var(--surface-2)", padding: 8, marginBottom: 6 }}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaletteOpen((v) => !v)}
          title="Change color"
          className="flex-none rounded cursor-pointer"
          style={{ width: 26, height: 26, background: label.color, border: "2px solid var(--surface)", boxShadow: "0 0 0 1px var(--border-2)" }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() !== label.name && updateLabel(label.id, { name: name.trim() })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="Label name"
          className="min-w-0 flex-1 rounded-md text-sm outline-none focus:border-[var(--primary)]"
          style={{ height: 32, padding: "0 9px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
        />
        <button
          type="button"
          onClick={() => deleteLabel(label.id)}
          title="Delete label"
          className="flex flex-none items-center justify-center rounded-md cursor-pointer hover:bg-[var(--danger-soft)]"
          style={{ width: 30, height: 30, border: "none", background: "none", color: "var(--text-3)" }}
        >
          <Icon name="delete" size={16} />
        </button>
      </div>
      {paletteOpen && (
        <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                updateLabel(label.id, { color: c });
                setPaletteOpen(false);
              }}
              className="rounded cursor-pointer"
              style={{ width: 24, height: 24, background: c, border: c === label.color ? "2px solid var(--text)" : "2px solid transparent" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LabelsTab() {
  const { labelList, createLabel } = useBoardData();
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0]);

  const add = async () => {
    if (!draft.trim()) return;
    await createLabel(draft.trim(), color);
    setDraft("");
  };

  return (
    <div>
      {labelList.length === 0 && (
        <div className="text-sm" style={{ color: "var(--text-3)", marginBottom: 12 }}>No labels yet.</div>
      )}
      {labelList.map((l) => (
        <LabelRow key={l.id} label={l} />
      ))}

      <div className="rounded-lg" style={{ border: "1px dashed var(--border-2)", padding: 10, marginTop: 10 }}>
        <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-3)", marginBottom: 8 }}>New label</div>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Label name"
          className="w-full rounded-md text-sm outline-none focus:border-[var(--primary)]"
          style={{ height: 34, padding: "0 9px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)", marginBottom: 8 }}
        />
        <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 10 }}>
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="rounded cursor-pointer"
              style={{ width: 22, height: 22, background: c, border: c === color ? "2px solid var(--text)" : "2px solid transparent" }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="flex w-full items-center justify-center gap-1.5 rounded-md text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ height: 36, border: "none", background: "var(--primary)" }}
        >
          <Icon name="add" size={17} />
          Add label
        </button>
      </div>
    </div>
  );
}

// ---- Filter & View tab ------------------------------------------------------
function Segmented({ options, value, onChange }) {
  return (
    <div className="flex" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 2, gap: 2 }}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-semibold cursor-pointer"
            style={{
              height: 30,
              border: "none",
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--text)" : "var(--text-3)",
              boxShadow: active ? "var(--shadow)" : "none",
            }}
          >
            {opt.icon && <Icon name={opt.icon} size={16} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterTab({ view, onViewChange, filter, onFilterChange }) {
  const { members, labelList } = useBoardData();
  const memberList = Object.values(members);
  const set = (key, val) => onFilterChange({ ...filter, [key]: val });
  const toggle = (key, id) => {
    const cur = filter[key];
    set(key, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };
  const active = filterActiveCount(filter);

  return (
    <div>
      <Field label="View">
        <Segmented
          options={[
            { key: "kanban", label: "Board", icon: "view_kanban" },
            { key: "list", label: "List", icon: "view_list" },
          ]}
          value={view}
          onChange={onViewChange}
        />
      </Field>

      <Field
        label="Filter cards"
        action={
          active > 0 ? (
            <button
              type="button"
              onClick={() => onFilterChange(EMPTY_FILTER)}
              className="text-xs font-semibold cursor-pointer"
              style={{ border: "none", background: "none", color: "var(--primary)" }}
            >
              Clear ({active})
            </button>
          ) : null
        }
      >
        <input
          value={filter.keyword}
          onChange={(e) => set("keyword", e.target.value)}
          placeholder="Search title or description…"
          className="w-full rounded-lg text-sm outline-none focus:border-[var(--primary)]"
          style={inputStyle}
        />
      </Field>

      <Field label="Members">
        {memberList.length === 0 ? (
          <div className="text-sm" style={{ color: "var(--text-3)" }}>No members.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {memberList.map((m) => {
              const on = filter.members.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle("members", m.id)}
                  className="flex items-center gap-1.5 rounded-full cursor-pointer"
                  style={{
                    padding: "3px 9px 3px 3px",
                    border: `1px solid ${on ? "var(--primary)" : "var(--border-2)"}`,
                    background: on ? "var(--primary-soft)" : "var(--surface)",
                  }}
                >
                  <Avatar initials={m.initials} color={m.color} src={m.avatarUrl} size={22} />
                  <span className="text-xs font-semibold" style={{ color: on ? "var(--primary)" : "var(--text-2)" }}>{m.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <Field label="Labels">
        {labelList.length === 0 ? (
          <div className="text-sm" style={{ color: "var(--text-3)" }}>No labels.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {labelList.map((l) => {
              const on = filter.labels.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggle("labels", l.id)}
                  className="flex items-center gap-1.5 rounded-full cursor-pointer"
                  style={{
                    padding: "4px 10px",
                    border: `1px solid ${on ? "var(--primary)" : "var(--border-2)"}`,
                    background: on ? "var(--primary-soft)" : "var(--surface)",
                  }}
                >
                  <span className="rounded" style={{ width: 18, height: 8, background: l.color }} />
                  <span className="text-xs font-semibold" style={{ color: on ? "var(--primary)" : "var(--text-2)" }}>
                    {l.name || "Label"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <Field label="Due date">
        <Segmented options={DUE_OPTIONS} value={filter.due} onChange={(v) => set("due", v)} />
      </Field>
    </div>
  );
}

export default function BoardRightSidebar({
  board,
  lists,
  view,
  onViewChange,
  filter,
  onFilterChange,
  tab,
  onTabChange,
  onClose,
  onBoardDeleted,
}) {
  const active = filterActiveCount(filter);

  return (
    <>
      <div className="tf-drawer-scrim" onClick={onClose} />
      <aside
        className="tf-board-panel flex flex-none flex-col"
        style={{ width: 316, borderLeft: "1px solid var(--border)", background: "var(--surface)" }}
      >
      <div className="flex flex-none items-center gap-1" style={{ height: 48, padding: "0 6px 0 8px", borderBottom: "1px solid var(--border)" }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          const badge = t.key === "filter" && active > 0 ? active : null;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onTabChange(t.key)}
              title={t.label}
              className="relative flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-[var(--surface-2)]"
              style={{ height: 34, border: "none", background: on ? "var(--surface-2)" : "none", color: on ? "var(--text)" : "var(--text-3)" }}
            >
              <Icon name={t.icon} size={17} style={on ? { color: "var(--primary)" } : undefined} />
              {badge != null && (
                <span
                  className="absolute flex items-center justify-center rounded-full text-white"
                  style={{ top: 2, right: 8, minWidth: 15, height: 15, padding: "0 3px", fontSize: 10, fontWeight: 700, background: "var(--primary)" }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onClose}
          title="Hide panel"
          className="flex flex-none items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-2)]"
          style={{ width: 32, height: 34, border: "none", background: "none", color: "var(--text-3)" }}
        >
          <Icon name="chevron_right" size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
        {tab === "info" && <InfoTab board={board} lists={lists} onBoardDeleted={onBoardDeleted} />}
        {tab === "members" && <MembersTab />}
        {tab === "labels" && <LabelsTab />}
        {tab === "filter" && (
          <FilterTab view={view} onViewChange={onViewChange} filter={filter} onFilterChange={onFilterChange} />
        )}
      </div>
      </aside>
    </>
  );
}
