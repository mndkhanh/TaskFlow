# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repository currently contains **no source code** — only two planning documents. There is no
package.json, build tooling, linter, or test runner configured yet. Do not assume any framework
scaffolding, dependency, or file layout exists until it has actually been created.

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
