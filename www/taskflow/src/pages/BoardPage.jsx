import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBoardData } from "../context/BoardDataContext";
import BoardHeader from "../components/layout/BoardHeader";
import BoardColumn from "../components/board/BoardColumn";
import BoardListView from "../components/board/BoardListView";
import CardModal from "../components/board/CardModal";
import Icon from "../components/ui/Icon";

// Remember the user's last-used board view across sessions.
function readStoredView() {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem("tf.boardView") : null;
  return v === "list" ? "list" : "kanban";
}

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { boards, boardsLoading, workspaces, lists, moveCard, addCard } = useBoardData();

  const board = boards.find((b) => b.id === boardId) ?? null;
  const workspaceName = workspaces.find((w) => w.id === board?.workspaceId)?.name ?? "";

  const [view, setView] = useState(readStoredView);
  const [dragCardId, setDragCardId] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [composerListId, setComposerListId] = useState(null);
  const [composerText, setComposerText] = useState("");
  const [openCardId, setOpenCardId] = useState(null);

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem("tf.boardView", next);
    } catch {
      // localStorage may be unavailable (private mode); view still works in-memory
    }
  };

  const handleCardDragStart = (e, cardId) => {
    setDragCardId(cardId);
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", cardId);
    } catch {
      // drag data unavailable in some browsers, drag still works via state
    }
  };

  const handleCardDragOver = (e, cardId, listId) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragCardId === cardId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY - rect.top < rect.height / 2;
    if (!dragTarget || dragTarget.cardId !== cardId || dragTarget.before !== before || dragTarget.listId !== listId) {
      setDragTarget({ listId, cardId, before });
    }
  };

  const handleListDragOver = (e, listId) => {
    e.preventDefault();
    if (!dragTarget || dragTarget.listId !== listId || dragTarget.cardId !== null) {
      setDragTarget({ listId, cardId: null, before: false });
    }
  };

  const handleListDrop = (e, listId) => {
    e.preventDefault();
    if (dragCardId) {
      moveCard(dragCardId, listId, dragTarget?.cardId ?? null);
    }
    setDragCardId(null);
    setDragTarget(null);
  };

  const handleCardDragEnd = () => {
    setDragCardId(null);
    setDragTarget(null);
  };

  const handleSubmitComposer = () => {
    const text = composerText.trim();
    if (text && composerListId) addCard(composerListId, text);
    setComposerListId(null);
    setComposerText("");
  };

  const openCard = (() => {
    for (const list of lists) {
      const card = list.cards.find((c) => c.id === openCardId);
      if (card) return { card, listTitle: list.title };
    }
    return null;
  })();

  const openComposer = (listId) => {
    setComposerListId(listId);
    setComposerText("");
  };
  const cancelComposer = () => {
    setComposerListId(null);
    setComposerText("");
  };

  if (!board) {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center gap-3 text-sm"
        style={{ background: "var(--bg)", color: "var(--text-2)" }}
      >
        {boardsLoading ? (
          "Loading board…"
        ) : (
          <>
            <div>This board doesn’t exist or isn’t in your active workspace.</div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)]"
              style={{ height: 40, padding: "0 16px", border: "none", background: "var(--primary)" }}
            >
              Back to boards
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BoardHeader board={board} workspaceName={workspaceName} view={view} onViewChange={changeView} />

      {view === "kanban" ? (
        <div className="flex flex-1 items-start gap-3.5 overflow-x-auto overflow-y-hidden" style={{ padding: 20 }}>
          {lists.map((list) => (
            <BoardColumn
              key={list.id}
              list={list}
              dragTarget={dragTarget}
              dragCardId={dragCardId}
              isComposerOpen={composerListId === list.id}
              composerText={composerText}
              onComposerTextChange={setComposerText}
              onOpenComposer={openComposer}
              onSubmitComposer={handleSubmitComposer}
              onCancelComposer={cancelComposer}
              onCardDragStart={handleCardDragStart}
              onCardDragOver={handleCardDragOver}
              onCardDragEnd={handleCardDragEnd}
              onListDragOver={handleListDragOver}
              onListDrop={handleListDrop}
              onCardClick={setOpenCardId}
            />
          ))}
          <button
            type="button"
            className="flex flex-none items-center gap-2 rounded-2xl text-sm font-semibold cursor-pointer hover:bg-[var(--surface-3)]"
            style={{ width: 290, padding: "13px 14px", border: "none", background: "var(--surface-2)", color: "var(--text-2)" }}
          >
            <Icon name="add" size={20} />
            Add another list
          </button>
        </div>
      ) : (
        <BoardListView
          lists={lists}
          composerListId={composerListId}
          composerText={composerText}
          onComposerTextChange={setComposerText}
          onOpenComposer={openComposer}
          onSubmitComposer={handleSubmitComposer}
          onCancelComposer={cancelComposer}
          onCardClick={setOpenCardId}
        />
      )}

      {openCard && (
        <CardModal
          card={openCard.card}
          listTitle={openCard.listTitle}
          boardColor={board.color}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </div>
  );
}
