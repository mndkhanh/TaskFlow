import Icon from "../ui/Icon";
import BoardCard from "./BoardCard";

export default function BoardColumn({
  list,
  dragTarget,
  dragCardId,
  onOpenComposer,
  onCardDragStart,
  onCardDragOver,
  onCardDragEnd,
  onListDragOver,
  onListDrop,
  onCardClick,
}) {
  const dropAtEnd = !!(dragTarget && dragTarget.listId === list.id && dragTarget.cardId === null);

  return (
    <div
      className="flex flex-none flex-col rounded-2xl"
      style={{ width: 290, background: "var(--surface-2)", maxHeight: "100%" }}
    >
      <div className="flex items-center gap-2" style={{ padding: "12px 14px 8px" }}>
        <span className="flex-1 truncate text-sm font-bold">{list.title}</span>
        <span
          className="rounded-full text-xs font-semibold"
          style={{ color: "var(--text-3)", background: "var(--surface-3)", padding: "1px 8px", minWidth: 22, textAlign: "center" }}
        >
          {list.cards.length}
        </span>
        <button
          type="button"
          className="flex items-center justify-center rounded-md cursor-pointer hover:bg-[var(--surface-3)]"
          style={{ width: 26, height: 26, border: "none", background: "none", color: "var(--text-3)" }}
        >
          <Icon name="more_horiz" size={18} />
        </button>
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
