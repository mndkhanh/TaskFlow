# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Two planning documents (`prd.md`, `test_requirements.md`) sit at the repo root. Code lives under `www/`:

- `www/admin-dashboard` — React + Vite (JS), TailwindCSS v4 via `@tailwindcss/vite`.
- `www/taskflow` — React + Vite (JS), TailwindCSS v4 via `@tailwindcss/vite`.

Both are freshly scaffolded (`npm create vite@latest -- --template react`) with the default boilerplate
markup/CSS stripped out and replaced by a minimal Tailwind placeholder `App.jsx`. No routing, state
management, Supabase wiring, or app-specific features exist yet — treat both as empty shells.

Common commands (run from inside each project directory):

```
npm install
npm run dev      # Vite dev server
npm run build    # production build
npm run lint     # ESLint
npm run preview  # preview production build
```

There is no root-level package.json/workspace config tying the two projects together — each is
installed and run independently.

## The two specs conflict — clarify before building

`prd.md` and `test_requirements.md` describe two different, mismatched projects:

- **`prd.md`** — "TaskFlow": a full multi-user Kanban SaaS (Trello-like) with Supabase Auth/Postgres/Realtime/Storage,
  a React+Vite+TailwindCSS frontend, drag-and-drop boards/lists/cards, workspace RBAC (`owner`/`member`/`viewer`),
  and a proposed 9-table relational schema (see section 4 of the file for the schema).
- **`test_requirements.md`** — a much smaller "Intern Developer Assessment": a single-user Todo List app
  (CRUD + toggle complete + filter/search) with a free choice of stack, meant to be delivered in 2 days with a
  README and optional Docker/tests/deployment.

These are not phases of the same plan — they differ in scope, auth model, and stack constraints. Before
scaffolding anything, confirm with the user which document is the actual target (or whether `test_requirements.md`
is the graded deliverable and `prd.md` is aspirational/future scope beyond it). Do not silently merge both specs
into one implementation.

## When implementation starts

Once a stack is chosen and code is scaffolded, update this file with the real build/lint/test commands and the
actual architecture — do not leave this section speculative.
