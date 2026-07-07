import { useEffect, useRef, useState } from "react";
import { useBoardData } from "../../context/BoardDataContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";

// A thin horizontal line marking where a dragged card will drop.
function DropLine() {
  return <div className="rounded" style={{ height: 3, background: "var(--primary)", margin: "2px 12px" }} />;
}

// A single card rendered as a compact, draggable horizontal row (list view).
function CardRow({ card, listId, isDragging, dropBefore, onDragStart, onDragOver, onDragEnd, onClick }) {
  const { labels, members } = useBoardData();

  const doneCount = card.checklist.filter((i) => i.done).length;
  const totalChecklist = card.checklist.length;

  return (
    <>
      {dropBefore && <DropLine />}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, card.id)}
        onDragOver={(e) => onDragOver(e, card.id, listId)}
        onDragEnd={onDragEnd}
        onClick={() => onClick(card.id)}
        className="flex w-full items-center gap-3 cursor-pointer hover:bg-[var(--surface-2)]"
        style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", opacity: isDragging ? 0.35 : 1 }}
      >
        {card.labels.length > 0 && (
          <span className="flex flex-none gap-1">
            {card.labels.map((labelId) =>
              labels[labelId] ? (
                <span key={labelId} className="rounded" style={{ height: 8, width: 22, background: labels[labelId].color }} />
              ) : null
            )}
          </span>
        )}

        <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
          {card.title}
        </span>

        {card.due && (
          <span
            className="flex flex-none items-center gap-1 rounded text-xs font-semibold"
            style={{
              padding: "2px 7px",
              ...(card.due.soon
                ? { background: "var(--danger-soft)", color: "var(--danger)" }
                : { background: "var(--surface-2)", color: "var(--text-2)" }),
            }}
          >
            <Icon name="schedule" size={14} />
            {card.due.label}
          </span>
        )}

        {totalChecklist > 0 && (
          <span
            className="flex flex-none items-center gap-1 text-xs font-semibold"
            style={{ color: doneCount === totalChecklist ? "#0f9d58" : "var(--text-3)" }}
          >
            <Icon name="check_box" size={15} />
            {doneCount}/{totalChecklist}
          </span>
        )}

        {card.comments.length > 0 && (
          <span className="flex flex-none items-center gap-1 text-xs" style={{ color: "var(--text-3)" }}>
            <Icon name="chat_bubble_outline" size={15} />
            {card.comments.length}
          </span>
        )}

        {card.attachments.length > 0 && (
          <span className="flex flex-none items-center gap-1 text-xs" style={{ color: "var(--text-3)" }}>
            <Icon name="attach_file" size={15} />
            {card.attachments.length}
          </span>
        )}

        {card.assignees.length > 0 && (
          <span className="flex flex-none">
            {card.assignees.map((id) =>
              members[id] ? (
                <Avatar key={id} initials={members[id].initials} color={members[id].color} size={24} overlap />
              ) : null
            )}
          </span>
        )}
      </div>
    </>
  );
}

// One list rendered as a vertical section, with rename/delete controls in its header.
function ListSection({
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
    <section
      className="overflow-hidden rounded-2xl"
      style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
    >
      <div className="relative flex items-center gap-2" style={{ padding: "12px 14px" }}>
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
            className="min-w-0 rounded-md text-sm font-bold outline-none focus:border-[var(--primary)]"
            style={{ padding: "3px 7px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
          />
        ) : (
          <span onDoubleClick={startRename} className="text-sm font-bold" title="Double-click to rename">
            {list.title}
          </span>
        )}
        <span
          className="rounded-full text-xs font-semibold"
          style={{ color: "var(--text-3)", background: "var(--surface-3)", padding: "1px 8px", minWidth: 22, textAlign: "center" }}
        >
          {list.cards.length}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center justify-center rounded-md cursor-pointer hover:bg-[var(--surface-2)]"
          style={{ width: 26, height: 26, border: "none", background: "none", color: "var(--text-3)" }}
        >
          <Icon name="more_horiz" size={18} />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute z-10 rounded-xl overflow-hidden"
            style={{ top: "100%", right: 12, width: 172, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", padding: 6 }}
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

      <div onDragOver={(e) => onListDragOver(e, list.id)} onDrop={(e) => onListDrop(e, list.id)} style={{ minHeight: 8 }}>
        {list.cards.map((card) => (
          <CardRow
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
        {dropAtEnd && <DropLine />}
      </div>

      <button
        type="button"
        onClick={() => onOpenComposer(list.id)}
        className="flex w-full items-center gap-1.5 text-sm font-semibold cursor-pointer hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        style={{ padding: "10px 14px", border: "none", borderTop: "1px solid var(--border)", background: "none", color: "var(--text-2)" }}
      >
        <Icon name="add" size={19} />
        Add a card
      </button>
    </section>
  );
}

export default function BoardListView({
  lists,
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
  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: "20px" }}>
      <div className="flex flex-col gap-5" style={{ maxWidth: 820, margin: "0 auto" }}>
        {lists.map((list) => (
          <ListSection
            key={list.id}
            list={list}
            dragTarget={dragTarget}
            dragCardId={dragCardId}
            onOpenComposer={onOpenComposer}
            onRenameList={onRenameList}
            onDeleteList={onDeleteList}
            onCardDragStart={onCardDragStart}
            onCardDragOver={onCardDragOver}
            onCardDragEnd={onCardDragEnd}
            onListDragOver={onListDragOver}
            onListDrop={onListDrop}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}
