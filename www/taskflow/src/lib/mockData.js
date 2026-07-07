export const MEMBERS = {
  ava: { id: "ava", initials: "AC", name: "Ava Chen", color: "#0c55a3" },
  marcus: { id: "marcus", initials: "ML", name: "Marcus Lee", color: "#e61c23" },
  priya: { id: "priya", initials: "PN", name: "Priya Nair", color: "#7c3aed" },
  diego: { id: "diego", initials: "DS", name: "Diego Santos", color: "#0f9d58" },
  sam: { id: "sam", initials: "SR", name: "Sam Rivera", color: "#d97706" },
};

export const LABELS = {
  urgent: { id: "urgent", name: "Urgent", color: "#e61c23" },
  design: { id: "design", name: "Design", color: "#7c3aed" },
  bug: { id: "bug", name: "Bug", color: "#f97316" },
  feature: { id: "feature", name: "Feature", color: "#0f9d58" },
  backend: { id: "backend", name: "Backend", color: "#0c55a3" },
  research: { id: "research", name: "Research", color: "#0891b2" },
};

export const WORKSPACES = [
  { id: "acme", name: "Acme Product", initial: "A", color: "#0c55a3", role: "Owner · 5 members" },
  { id: "personal", name: "Personal", initial: "P", color: "#0f9d58", role: "Owner · 1 member" },
  { id: "side", name: "Side Projects", initial: "S", color: "#d97706", role: "Member · 3 members" },
];

export const BOARDS = [
  { id: "mobile", workspaceId: "acme", name: "Mobile App v2.0", gradient: "linear-gradient(135deg,#0c55a3,#3a86d4)", color: "#0c55a3", cardCount: 16, avatars: ["ava", "marcus", "diego"], archived: false },
  { id: "mkt", workspaceId: "acme", name: "Marketing Site Redesign", gradient: "linear-gradient(135deg,#e61c23,#ff7a5c)", color: "#e61c23", cardCount: 9, avatars: ["priya", "sam"], archived: false },
  { id: "road", workspaceId: "acme", name: "Q3 Product Roadmap", gradient: "linear-gradient(135deg,#6d28d9,#a855f7)", color: "#6d28d9", cardCount: 12, avatars: ["ava", "priya", "sam"], archived: false },
  { id: "ds", workspaceId: "acme", name: "Design System", gradient: "linear-gradient(135deg,#0f766e,#2dd4bf)", color: "#0f766e", cardCount: 7, avatars: ["priya", "ava"], archived: false },
  { id: "research", workspaceId: "acme", name: "Customer Research", gradient: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#b45309", cardCount: 5, avatars: ["sam", "diego"], archived: false },
  { id: "infra", workspaceId: "acme", name: "Infrastructure", gradient: "linear-gradient(135deg,#334155,#64748b)", color: "#334155", cardCount: 8, avatars: ["marcus", "diego"], archived: true },
];

function checklist(items) {
  return items.map((item, i) => ({
    id: "ci" + i + Math.random().toString(36).slice(2, 6),
    text: item.t,
    done: item.d,
  }));
}

let cardIdCounter = 0;
function nextCardId() {
  cardIdCounter += 1;
  return "c" + cardIdCounter;
}

export function createInitialLists() {
  return [
    {
      id: "backlog",
      title: "Backlog",
      cards: [
        {
          id: nextCardId(),
          title: "Research competitor onboarding flows",
          labels: ["research"],
          assignees: ["priya"],
          due: null,
          checklist: checklist([{ t: "Trello", d: false }, { t: "Asana", d: false }, { t: "Notion", d: false }, { t: "Height", d: false }]),
          comments: [],
          attachments: [],
          description: "Audit how leading tools handle first-run experience. Capture screenshots and note friction points for our own onboarding.",
        },
        {
          id: nextCardId(),
          title: "Define analytics event taxonomy",
          labels: ["backend"],
          assignees: ["sam"],
          due: null,
          checklist: [],
          comments: [],
          attachments: [],
          description: "Standardize event names and properties before instrumentation. Draft a spec doc for review.",
        },
        {
          id: nextCardId(),
          title: "Dark mode design spec",
          labels: ["design"],
          assignees: ["priya"],
          due: { label: "Jul 21", soon: false },
          checklist: checklist([{ t: "Color tokens", d: true }, { t: "Elevation", d: true }, { t: "Charts", d: false }, { t: "Illustrations", d: false }, { t: "QA pass", d: false }, { t: "Handoff", d: false }]),
          comments: [],
          attachments: [],
          description: "Full dark theme token set covering surfaces, text and semantic colors.",
        },
      ],
    },
    {
      id: "todo",
      title: "To Do",
      cards: [
        {
          id: nextCardId(),
          title: "Redesign empty states across the app",
          labels: ["design"],
          assignees: ["ava"],
          due: { label: "Jul 12", soon: true },
          checklist: [],
          comments: [{ author: "Ava Chen", initials: "AC", color: "#0c55a3", text: "Starting with the boards empty state first.", time: "2h ago" }],
          attachments: [],
          description: "Empty states currently feel unfinished. Add illustrations and a clear primary action to each.",
        },
        {
          id: nextCardId(),
          title: "Set up push notification service",
          labels: ["backend"],
          assignees: ["marcus"],
          due: null,
          checklist: checklist([{ t: "FCM setup", d: false }, { t: "Token storage", d: false }, { t: "Delivery test", d: false }]),
          comments: [],
          attachments: [],
          description: "Wire up cross-platform push via FCM. Store device tokens against profiles.",
        },
        {
          id: nextCardId(),
          title: "Accessibility audit (WCAG 2.2 AA)",
          labels: ["research", "urgent"],
          assignees: ["sam"],
          due: { label: "Jul 15", soon: true },
          checklist: [],
          comments: [],
          attachments: [],
          description: "Run contrast, focus-order and screen-reader checks. File issues for anything below AA.",
        },
      ],
    },
    {
      id: "progress",
      title: "In Progress",
      cards: [
        {
          id: nextCardId(),
          title: "Build card drag-and-drop interactions",
          labels: ["feature"],
          assignees: ["ava", "diego"],
          due: { label: "Jul 10", soon: true },
          checklist: checklist([{ t: "Drag within a list", d: true }, { t: "Drag between lists", d: true }, { t: "Drop placeholder", d: true }, { t: "Touch support", d: false }, { t: "Keyboard reorder", d: false }]),
          comments: [
            { author: "Diego Santos", initials: "DS", color: "#0f9d58", text: "Cross-list drop is working smoothly now.", time: "5h ago" },
            { author: "Ava Chen", initials: "AC", color: "#0c55a3", text: "Nice — the placeholder line makes it much clearer.", time: "3h ago" },
          ],
          attachments: [{ name: "dnd-demo.mp4", ext: "MP4", size: "4.2 MB" }],
          description: "Smooth reordering within a list and moving cards between lists, with a live drop indicator. Real-time sync to other viewers follows once this lands.",
        },
        {
          id: nextCardId(),
          title: "Fix crash on image upload over 5MB",
          labels: ["bug", "urgent"],
          assignees: ["marcus"],
          due: { label: "Jul 9", soon: true },
          checklist: [],
          comments: [{ author: "Marcus Lee", initials: "ML", color: "#e61c23", text: "Reproduced — it is the client-side resize step.", time: "1h ago" }],
          attachments: [],
          description: "App crashes when uploading large images to Supabase Storage. Add client-side compression and size guard.",
        },
        {
          id: nextCardId(),
          title: "Workspace member invites via email",
          labels: ["feature"],
          assignees: ["priya"],
          due: null,
          checklist: checklist([{ t: "Invite email template", d: true }, { t: "Accept flow", d: false }, { t: "Role assignment", d: false }]),
          comments: [],
          attachments: [],
          description: "Owners can invite members by email and assign a role on acceptance.",
        },
      ],
    },
    {
      id: "review",
      title: "Review",
      cards: [
        {
          id: nextCardId(),
          title: "Real-time sync for board updates",
          labels: ["backend", "feature"],
          assignees: ["diego"],
          due: null,
          checklist: [],
          comments: [{ author: "Ava Chen", initials: "AC", color: "#0c55a3", text: "Tested with two windows — instant. 🎉", time: "6h ago" }],
          attachments: [],
          description: "Broadcast card moves over Supabase Realtime channels so all viewers see changes without refresh.",
        },
        {
          id: nextCardId(),
          title: "Onboarding tooltip copy",
          labels: ["design"],
          assignees: ["sam"],
          due: null,
          checklist: [],
          comments: [],
          attachments: [],
          description: "Short, friendly copy for the four first-run tooltips.",
        },
      ],
    },
    {
      id: "done",
      title: "Done",
      cards: [
        {
          id: nextCardId(),
          title: "Auth: Google OAuth + email/password",
          labels: ["backend"],
          assignees: ["marcus"],
          due: null,
          checklist: [],
          comments: [],
          attachments: [],
          description: "Supabase Auth wired up for both providers with automatic personal workspace provisioning.",
        },
        {
          id: nextCardId(),
          title: "Profile avatar upload",
          labels: ["feature"],
          assignees: ["priya"],
          due: null,
          checklist: [],
          comments: [],
          attachments: [],
          description: "Users can upload and crop an avatar stored in Supabase Storage.",
        },
        {
          id: nextCardId(),
          title: "Board background picker",
          labels: ["design"],
          assignees: ["ava"],
          due: null,
          checklist: [],
          comments: [],
          attachments: [{ name: "gradients.fig", ext: "FIG", size: "880 KB" }, { name: "unsplash-set.zip", ext: "ZIP", size: "12 MB" }],
          description: "Color and Unsplash image backgrounds selectable per board.",
        },
        {
          id: nextCardId(),
          title: "Set up CI pipeline",
          labels: ["backend"],
          assignees: ["diego"],
          due: null,
          checklist: [],
          comments: [],
          attachments: [],
          description: "GitHub Actions running lint, tests and preview deploys on every PR.",
        },
      ],
    },
  ];
}
