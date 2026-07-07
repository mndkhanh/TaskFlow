import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const BoardDataContext = createContext(null);

// Palette used to give each workspace a stable accent color in the sidebar/header.
const WORKSPACE_COLORS = ["#0c55a3", "#0f9d58", "#d97706", "#7c3aed", "#e61c23", "#0891b2"];

// Palette used to give each member a stable avatar color (hashed from their id).
const MEMBER_COLORS = ["#0c55a3", "#0f9d58", "#d97706", "#7c3aed", "#e61c23", "#0891b2", "#be185d", "#4338ca"];

// Default label palette seeded into a newly-created board (name-less swatches the
// user can rename from the card modal, à la Trello).
const DEFAULT_LABELS = [
  { name: "", color: "#e61c23" },
  { name: "", color: "#d97706" },
  { name: "", color: "#0f9d58" },
  { name: "", color: "#0c55a3" },
  { name: "", color: "#7c3aed" },
  { name: "", color: "#0891b2" },
];

// Colors offered when creating a label from the card modal.
export const LABEL_COLORS = ["#e61c23", "#d97706", "#eab308", "#0f9d58", "#0891b2", "#0c55a3", "#7c3aed", "#be185d", "#64748b"];

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

// Stable per-id color: hash the uuid into the member palette so a member keeps the
// same accent color everywhere regardless of load order.
function colorForId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return MEMBER_COLORS[h % MEMBER_COLORS.length];
}

function initialsFrom(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Build the members map (keyed by user id) the cards/modal look members up in.
function mapMembers(profiles) {
  const map = {};
  for (const p of profiles) {
    map[p.id] = {
      id: p.id,
      name: p.display_name || "Member",
      initials: initialsFrom(p.display_name),
      color: colorForId(p.id),
      avatarUrl: p.avatar_url || null,
    };
  }
  return map;
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

// Deep-fetch a board's lists with everything a card needs nested underneath. Author
// and assignee display are resolved client-side from the members map (there's no
// direct FK from comments/card_assignees to profiles to embed through), so we only
// pull the user ids here.
const LIST_SELECT =
  "id, title, position, " +
  "cards(id, list_id, title, description, due_date, position, is_archived, " +
  "card_labels(label_id), " +
  "card_assignees(user_id), " +
  "checklists(id, title, is_done, position), " +
  "comments(id, content, created_at, user_id), " +
  "attachments(id, file_name, file_size, mime_type, storage_path, created_at))";

const CARD_COLUMNS = "id, list_id, title, description, due_date, position, is_archived";

// Turn a card's timestamptz due_date into the { label, soon } shape the UI renders.
function mapDue(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const soon = d.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000; // due within ~3 days (or overdue)
  return { label, soon };
}

function extOf(name) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toUpperCase().slice(0, 4) : "FILE";
}

function fmtSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Map a card row (with its nested relations) to the display shape. labels/assignees
// carry ids the components resolve against the labels/members maps; comments carry the
// author's user id, resolved to a profile in the card modal.
function mapCard(row) {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    description: row.description ?? "",
    due: mapDue(row.due_date),
    dueDate: row.due_date ?? null,
    position: row.position,
    labels: (row.card_labels ?? []).map((l) => l.label_id),
    assignees: (row.card_assignees ?? []).map((a) => a.user_id),
    checklist: [...(row.checklists ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, text: c.title, done: c.is_done })),
    comments: [...(row.comments ?? [])]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((c) => ({ id: c.id, userId: c.user_id, text: c.content, createdAt: c.created_at })),
    attachments: [...(row.attachments ?? [])]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((a) => ({
        id: a.id,
        name: a.file_name,
        size: fmtSize(a.file_size),
        ext: extOf(a.file_name),
        path: a.storage_path,
        mime: a.mime_type,
      })),
  };
}

function mapLists(rows) {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      id: l.id,
      title: l.title,
      cards: [...(l.cards ?? [])]
        .filter((c) => !c.is_archived)
        .sort((a, b) => a.position - b.position)
        .map(mapCard),
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

  // Create a workspace via the SECURITY DEFINER RPC (see create_workspace in
  // supabase/db/harden_functions.sql), then refetch (without the full-page loading
  // gate) and switch to the new workspace.
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

  // --- Members of the active workspace (for assignee picker + author display) ----

  const [members, setMembers] = useState({});

  const fetchMembers = useCallback(async (workspaceId) => {
    const { data: memberRows, error } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId);
    if (error) return { error };
    const ids = (memberRows ?? []).map((r) => r.user_id);
    if (ids.length === 0) return { members: {} };
    // profiles.id has no embeddable FK from workspace_members (both point at
    // auth.users), so we resolve profiles in a second query. profiles are readable
    // by any authenticated user under RLS.
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    if (pErr) return { error: pErr };
    return { members: mapMembers(profiles ?? []) };
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setMembers({});
      return;
    }
    let cancelled = false;
    fetchMembers(activeWorkspaceId).then((res) => {
      if (cancelled || res.error) return;
      setMembers(res.members);
    });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, fetchMembers]);

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
  // with default columns + a default label palette so it's immediately usable, then
  // refetch the board list.
  const createBoard = useCallback(
    async (title) => {
      if (!activeWorkspaceId) return { error: { message: "Select a workspace first." } };
      const { data, error } = await supabase
        .from("boards")
        .insert({ workspace_id: activeWorkspaceId, title, created_by: userId })
        .select(BOARD_COLUMNS)
        .single();
      if (error) return { error };

      await Promise.all([
        supabase
          .from("lists")
          .insert(DEFAULT_LIST_TITLES.map((t, i) => ({ board_id: data.id, title: t, position: i }))),
        supabase
          .from("labels")
          .insert(DEFAULT_LABELS.map((l, i) => ({ board_id: data.id, name: l.name, color: l.color, position: i }))),
      ]);

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
  const [boardLabels, setBoardLabels] = useState([]);

  // Keep refs to the latest lists / board labels so mutation handlers can read
  // current state without being re-created on every change.
  const listsRef = useRef(lists);
  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);
  const boardLabelsRef = useRef(boardLabels);
  useEffect(() => {
    boardLabelsRef.current = boardLabels;
  }, [boardLabels]);

  // Fetch a board's lists (cards nested) and its label palette. RLS scopes both to
  // workspaces the user belongs to; we order/sort by position.
  const fetchLists = useCallback(async (boardId) => {
    const { data, error } = await supabase
      .from("lists")
      .select(LIST_SELECT)
      .eq("board_id", boardId)
      .order("position");
    if (error) return { error };
    return { lists: mapLists(data ?? []) };
  }, []);

  const fetchLabels = useCallback(async (boardId) => {
    const { data, error } = await supabase
      .from("labels")
      .select("id, name, color, position")
      .eq("board_id", boardId)
      .order("position");
    if (error) return { error };
    return { labels: data ?? [] };
  }, []);

  useEffect(() => {
    if (!activeBoardId) {
      setLists([]);
      setBoardLabels([]);
      setListsError(null);
      setListsLoading(false);
      return;
    }

    let cancelled = false;
    setListsLoading(true);
    setListsError(null);

    Promise.all([fetchLists(activeBoardId), fetchLabels(activeBoardId)]).then(([listsRes, labelsRes]) => {
      if (cancelled) return;
      if (listsRes.error) {
        setListsError(listsRes.error.message);
        setLists([]);
      } else {
        setLists(listsRes.lists);
      }
      if (!labelsRes.error) setBoardLabels(labelsRes.labels);
      setListsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeBoardId, fetchLists, fetchLabels]);

  // Look up a card in the current lists by id (across all lists).
  const findCard = useCallback((cardId) => {
    for (const l of listsRef.current) {
      const c = l.cards.find((x) => x.id === cardId);
      if (c) return c;
    }
    return null;
  }, []);

  // Optimistically replace a single card via an updater function.
  const patchCard = useCallback((cardId, updater) => {
    setLists((cur) =>
      cur.map((l) => ({
        ...l,
        cards: l.cards.map((c) => (c.id === cardId ? updater(c) : c)),
      }))
    );
  }, []);

  // Refetch the board to reconcile after a failed optimistic mutation.
  const reconcile = useCallback(async () => {
    if (!activeBoardId) return;
    const res = await fetchLists(activeBoardId);
    if (!res.error) setLists(res.lists);
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
      if (results.some((r) => r.error)) await reconcile();
    },
    [reconcile]
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
        .select(CARD_COLUMNS)
        .single();
      if (error) return { error };
      setLists((cur) => cur.map((l) => (l.id === listId ? { ...l, cards: [...l.cards, mapCard(data)] } : l)));
      return { data };
    },
    [userId]
  );

  // Update a card's editable core fields (title / description / due date).
  const updateCard = useCallback(
    async (cardId, fields) => {
      const patch = {};
      if ("title" in fields) patch.title = fields.title;
      if ("description" in fields) patch.description = fields.description;
      if ("dueDate" in fields) patch.due_date = fields.dueDate; // ISO string or null
      patchCard(cardId, (c) => ({
        ...c,
        ...("title" in fields ? { title: fields.title } : {}),
        ...("description" in fields ? { description: fields.description } : {}),
        ...("dueDate" in fields ? { dueDate: fields.dueDate, due: mapDue(fields.dueDate) } : {}),
      }));
      const { error } = await supabase.from("cards").update(patch).eq("id", cardId);
      if (error) await reconcile();
      return { error };
    },
    [patchCard, reconcile]
  );

  // Remove a card from every list, then delete the row (auto-closes an open modal).
  const removeCardLocally = useCallback((cardId) => {
    setLists((cur) => cur.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== cardId) })));
  }, []);

  const deleteCard = useCallback(
    async (cardId) => {
      removeCardLocally(cardId);
      const { error } = await supabase.from("cards").delete().eq("id", cardId);
      if (error) await reconcile();
      return { error };
    },
    [removeCardLocally, reconcile]
  );

  // Archive = hide from the board view (persisted via cards.is_archived).
  const archiveCard = useCallback(
    async (cardId) => {
      removeCardLocally(cardId);
      const { error } = await supabase.from("cards").update({ is_archived: true }).eq("id", cardId);
      if (error) await reconcile();
      return { error };
    },
    [removeCardLocally, reconcile]
  );

  // --- Checklist ----------------------------------------------------------------

  const addChecklistItem = useCallback(
    async (cardId, text) => {
      const t = text.trim();
      if (!t) return {};
      const card = findCard(cardId);
      const position = card ? card.checklist.length : 0;
      const { data, error } = await supabase
        .from("checklists")
        .insert({ card_id: cardId, title: t, position })
        .select("id, title, is_done, position")
        .single();
      if (error) return { error };
      patchCard(cardId, (c) => ({
        ...c,
        checklist: [...c.checklist, { id: data.id, text: data.title, done: data.is_done }],
      }));
      return { data };
    },
    [findCard, patchCard]
  );

  const toggleChecklistItem = useCallback(
    async (cardId, itemId) => {
      const card = findCard(cardId);
      const item = card?.checklist.find((i) => i.id === itemId);
      if (!item) return;
      const nextDone = !item.done;
      patchCard(cardId, (c) => ({
        ...c,
        checklist: c.checklist.map((it) => (it.id === itemId ? { ...it, done: nextDone } : it)),
      }));
      const { error } = await supabase.from("checklists").update({ is_done: nextDone }).eq("id", itemId);
      if (error) await reconcile();
    },
    [findCard, patchCard, reconcile]
  );

  const deleteChecklistItem = useCallback(
    async (cardId, itemId) => {
      patchCard(cardId, (c) => ({ ...c, checklist: c.checklist.filter((it) => it.id !== itemId) }));
      const { error } = await supabase.from("checklists").delete().eq("id", itemId);
      if (error) await reconcile();
    },
    [patchCard, reconcile]
  );

  // --- Comments -----------------------------------------------------------------

  const addComment = useCallback(
    async (cardId, text) => {
      const t = text.trim();
      if (!t || !userId) return {};
      const { data, error } = await supabase
        .from("comments")
        .insert({ card_id: cardId, user_id: userId, content: t })
        .select("id, content, created_at, user_id")
        .single();
      if (error) return { error };
      patchCard(cardId, (c) => ({
        ...c,
        comments: [...c.comments, { id: data.id, userId: data.user_id, text: data.content, createdAt: data.created_at }],
      }));
      return { data };
    },
    [userId, patchCard]
  );

  const deleteComment = useCallback(
    async (cardId, commentId) => {
      patchCard(cardId, (c) => ({ ...c, comments: c.comments.filter((cm) => cm.id !== commentId) }));
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) await reconcile();
    },
    [patchCard, reconcile]
  );

  // --- Assignees ----------------------------------------------------------------

  const toggleAssignee = useCallback(
    async (cardId, memberId) => {
      const card = findCard(cardId);
      const has = !!card?.assignees.includes(memberId);
      patchCard(cardId, (c) => ({
        ...c,
        assignees: has ? c.assignees.filter((id) => id !== memberId) : [...c.assignees, memberId],
      }));
      const { error } = has
        ? await supabase.from("card_assignees").delete().eq("card_id", cardId).eq("user_id", memberId)
        : await supabase.from("card_assignees").insert({ card_id: cardId, user_id: memberId });
      if (error) await reconcile();
    },
    [findCard, patchCard, reconcile]
  );

  // --- Labels -------------------------------------------------------------------

  const toggleCardLabel = useCallback(
    async (cardId, labelId) => {
      const card = findCard(cardId);
      const has = !!card?.labels.includes(labelId);
      patchCard(cardId, (c) => ({
        ...c,
        labels: has ? c.labels.filter((id) => id !== labelId) : [...c.labels, labelId],
      }));
      const { error } = has
        ? await supabase.from("card_labels").delete().eq("card_id", cardId).eq("label_id", labelId)
        : await supabase.from("card_labels").insert({ card_id: cardId, label_id: labelId });
      if (error) await reconcile();
    },
    [findCard, patchCard, reconcile]
  );

  const createLabel = useCallback(
    async (name, color) => {
      if (!activeBoardId) return { error: { message: "No board open." } };
      const position = boardLabelsRef.current.length;
      const { data, error } = await supabase
        .from("labels")
        .insert({ board_id: activeBoardId, name: name.trim(), color, position })
        .select("id, name, color, position")
        .single();
      if (error) return { error };
      setBoardLabels((cur) => [...cur, data]);
      return { data };
    },
    [activeBoardId]
  );

  const updateLabel = useCallback(async (labelId, fields) => {
    setBoardLabels((cur) => cur.map((l) => (l.id === labelId ? { ...l, ...fields } : l)));
    const patch = {};
    if ("name" in fields) patch.name = fields.name;
    if ("color" in fields) patch.color = fields.color;
    const { error } = await supabase.from("labels").update(patch).eq("id", labelId);
    return { error };
  }, []);

  // --- Attachments --------------------------------------------------------------

  // Upload under {workspace_id}/{card_id}/{uuid}-{name} so the storage RLS policies
  // can resolve the owning workspace from the first path segment.
  const uploadAttachment = useCallback(
    async (cardId, file) => {
      if (!activeWorkspaceId || !userId) return { error: { message: "Not ready." } };
      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      const path = `${activeWorkspaceId}/${cardId}/${crypto.randomUUID()}-${safeName}`;
      const up = await supabase.storage
        .from("card-attachments")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (up.error) return { error: up.error };

      const { data, error } = await supabase
        .from("attachments")
        .insert({
          card_id: cardId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          storage_path: path,
          uploaded_by: userId,
        })
        .select("id, file_name, file_size, mime_type, storage_path, created_at")
        .single();
      if (error) {
        await supabase.storage.from("card-attachments").remove([path]); // best-effort cleanup
        return { error };
      }
      patchCard(cardId, (c) => ({
        ...c,
        attachments: [
          ...c.attachments,
          { id: data.id, name: data.file_name, size: fmtSize(data.file_size), ext: extOf(data.file_name), path: data.storage_path, mime: data.mime_type },
        ],
      }));
      return { data };
    },
    [activeWorkspaceId, userId, patchCard]
  );

  const getAttachmentUrl = useCallback(async (path) => {
    const { data, error } = await supabase.storage.from("card-attachments").createSignedUrl(path, 60);
    if (error) return { error };
    return { url: data.signedUrl };
  }, []);

  const deleteAttachment = useCallback(
    async (cardId, attachment) => {
      patchCard(cardId, (c) => ({ ...c, attachments: c.attachments.filter((a) => a.id !== attachment.id) }));
      await supabase.storage.from("card-attachments").remove([attachment.path]);
      const { error } = await supabase.from("attachments").delete().eq("id", attachment.id);
      if (error) await reconcile();
    },
    [patchCard, reconcile]
  );

  // Labels map (keyed by id) the cards/modal resolve label ids against.
  const labels = useMemo(() => {
    const m = {};
    for (const l of boardLabels) m[l.id] = { id: l.id, name: l.name, color: l.color };
    return m;
  }, [boardLabels]);

  const value = {
    members,
    labels,
    labelList: boardLabels,
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
    updateCard,
    deleteCard,
    archiveCard,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    addComment,
    deleteComment,
    toggleAssignee,
    toggleCardLabel,
    createLabel,
    updateLabel,
    uploadAttachment,
    getAttachmentUrl,
    deleteAttachment,
  };

  return <BoardDataContext.Provider value={value}>{children}</BoardDataContext.Provider>;
}

export function useBoardData() {
  const ctx = useContext(BoardDataContext);
  if (!ctx) throw new Error("useBoardData must be used within a BoardDataProvider");
  return ctx;
}
