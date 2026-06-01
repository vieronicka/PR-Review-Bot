---
name: update-project-docs
description: >-
  Keeps pr-review-agent documentation in sync with code changes. Updates README.md,
  docs/PLAN.md, and docs/phase-*-feature.md when implementing features, changing
  CLI flags, env vars, dependencies, or completing a phase. Use when editing src/,
  package.json, .env.example, or when the user asks to implement a phase or feature
  in this repository.
---

# Update Project Docs (pr-review-agent only)

When you change **code or configuration** in this repository, also update the **relevant documentation** in the same task. Do not leave README or docs describing old behavior.

## When to apply

Update docs after any of these:

- New or changed files under `src/`
- CLI flags, commands, or default behavior in `src/cli.ts`
- New env vars in `.env.example` or `src/config.ts`
- `package.json` scripts or dependencies
- Completing or starting an implementation phase
- User asks to implement Phase 2, 3, 4, or 5

**Skip doc updates** for: typo-only fixes with no behavior change, comments-only edits, or changes the user explicitly says are docs-free.

## Documentation map

| What changed | Files to update |
|--------------|-----------------|
| Phase 1 GitHub fetch, `github.ts`, `config.ts`, author guard | `README.md`, `docs/phase-1-feature.md`, `docs/PLAN.md` (checklist + todos) |
| Phase 2 LLM, `review.ts`, truncation, Zod | `README.md`, `docs/phase-2-feature.md`, `.env.example`, `docs/PLAN.md` |
| Phase 3 `--post`, review API | `README.md`, `docs/phase-3-feature.md`, `.env.example` (PAT scopes), `docs/PLAN.md` |
| Phase 4 UI | `README.md`, `docs/phase-4-feature.md`, `docs/PLAN.md` |
| Phase 5 GitHub Action | `docs/phase-5-feature.md`, `docs/PLAN.md`, new `.github/workflows/*.yml` |
| Project layout / new `src/` files | `README.md` project layout, `docs/PLAN.md` structure section |
| Roadmap or status only | `docs/PLAN.md` frontmatter `todos`, progress checklist |

**Do not edit** `docs/PLAN.md` learning content (user stories, stack tables) unless the feature change makes that section wrong.

## What to update in each file

### `README.md`

- **Setup** — install steps, env vars, PAT scopes if they changed
- **Run commands** — exact `npm run review` examples with current flags
- **Phase (current)** — which phase is active; point to the right `docs/phase-*-feature.md`
- **Project layout** — list files that exist under `src/`
- **Documentation table** — add links if new doc files were created

Keep README short; deep detail stays in phase feature docs.

### `docs/phase-N-feature.md`

- Set **Status** at top: `Implemented` | `In progress` | `Planned`
- **What** — match actual behavior (not planned) once code exists
- **Methods reference** — add/remove/rename functions with signatures and purpose
- **CLI flags** — current flags and defaults
- **Success criteria** — check boxes `[x]` for items that work now
- Remove “planned” wording for parts that are shipped; move shipped content out of “Planned methods” into main sections

### `docs/PLAN.md`

- Frontmatter `todos` — set `status: completed` | `in_progress` | `pending`
- **Progress checklist** — check `[x]` completed items; leave `[ ]` for remaining
- **Phase feature docs table** — update Status column if phase shipped
- **What to do next** — point to the next unchecked phase

### `.env.example`

- Add new variables with a one-line comment (what + which phase needs it)
- Note PAT permission changes (e.g. Pull requests Write for Phase 3)

## Workflow (do this in the same PR/task as code)

1. Implement or change code.
2. Identify affected rows in the documentation map above.
3. Update each listed file so examples and status match the code.
4. If a phase is newly completed, update **all three**: README, that phase’s feature doc, PLAN checklist/todos.

## Consistency rules

- Command examples must match `package.json` scripts (`npm run review -- ...`).
- Env var names must match `src/config.ts` exactly.
- File paths in docs must match the repo tree (use forward slashes).
- Phase numbers in README, PLAN, and `phase-N-feature.md` must agree.
- Do not document features that are not implemented unless clearly marked **Planned**.

## Example

**Code change:** Added `src/review.ts` and `--review` flag; `OPENAI_API_KEY` in config.

**Doc updates:**

1. `README.md` — Phase 2 run instructions, env block, layout includes `review.ts`
2. `docs/phase-2-feature.md` — Status: Implemented; document `generateReview`, `truncateDiff`; check success criteria
3. `.env.example` — `OPENAI_API_KEY=`
4. `docs/PLAN.md` — `llm-review` and `terminal-output` todos completed; checklist Phase 2 items `[x]`

## Anti-patterns

- Changing code without touching any doc when behavior or setup changed
- Duplicating full phase feature content inside README (link instead)
- Marking a phase Implemented in PLAN but leaving `phase-N-feature.md` as “Planned”
- Updating unrelated phase docs (e.g. editing phase-5 when only phase-2 changed)
