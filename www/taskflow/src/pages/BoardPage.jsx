import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBoardData } from "../context/BoardDataContext";
import Sidebar from "../components/layout/Sidebar";
import BoardHeader from "../components/layout/BoardHeader";
import BoardColumn from "../components/board/BoardColumn";
import BoardListView from "../components/board/BoardListView";
import BoardRightSidebar, { EMPTY_FILTER, filterActiveCount } from "../components/board/BoardRightSidebar";
import CardModal from "../components/board/CardModal";
import CreateCardModal from "../components/board/CreateCardModal";
import Icon from "../components/ui/Icon";

// Remember the user's last-used board view across sessions.
function readStoredView() {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem("tf.boardView") : null;
  return v === "list" ? "list" : "kanban";
}

function readPanelOpen() {
  try {
    const stored = localStorage.getItem("tf.boardPanelOpen");
    // No stored preference: start closed on small screens, where the panel is an
    // overlay drawer that would otherwise cover the board on first load.
    if (stored === null) {
      return !(typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
    }
    return stored !== "0";
  } catch {
    return true;
  }
}

function readPanelTab() {
  try {
    return localStorage.getItem("tf.boardPanelTab") || "info";
  } catch {
    return "info";
  }
}

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const {
    boards,
    boardsLoading,
    workspaces,
    activeBoardId,
    setActiveBoardId,
    lists,
    listsLoading,
    listsError,
    moveCard,
    moveList,
    addList,
    renameList,
    deleteList,
  } = useBoardData();

  const board = boards.find((b) => b.id === boardId) ?? null;
  const workspaceName = workspaces.find((w) => w.id === board?.workspaceId)?.name ?? "";

  // Tell the data layer which board's lists/cards to load.
  useEffect(() => {
    if (boardId && boardId !== activeBoardId) setActiveBoardId(boardId);
  }, [boardId, activeBoardId, setActiveBoardId]);

  const [view, setView] = useState(readStoredView);
  const [dragCardId, setDragCardId] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [dragListId, setDragListId] = useState(null);
  const [listDropTarget, setListDropTarget] = useState(null); // { listId, before } | null
  const [createCardListId, setCreateCardListId] = useState(null);
  const [openCardId, setOpenCardId] = useState(null);
  const [addingList, setAddingList] = useState(false);
  const [listDraft, setListDraft] = useState("");
  const [panelOpen, setPanelOpen] = useState(readPanelOpen);
  const [panelTab, setPanelTab] = useState(readPanelTab);
  const [filter, setFilter] = useState(EMPTY_FILTER);

  const setPanel = (open) => {
    setPanelOpen(open);
    try {
      localStorage.setItem("tf.boardPanelOpen", open ? "1" : "0");
    } catch {
      // localStorage may be unavailable (private mode); panel still works in-memory
    }
  };

  const changeTab = (tab) => {
    setPanel(true);
    setPanelTab(tab);
    try {
      localStorage.setItem("tf.boardPanelTab", tab);
    } catch {
      // ignore persistence failures
    }
  };

  // Apply the active filter to each list's cards (kanban + list views render this).
  const filteredLists = useMemo(() => {
    const kw = filter.keyword.trim().toLowerCase();
    if (filterActiveCount(filter) === 0) return lists;
    const match = (c) => {
      if (kw && !`${c.title} ${c.description || ""}`.toLowerCase().includes(kw)) return false;
      if (filter.members.length && !c.assignees.some((id) => filter.members.includes(id))) return false;
      if (filter.labels.length && !c.labels.some((id) => filter.labels.includes(id))) return false;
      if (filter.due === "has" && !c.due) return false;
      if (filter.due === "none" && c.due) return false;
      if (filter.due === "soon" && !c.due?.soon) return false;
      return true;
    };
    return lists.map((l) => ({ ...l, cards: l.cards.filter(match) }));
  }, [lists, filter]);

  const submitList = () => {
    const title = listDraft.trim();
    if (title) addList(title);
    setListDraft("");
    setAddingList(false);
  };

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
    if (dragListId) return; // a column is being dragged, not a card
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
    if (dragListId) return; // a column is being dragged, not a card
    e.preventDefault();
    if (!dragTarget || dragTarget.listId !== listId || dragTarget.cardId !== null) {
      setDragTarget({ listId, cardId: null, before: false });
    }
  };

  const handleListDrop = (e, listId) => {
    if (dragListId) return; // handled by the column-reorder drop
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

  // Column (list) reordering — horizontal only, kanban view. The column header is
  // the drag handle; grabbing a card still drags the card, not the column.
  const handleListDragStart = (e, listId) => {
    setDragListId(listId);
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", listId);
    } catch {
      // drag data unavailable in some browsers; drag still works via state
    }
  };

  const handleListReorderOver = (e, listId) => {
    if (!dragListId || dragListId === listId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientX - rect.left < rect.width / 2;
    if (!listDropTarget || listDropTarget.listId !== listId || listDropTarget.before !== before) {
      setListDropTarget({ listId, before });
    }
  };

  // Hovering the trailing "add list" affordance drops the column at the very end.
  const handleListReorderToEnd = (e) => {
    if (!dragListId) return;
    e.preventDefault();
    const last = lists[lists.length - 1];
    if (last && (!listDropTarget || listDropTarget.listId !== last.id || listDropTarget.before !== false)) {
      setListDropTarget({ listId: last.id, before: false });
    }
  };

  const handleListReorderDrop = (e) => {
    if (!dragListId) return;
    e.preventDefault();
    if (listDropTarget) {
      let beforeId;
      if (listDropTarget.before) {
        beforeId = listDropTarget.listId;
      } else {
        const idx = lists.findIndex((l) => l.id === listDropTarget.listId);
        beforeId = lists[idx + 1]?.id ?? null;
      }
      moveList(dragListId, beforeId);
    }
    setDragListId(null);
    setListDropTarget(null);
  };

  const handleListDragEnd = () => {
    setDragListId(null);
    setListDropTarget(null);
  };

  const openCard = (() => {
    for (const list of lists) {
      const card = list.cards.find((c) => c.id === openCardId);
      if (card) return { card, listTitle: list.title };
    }
    return null;
  })();

  const createCardListTitle = lists.find((l) => l.id === createCardListId)?.title ?? "";

  if (!board) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 text-sm"
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
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        style={
          board.image
            ? {
                // Scrim baked into the image so column text/controls stay readable
                // over any photo. The header below keeps its own opaque surface.
                backgroundImage: `linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.45)), url("${board.image}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <BoardHeader
          board={board}
          workspaceName={workspaceName}
          panelOpen={panelOpen}
          onTogglePanel={() => setPanel(!panelOpen)}
          filterCount={filterActiveCount(filter)}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {listsLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm" style={{ color: "var(--text-3)" }}>
            Loading lists…
          </div>
        ) : listsError ? (
          <div className="flex flex-1 items-center justify-center text-sm" style={{ color: "var(--danger-2)" }}>
            Couldn’t load this board: {listsError}
          </div>
        ) : view === "kanban" ? (
          <div className="flex flex-1 items-start gap-3.5 overflow-x-auto overflow-y-hidden" style={{ padding: 20 }}>
            {filteredLists.map((list) => (
              <BoardColumn
                key={list.id}
                list={list}
                dragTarget={dragTarget}
                dragCardId={dragCardId}
                isListDragging={dragListId === list.id}
                listDropBefore={!!(dragListId && listDropTarget?.listId === list.id && listDropTarget.before)}
                listDropAfter={!!(dragListId && listDropTarget?.listId === list.id && !listDropTarget.before)}
                onListDragStart={handleListDragStart}
                onListDragEnd={handleListDragEnd}
                onListReorderOver={handleListReorderOver}
                onListReorderDrop={handleListReorderDrop}
                onOpenComposer={setCreateCardListId}
                onRenameList={renameList}
                onDeleteList={deleteList}
                onCardDragStart={handleCardDragStart}
                onCardDragOver={handleCardDragOver}
                onCardDragEnd={handleCardDragEnd}
                onListDragOver={handleListDragOver}
                onListDrop={handleListDrop}
                onCardClick={setOpenCardId}
              />
            ))}
            {addingList ? (
              <div
                onDragOver={handleListReorderToEnd}
                onDrop={handleListReorderDrop}
                className="flex flex-none flex-col gap-2 rounded-2xl"
                style={{ width: 290, padding: 12, background: "var(--surface-2)" }}
              >
                <input
                  autoFocus
                  value={listDraft}
                  onChange={(e) => setListDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitList();
                    if (e.key === "Escape") {
                      setListDraft("");
                      setAddingList(false);
                    }
                  }}
                  placeholder="Enter list title…"
                  className="w-full rounded-lg text-sm outline-none focus:border-[var(--primary)]"
                  style={{ padding: "9px 11px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={submitList}
                    className="rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)]"
                    style={{ height: 34, padding: "0 14px", border: "none", background: "var(--primary)" }}
                  >
                    Add list
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setListDraft("");
                      setAddingList(false);
                    }}
                    className="flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-3)]"
                    style={{ width: 34, height: 34, border: "none", background: "none", color: "var(--text-2)" }}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingList(true)}
                onDragOver={handleListReorderToEnd}
                onDrop={handleListReorderDrop}
                className="flex flex-none items-center gap-2 rounded-2xl text-sm font-semibold cursor-pointer hover:bg-[var(--surface-3)]"
                style={{ width: 290, padding: "13px 14px", border: "none", background: "var(--surface-2)", color: "var(--text-2)" }}
              >
                <Icon name="add" size={20} />
                Add another list
              </button>
            )}
          </div>
        ) : (
          <BoardListView
            lists={filteredLists}
            dragTarget={dragTarget}
            dragCardId={dragCardId}
            onOpenComposer={setCreateCardListId}
            onRenameList={renameList}
            onDeleteList={deleteList}
            onCardDragStart={handleCardDragStart}
            onCardDragOver={handleCardDragOver}
            onCardDragEnd={handleCardDragEnd}
            onListDragOver={handleListDragOver}
            onListDrop={handleListDrop}
            onCardClick={setOpenCardId}
          />
        )}
          </div>
          {panelOpen && (
            <BoardRightSidebar
              board={board}
              lists={lists}
              view={view}
              onViewChange={changeView}
              filter={filter}
              onFilterChange={setFilter}
              tab={panelTab}
              onTabChange={changeTab}
              onClose={() => setPanel(false)}
              onBoardDeleted={() => navigate("/dashboard")}
            />
          )}
        </div>
      </div>

      {openCard && (
        <CardModal
          card={openCard.card}
          listTitle={openCard.listTitle}
          boardColor={board.color}
          onClose={() => setOpenCardId(null)}
        />
      )}

      {createCardListId && (
        <CreateCardModal
          listId={createCardListId}
          listTitle={createCardListTitle}
          boardColor={board.color}
          onClose={() => setCreateCardListId(null)}
        />
      )}
    </div>
  );
}
