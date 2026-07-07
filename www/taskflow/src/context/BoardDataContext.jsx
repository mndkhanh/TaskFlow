import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";
import { BOARDS, LABELS, MEMBERS, createInitialLists } from "../lib/mockData";

const BoardDataContext = createContext(null);

// Palette used to give each workspace a stable accent color in the sidebar/header.
const WORKSPACE_COLORS = ["#0c55a3", "#0f9d58", "#d97706", "#7c3aed", "#e61c23", "#0891b2"];

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

// Collapse workspace_members rows (one per member of each of the user's workspaces)
// into the display shape the sidebar/header expect: { id, name, initial, color, role }.
function mapWorkspaces(rows, userId) {
  const byId = new Map();
  for (const row of rows) {
    const ws = row.workspaces;
    if (!ws) continue;
    if (!byId.has(ws.id)) byId.set(ws.id, { ws, memberCount: 0, myRole: null });
    const entry = byId.get(ws.id);
    entry.memberCount += 1;
    if (row.user_id === userId) entry.myRole = row.role;
  }

  return [...byId.values()]
    .sort((a, b) => new Date(a.ws.created_at) - new Date(b.ws.created_at))
    .map(({ ws, memberCount, myRole }, i) => ({
      id: ws.id,
      name: ws.name,
      initial: (ws.name?.trim()?.[0] ?? "?").toUpperCase(),
      color: WORKSPACE_COLORS[i % WORKSPACE_COLORS.length],
      role: `${capitalize(myRole ?? "member")} · ${memberCount} member${memberCount === 1 ? "" : "s"}`,
    }));
}

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
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [workspacesError, setWorkspacesError] = useState(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [lists, dispatch] = useReducer(listsReducer, undefined, createInitialLists);

  // Fetch the signed-in user's workspaces. RLS scopes workspace_members to the
  // workspaces they belong to, so a single unfiltered query gives us every member
  // row across all their workspaces — enough for the list, their role, and counts.
  const fetchWorkspaces = useCallback(async () => {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("user_id, role, workspaces(id, name, created_at)");
    if (error) return { error };
    return { workspaces: mapWorkspaces(data ?? [], userId) };
  }, [userId]);

  // Apply a freshly-fetched list, keeping the current selection if it's still valid
  // (or honoring an explicit preferId, e.g. a just-created workspace).
  const applyWorkspaces = useCallback((mapped, preferId = null) => {
    setWorkspaces(mapped);
    setWorkspacesError(null);
    setActiveWorkspaceId((cur) => {
      if (preferId && mapped.some((w) => w.id === preferId)) return preferId;
      if (cur && mapped.some((w) => w.id === cur)) return cur;
      return mapped[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setWorkspacesLoading(false);
      return;
    }

    let cancelled = false;
    setWorkspacesLoading(true);
    setWorkspacesError(null);

    fetchWorkspaces().then((res) => {
      if (cancelled) return;
      if (res.error) {
        setWorkspacesError(res.error.message);
        setWorkspaces([]);
        setActiveWorkspaceId(null);
      } else {
        applyWorkspaces(res.workspaces);
      }
      setWorkspacesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, fetchWorkspaces, applyWorkspaces]);

  // Create a workspace via the SECURITY DEFINER RPC (see supabase/db/workspace_functions.sql),
  // then refetch (without the full-page loading gate) and switch to the new workspace.
  const createWorkspace = useCallback(
    async (name, description = null) => {
      const { data, error } = await supabase.rpc("create_workspace", {
        p_name: name,
        p_description: description,
      });
      if (error) return { error };

      const res = await fetchWorkspaces();
      if (res.error) return { error: res.error };
      applyWorkspaces(res.workspaces, data.id);
      return { data };
    },
    [fetchWorkspaces, applyWorkspaces]
  );

  // Boards/lists/cards are still mock; they key off workspace id, so real workspaces
  // (UUIDs) currently resolve to an empty board list until board-fetching is wired.
  const boardsByWorkspace = useMemo(
    () => BOARDS.filter((b) => b.workspaceId === activeWorkspaceId),
    [activeWorkspaceId]
  );

  const value = {
    members: MEMBERS,
    labels: LABELS,
    workspaces,
    workspacesLoading,
    workspacesError,
    activeWorkspaceId,
    selectWorkspace: setActiveWorkspaceId,
    createWorkspace,
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
