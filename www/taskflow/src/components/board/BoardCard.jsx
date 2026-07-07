import { useBoardData } from "../../context/BoardDataContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";

export default function BoardCard({ card, listId, isDragging, dropBefore, onDragStart, onDragOver, onDragEnd, onClick }) {
  const { labels, members } = useBoardData();

  const doneCount = card.checklist.filter((i) => i.done).length;
  const totalChecklist = card.checklist.length;
  const hasLabels = card.labels.length > 0;
  const hasDue = !!card.due;
  const hasChecklist = totalChecklist > 0;
  const hasComments = card.comments.length > 0;
  const hasAttach = card.attachments.length > 0;
  const hasAssignees = card.assignees.length > 0;
  const hasMeta = hasDue || hasChecklist || hasComments || hasAttach || hasAssignees;

  return (
    <>
      {dropBefore && <div className="rounded" style={{ height: 3, background: "var(--primary)", margin: "4px 2px" }} />}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, card.id)}
        onDragOver={(e) => onDragOver(e, card.id, listId)}
        onDragEnd={onDragEnd}
        onClick={() => onClick(card.id)}
        className="cursor-pointer rounded-xl transition-colors hover:border-[var(--primary)]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "11px 12px",
          marginBottom: 8,
          boxShadow: "var(--shadow)",
          opacity: isDragging ? 0.35 : 1,
        }}
      >
        {hasLabels && (
          <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 9 }}>
            {card.labels.map((labelId) =>
              labels[labelId] ? (
                <span key={labelId} className="rounded" style={{ height: 8, width: 34, background: labels[labelId].color }} />
              ) : null
            )}
          </div>
        )}
        <div className="text-sm font-semibold" style={{ lineHeight: 1.35, color: "var(--text)" }}>{card.title}</div>
        {hasMeta && (
          <div className="flex items-center" style={{ gap: 12, marginTop: 11 }}>
            {hasDue && (
              <span
                className="flex items-center gap-1 rounded text-xs font-semibold"
                style={{
                  padding: "2px 7px",
                  ...(card.due.soon ? { background: "var(--danger-soft)", color: "var(--danger)" } : { background: "var(--surface-2)", color: "var(--text-2)" }),
                }}
              >
                <Icon name="schedule" size={14} />
                {card.due.label}
              </span>
            )}
            {hasChecklist && (
              <span
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: totalChecklist > 0 && doneCount === totalChecklist ? "#0f9d58" : "var(--text-3)" }}
              >
                <Icon name="check_box" size={15} />
                {doneCount}/{totalChecklist}
              </span>
            )}
            {hasComments && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-3)" }}>
                <Icon name="chat_bubble_outline" size={15} />
                {card.comments.length}
              </span>
            )}
            {hasAttach && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-3)" }}>
                <Icon name="attach_file" size={15} />
                {card.attachments.length}
              </span>
            )}
            <span className="flex-1" />
            {hasAssignees && (
              <span className="flex">
                {card.assignees.map((id) =>
                  members[id] ? (
                    <Avatar key={id} initials={members[id].initials} color={members[id].color} size={24} overlap />
                  ) : null
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
