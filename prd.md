# PRODUCT REQUIREMENT DOCUMENT (PRD) - TASKFLOW PROJECT

## 1. Project Overview

- **Project Name:** TaskFlow
- **Objective:** Build a Kanban-style project management web application (similar to Trello) that enables users to collaborate, assign, and track work progress in real-time.
- **Tech Stack:**
- **Frontend:** ReactJS (Vite), TailwindCSS (UI), `@hello-pangea/dnd` or `dnd-kit` (Drag-and-Drop handling).
- **Backend & Database:** Supabase (Auth, PostgreSQL, Real-time Subscriptions, Storage).

---

## 2. Product Scope (MVP)

The initial phase (MVP) will focus on the core functional flow: Login $\rightarrow$ Create Workspace $\rightarrow$ Create Board $\rightarrow$ Drag-and-Drop Cards $\rightarrow$ Real-time Sync between team members.

---

## 3. Functional Requirements

### 3.1. Authentication & Workspace-RBAC

Leverage **Supabase Auth** and Postgres **Row Level Security (RLS)** to enforce access control directly at the database layer.

- **Features:**
- Sign up and log in via Email/Password or Google OAuth (handled via Supabase).
- Every newly registered user automatically provisions a default personal Workspace.

- **Workspace-Level Permissions (Workspace-RBAC):**
- `Owner`: Full control over the Workspace. Can delete the Workspace, invite/remove members, and create/archive any Board within it.
- `Member`: Can create Boards, Lists, and Cards, perform drag-and-drop actions, and post comments.
- `Viewer`: Can only view public Boards within the Workspace; unauthorized to edit, add, or drag elements.

### 3.2. Workspace & Board Management

- **Workspace:**
- Users can create multiple Workspaces (e.g., "Company Work", "Personal Projects").
- Ability to invite members to a Workspace via email.

- **Board:**
- Resides inside a Workspace.
- Allows customization of the background color or background image (integrated via Unsplash API or local assets).
- Board States: Active or Archived.

### 3.3. List & Card Management

- **List (Column):**
- Create, rename, and reorder Lists within a Board.
- Delete a List (which archives or deletes all containing Cards).

- **Card (Task Item):**
- **Drag-and-Drop:** Move Cards smoothly between different Lists or reorder them within the same List.
- **Card Details (Modal Popup):**
- Title & Description (Supports basic Rich Text / Markdown formatting).
- **Assignees:** Assign tasks to specific members (fetched from the Workspace member list).
- **Labels:** Color-coded labels (e.g., Red - Urgent, Green - Normal).
- **Due Date:** Set completion deadlines.
- **Checklist:** Create sub-tasks with a dynamic progress bar displaying the `%` of completion.
- **Attachments:** Upload and attach files/images (Stored in **Supabase Storage**).
- **Comments:** Allow team members to discuss and leave feedback under each card.

### 3.4. Real-time Synchronization

Utilize **Supabase Realtime (Channels/Broadcast)** capabilities.

- When User A drags a Card from "To Do" to "In Progress", User B’s screen (viewing the same Board) must automatically reflect the card movement instantly without a page refresh.
- New comments must appear instantly within the active Card Details modal.

---

## 4. Proposed Database Schema (Optimized for Supabase)

Since Supabase runs on PostgreSQL, the relational schema relies heavily on **RLS (Row Level Security)** policies:

1. **`profiles`**: Stores extended user information (id links to Supabase's `auth.users`, display name, avatar URL).
2. **`workspaces`**: id, name, description, created_by.
3. **`workspace_members`**: workspace_id, user_id, role (enum: 'owner', 'member', 'viewer').
4. **`boards`**: id, workspace_id, title, background_url, is_archived.
5. **`lists`**: id, board_id, title, position (int - used for column ordering).
6. **`cards`**: id, list_id, title, description, due_date, position (int - card ordering within a column).
7. **`card_assignees`**: card_id, user_id.
8. **`checklists`**: id, card_id, title, is_done.
9. **`comments`**: id, card_id, user_id, content, created_at.
