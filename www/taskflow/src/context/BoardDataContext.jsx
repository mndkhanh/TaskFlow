import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";
import { LABELS, MEMBERS } from "../lib/mockData";

const BoardDataContext = createContext(null);

// Palette used to give each workspace a stable accent color in the sidebar/header.
const WORKSPACE_COLORS = ["#0c55a3", "#0f9d58", "#d97706", "#7c3aed", "#e61c23", "#0891b2"];

// Boards have no stored theme yet (only an optional background_url), so we hand each
// one a stable gradient/accent by its position in the workspace's board list.
const BOARD_GRADIENTS = [
  { color: "#0c55a3", gradient: "linear-gradient(135deg,#0c55a3,#3a86d4)" },
  { color: "#e61c23", gradient: "linear-gradient(135deg,#e61c23,#ff7a5c)" },
  { color: "#6d28d9", gradient: "linear-gradient(135deg,#6d28d9,#a855f7)" },
  { color: "#0f766e", gradient: "linear-gradient(135deg,#0f766e,#2dd4bf)" },
  { color: "#b45309", gradient: "linear-gradient(135deg,#b45309,#f59e0b)" },
  { color: "#334155", gradient: "linear-gradient(135deg,#334155,#64748b)" },
];

// Map board rows into the display shape the dashboard tiles / board header expect.
// cardCount and avatars stay empty until lists/cards are wired to real data.
function mapBoards(rows) {
  return rows.map((b, i) => {
    const theme = BOARD_GRADIENTS[i % BOARD_GRADIENTS.length];
    return {
      id: b.id,
      workspaceId: b.workspace_id,
      name: b.title,
      gradient: b.background_url || theme.gradient,
      color: theme.color,
      archived: b.is_archived,
      cardCount: 0,
      avatars: [],
    };
  });
}

const BOARD_COLUMNS = "id, workspace_id, title, background_url, is_archived, created_at";

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

// Default columns seeded into a newly-created board so it's usable right away.
const DEFAULT_LIST_TITLES = ["Backlog", "To Do", "In Progress", "Done"];

const LIST_SELECT = "id, title, position, cards(id, list_id, title, description, due_date, position)";

// Turn a card's timestamptz due_date into the { label, soon } shape the UI renders.
function mapDue(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const soon = d.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000; // due within ~3 days (or overdue)
  return { label, soon };
}

// Map a card row to the display shape. labels/assignees/checklist/comments/attachments
// have no backing tables wired yet, so they stay empty (see "lists + cards core" scope).
function mapCard(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    due: mapDue(row.due_date),
    position: row.position,
    labels: [],
    assignees: [],
    checklist: [],
    comments: [],
    attachments: [],
  };
}

function mapLists(rows) {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      id: l.id,
      title: l.title,
      cards: [...(l.cards ?? [])].sort((a, b) => a.position - b.position).map(mapCard),
    }));
}

// Apply a card move (reorder within a list or across lists) to the in-memory lists.
// Returns the next lists plus the source list id, or null if the card wasn't found.
function applyMove(lists, cardId, targetListId, beforeCardId) {
  const next = lists.map((l) => ({ ...l, cards: [...l.cards] }));
  let moved = null;
  let sourceListId = null;
  for (const list of next) {
    const i = list.cards.findIndex((c) => c.id === cardId);
    if (i >= 0) {
      moved = list.cards.splice(i, 1)[0];
      sourceListId = list.id;
      break;
    }
  }
  if (!moved) return null;
  const target = next.find((l) => l.id === targetListId);
  if (!target) return null;
  if (beforeCardId) {
    const idx = target.cards.findIndex((c) => c.id === beforeCardId);
    target.cards.splice(idx < 0 ? target.cards.length : idx, 0, moved);
  } else {
    target.cards.push(moved);
  }
  return { next, sourceListId };
}

export function BoardDataProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [workspacesError, setWorkspacesError] = useState(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);

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

  const [boards, setBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardsError, setBoardsError] = useState(null);

  // Boards for a workspace. RLS ("Members can view boards") already restricts rows to
  // workspaces the user belongs to; we filter by the active one and order by creation.
  const fetchBoards = useCallback(async (workspaceId) => {
    const { data, error } = await supabase
      .from("boards")
      .select(BOARD_COLUMNS)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (error) return { error };
    return { boards: mapBoards(data ?? []) };
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setBoards([]);
      setBoardsError(null);
      setBoardsLoading(false);
      return;
    }

    let cancelled = false;
    setBoardsLoading(true);
    setBoardsError(null);

    fetchBoards(activeWorkspaceId).then((res) => {
      if (cancelled) return;
      if (res.error) {
        setBoardsError(res.error.message);
        setBoards([]);
      } else {
        setBoards(res.boards);
      }
      setBoardsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, fetchBoards]);

  // Create a board in the active workspace (RLS lets owners/members insert), seed it
  // with default columns so it's immediately usable, then refetch the board list.
  const createBoard = useCallback(
    async (title) => {
      if (!activeWorkspaceId) return { error: { message: "Select a workspace first." } };
      const { data, error } = await supabase
        .from("boards")
        .insert({ workspace_id: activeWorkspaceId, title, created_by: userId })
        .select(BOARD_COLUMNS)
        .single();
      if (error) return { error };

      await supabase
        .from("lists")
        .insert(DEFAULT_LIST_TITLES.map((t, i) => ({ board_id: data.id, title: t, position: i })));

      const res = await fetchBoards(activeWorkspaceId);
      if (!res.error) setBoards(res.boards);
      return { data };
    },
    [activeWorkspaceId, userId, fetchBoards]
  );

  // --- Lists + cards for the currently-open board -------------------------------

  const [activeBoardId, setActiveBoardId] = useState(null);
  const [lists, setLists] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listsError, setListsError] = useState(null);

  // Keep a ref to the latest lists so mutation handlers can read current state
  // without being re-created on every change.
  const listsRef = useRef(lists);
  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  // Fetch a board's lists with their cards nested. RLS scopes both to workspaces the
  // user belongs to; we order lists by position and sort cards by position in mapLists.
  const fetchLists = useCallback(async (boardId) => {
    const { data, error } = await supabase
      .from("lists")
      .select(LIST_SELECT)
      .eq("board_id", boardId)
      .order("position");
    if (error) return { error };
    return { lists: mapLists(data ?? []) };
  }, []);

  useEffect(() => {
    if (!activeBoardId) {
      setLists([]);
      setListsError(null);
      setListsLoading(false);
      return;
    }

    let cancelled = false;
    setListsLoading(true);
    setListsError(null);

    fetchLists(activeBoardId).then((res) => {
      if (cancelled) return;
      if (res.error) {
        setListsError(res.error.message);
        setLists([]);
      } else {
        setLists(res.lists);
      }
      setListsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeBoardId, fetchLists]);

  // Persist positions for the affected lists by writing each card's list_id + index.
  // On any failure, refetch the board to reconcile the optimistic update.
  const persistPositions = useCallback(
    async (nextLists, affectedListIds) => {
      const updates = [];
      for (const list of nextLists) {
        if (!affectedListIds.has(list.id)) continue;
        list.cards.forEach((card, index) => {
          updates.push(supabase.from("cards").update({ list_id: list.id, position: index }).eq("id", card.id));
        });
      }
      const results = await Promise.all(updates);
      if (results.some((r) => r.error) && activeBoardId) {
        const res = await fetchLists(activeBoardId);
        if (!res.error) setLists(res.lists);
      }
    },
    [activeBoardId, fetchLists]
  );

  // Move a card (optimistic), then persist the new order of the affected list(s).
  const moveCard = useCallback(
    (cardId, targetListId, beforeCardId) => {
      const result = applyMove(listsRef.current, cardId, targetListId, beforeCardId);
      if (!result) return;
      setLists(result.next);
      persistPositions(result.next, new Set([result.sourceListId, targetListId]));
    },
    [persistPositions]
  );

  // Insert a card at the end of a list, then append the real row to local state.
  const addCard = useCallback(
    async (listId, title) => {
      const list = listsRef.current.find((l) => l.id === listId);
      const position = list ? list.cards.length : 0;
      const { data, error } = await supabase
        .from("cards")
        .insert({ list_id: listId, title, position, created_by: userId })
        .select("id, list_id, title, description, due_date, position")
        .single();
      if (error) return { error };
      setLists((cur) => cur.map((l) => (l.id === listId ? { ...l, cards: [...l.cards, mapCard(data)] } : l)));
      return { data };
    },
    [userId]
  );

  // Checklist/comment editing isn't persisted yet (no wiring in this pass); keep the
  // in-memory behavior so the card modal stays interactive within a session.
  const toggleChecklistItem = useCallback((cardId, itemId) => {
    setLists((cur) =>
      cur.map((l) => ({
        ...l,
        cards: l.cards.map((c) =>
          c.id === cardId
            ? { ...c, checklist: c.checklist.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)) }
            : c
        ),
      }))
    );
  }, []);

  const addComment = useCallback((cardId, text) => {
    setLists((cur) =>
      cur.map((l) => ({
        ...l,
        cards: l.cards.map((c) =>
          c.id === cardId
            ? { ...c, comments: [{ author: "You", initials: "YO", color: "var(--primary)", text, time: "just now" }, ...c.comments] }
            : c
        ),
      }))
    );
  }, []);

  const value = {
    members: MEMBERS,
    labels: LABELS,
    workspaces,
    workspacesLoading,
    workspacesError,
    activeWorkspaceId,
    selectWorkspace: setActiveWorkspaceId,
    createWorkspace,
    boards,
    boardsLoading,
    boardsError,
    createBoard,
    activeBoardId,
    setActiveBoardId,
    lists,
    listsLoading,
    listsError,
    moveCard,
    addCard,
    toggleChecklistItem,
    addComment,
  };

  return <BoardDataContext.Provider value={value}>{children}</BoardDataContext.Provider>;
}

export function useBoardData() {
  const ctx = useContext(BoardDataContext);
  if (!ctx) throw new Error("useBoardData must be used within a BoardDataProvider");
  return ctx;
}
