import { useState } from "react";
import { useParams } from "react-router-dom";
import { useBoardData } from "../context/BoardDataContext";
import BoardHeader from "../components/layout/BoardHeader";
import BoardColumn from "../components/board/BoardColumn";
import CardModal from "../components/board/CardModal";
import Icon from "../components/ui/Icon";

export default function BoardPage() {
  const { boardId } = useParams();
  const { allBoards, workspaces, lists, moveCard, addCard } = useBoardData();

  const board = allBoards.find((b) => b.id === boardId) ?? allBoards[0];
  const workspaceName = workspaces.find((w) => w.id === board.workspaceId)?.name ?? "";

  const [dragCardId, setDragCardId] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [composerListId, setComposerListId] = useState(null);
  const [composerText, setComposerText] = useState("");
  const [openCardId, setOpenCardId] = useState(null);

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

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BoardHeader board={board} workspaceName={workspaceName} />

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
            onOpenComposer={(listId) => {
              setComposerListId(listId);
              setComposerText("");
            }}
            onSubmitComposer={handleSubmitComposer}
            onCancelComposer={() => {
              setComposerListId(null);
              setComposerText("");
            }}
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
