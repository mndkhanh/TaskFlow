import { useBoardData } from "../../context/BoardDataContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";
import CardComposer from "./CardComposer";

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

export default function BoardListView({
  lists,
  dragTarget,
  dragCardId,
  composerListId,
  composerText,
  onComposerTextChange,
  onOpenComposer,
  onSubmitComposer,
  onCancelComposer,
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
        {lists.map((list) => {
          const dropAtEnd = !!(dragTarget && dragTarget.listId === list.id && dragTarget.cardId === null);
          return (
            <section
              key={list.id}
              className="overflow-hidden rounded-2xl"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
            >
              <div className="flex items-center gap-2" style={{ padding: "12px 14px" }}>
                <span className="text-sm font-bold">{list.title}</span>
                <span
                  className="rounded-full text-xs font-semibold"
                  style={{ color: "var(--text-3)", background: "var(--surface-3)", padding: "1px 8px", minWidth: 22, textAlign: "center" }}
                >
                  {list.cards.length}
                </span>
              </div>

              <div
                onDragOver={(e) => onListDragOver(e, list.id)}
                onDrop={(e) => onListDrop(e, list.id)}
                style={{ minHeight: 8 }}
              >
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

              {composerListId === list.id ? (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  <CardComposer
                    text={composerText}
                    onTextChange={onComposerTextChange}
                    onSubmit={onSubmitComposer}
                    onCancel={onCancelComposer}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenComposer(list.id)}
                  className="flex w-full items-center gap-1.5 text-sm font-semibold cursor-pointer hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  style={{ padding: "10px 14px", border: "none", borderTop: "1px solid var(--border)", background: "none", color: "var(--text-2)" }}
                >
                  <Icon name="add" size={19} />
                  Add a card
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
