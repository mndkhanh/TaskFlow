import { useEffect, useRef, useState } from "react";
import Icon from "../ui/Icon";
import BoardCard from "./BoardCard";

export default function BoardColumn({
  list,
  dragTarget,
  dragCardId,
  onOpenComposer,
  onRenameList,
  onDeleteList,
  onCardDragStart,
  onCardDragOver,
  onCardDragEnd,
  onListDragOver,
  onListDrop,
  onCardClick,
}) {
  const dropAtEnd = !!(dragTarget && dragTarget.listId === list.id && dragTarget.cardId === null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(list.title);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen]);

  const startRename = () => {
    setTitleDraft(list.title);
    setEditing(true);
    setMenuOpen(false);
  };

  const saveRename = () => {
    setEditing(false);
    const t = titleDraft.trim();
    if (t && t !== list.title) onRenameList(list.id, t);
    else setTitleDraft(list.title);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    const count = list.cards.length;
    const msg = count
      ? `Delete "${list.title}" and its ${count} card${count === 1 ? "" : "s"}? This can't be undone.`
      : `Delete "${list.title}"?`;
    if (window.confirm(msg)) onDeleteList(list.id);
  };

  return (
    <div
      className="flex flex-none flex-col rounded-2xl"
      style={{ width: 290, background: "var(--surface-2)", maxHeight: "100%" }}
    >
      <div className="relative flex items-center gap-2" style={{ padding: "12px 14px 8px" }}>
        {editing ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") {
                setTitleDraft(list.title);
                setEditing(false);
              }
            }}
            className="flex-1 min-w-0 rounded-md text-sm font-bold outline-none focus:border-[var(--primary)]"
            style={{ padding: "3px 7px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
          />
        ) : (
          <span
            onDoubleClick={startRename}
            className="flex-1 truncate text-sm font-bold"
            title="Double-click to rename"
          >
            {list.title}
          </span>
        )}
        <span
          className="rounded-full text-xs font-semibold"
          style={{ color: "var(--text-3)", background: "var(--surface-3)", padding: "1px 8px", minWidth: 22, textAlign: "center" }}
        >
          {list.cards.length}
        </span>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center justify-center rounded-md cursor-pointer hover:bg-[var(--surface-3)]"
          style={{ width: 26, height: 26, border: "none", background: "none", color: "var(--text-3)" }}
        >
          <Icon name="more_horiz" size={18} />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute z-10 rounded-xl overflow-hidden"
            style={{ top: "100%", right: 10, width: 172, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", padding: 6 }}
          >
            <button
              type="button"
              onClick={startRename}
              className="flex w-full items-center gap-2.5 rounded-lg text-left text-sm font-semibold cursor-pointer hover:bg-[var(--surface-2)]"
              style={{ padding: "8px 10px", border: "none", background: "none", color: "var(--text)" }}
            >
              <Icon name="edit" size={17} style={{ color: "var(--text-2)" }} />
              Rename list
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenComposer(list.id);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg text-left text-sm font-semibold cursor-pointer hover:bg-[var(--surface-2)]"
              style={{ padding: "8px 10px", border: "none", background: "none", color: "var(--text)" }}
            >
              <Icon name="add" size={17} style={{ color: "var(--text-2)" }} />
              Add card
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex w-full items-center gap-2.5 rounded-lg text-left text-sm font-semibold cursor-pointer hover:bg-[var(--danger)] hover:text-white"
              style={{ padding: "8px 10px", border: "none", background: "none", color: "var(--danger)" }}
            >
              <Icon name="delete" size={17} />
              Delete list
            </button>
          </div>
        )}
      </div>

      <div
        onDragOver={(e) => onListDragOver(e, list.id)}
        onDrop={(e) => onListDrop(e, list.id)}
        className="flex flex-col overflow-y-auto"
        style={{ padding: "2px 10px 4px", minHeight: 12 }}
      >
        {list.cards.map((card) => (
          <BoardCard
            key={card.id}
            card={card}
            listId={list.id}
            isDragging={dragCardId === card.id}
            dropBefore={!!(dragTarget && dragTarget.listId === list.id && dragTarget.cardId === card.id && dragTarget.before)}
            onDragStart={onCardDragStart}
            onDragOver={onCardDragOver}
            onDragEnd={onCardDragEnd}
            onClick={onCardClick}
          />
        ))}
        {dropAtEnd && <div className="rounded" style={{ height: 3, background: "var(--primary)", margin: "4px 2px" }} />}
      </div>

      <button
        type="button"
        onClick={() => onOpenComposer(list.id)}
        className="flex items-center gap-1.5 rounded-lg text-sm font-semibold cursor-pointer hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
        style={{ margin: "2px 10px 10px", padding: "9px 11px", border: "none", background: "none", color: "var(--text-2)" }}
      >
        <Icon name="add" size={19} />
        Add a card
      </button>
    </div>
  );
}
