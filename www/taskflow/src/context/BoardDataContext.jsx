import { createContext, useContext, useMemo, useReducer, useState } from "react";
import { BOARDS, LABELS, MEMBERS, WORKSPACES, createInitialLists } from "../lib/mockData";

const BoardDataContext = createContext(null);

function listsReducer(lists, action) {
  switch (action.type) {
    case "MOVE_CARD": {
      const { cardId, targetListId, beforeCardId } = action;
      const next = lists.map((l) => ({ ...l, cards: [...l.cards] }));
      let moved = null;
      for (const list of next) {
        const i = list.cards.findIndex((c) => c.id === cardId);
        if (i >= 0) {
          moved = list.cards.splice(i, 1)[0];
          break;
        }
      }
      if (!moved) return lists;
      const target = next.find((l) => l.id === targetListId);
      if (!target) return lists;
      if (beforeCardId) {
        const idx = target.cards.findIndex((c) => c.id === beforeCardId);
        target.cards.splice(idx < 0 ? target.cards.length : idx, 0, moved);
      } else {
        target.cards.push(moved);
      }
      return next;
    }
    case "ADD_CARD": {
      const { listId, title } = action;
      return lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              cards: [
                ...l.cards,
                {
                  id: "c" + Date.now(),
                  title,
                  labels: [],
                  assignees: [],
                  due: null,
                  checklist: [],
                  comments: [],
                  attachments: [],
                  description: "",
                },
              ],
            }
          : l
      );
    }
    case "TOGGLE_CHECKLIST_ITEM": {
      const { cardId, itemId } = action;
      return lists.map((l) => ({
        ...l,
        cards: l.cards.map((c) =>
          c.id === cardId
            ? { ...c, checklist: c.checklist.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)) }
            : c
        ),
      }));
    }
    case "ADD_COMMENT": {
      const { cardId, text } = action;
      return lists.map((l) => ({
        ...l,
        cards: l.cards.map((c) =>
          c.id === cardId
            ? { ...c, comments: [{ author: "You", initials: "YO", color: "var(--primary)", text, time: "just now" }, ...c.comments] }
            : c
        ),
      }));
    }
    default:
      return lists;
  }
}

export function BoardDataProvider({ children }) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(WORKSPACES[0].id);
  const [lists, dispatch] = useReducer(listsReducer, undefined, createInitialLists);

  const boardsByWorkspace = useMemo(
    () => BOARDS.filter((b) => b.workspaceId === activeWorkspaceId),
    [activeWorkspaceId]
  );

  const value = {
    members: MEMBERS,
    labels: LABELS,
    workspaces: WORKSPACES,
    activeWorkspaceId,
    selectWorkspace: setActiveWorkspaceId,
    boards: boardsByWorkspace,
    allBoards: BOARDS,
    lists,
    moveCard: (cardId, targetListId, beforeCardId) => dispatch({ type: "MOVE_CARD", cardId, targetListId, beforeCardId }),
    addCard: (listId, title) => dispatch({ type: "ADD_CARD", listId, title }),
    toggleChecklistItem: (cardId, itemId) => dispatch({ type: "TOGGLE_CHECKLIST_ITEM", cardId, itemId }),
    addComment: (cardId, text) => dispatch({ type: "ADD_COMMENT", cardId, text }),
  };

  return <BoardDataContext.Provider value={value}>{children}</BoardDataContext.Provider>;
}

export function useBoardData() {
  const ctx = useContext(BoardDataContext);
  if (!ctx) throw new Error("useBoardData must be used within a BoardDataProvider");
  return ctx;
}
