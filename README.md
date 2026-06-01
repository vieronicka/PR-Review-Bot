# PR Review Agent

A small CLI to learn how GitHub pull requests work and, in later phases, post AI-generated reviews.

## Phase 1: GitHub fetch (dry-run)

**Goal:** Prove your machine can read a PR the same way GitHub shows a diff.

### What you learn

| Concept | Where in code |
|--------|----------------|
| Environment secrets | `.env` + `src/config.ts` |
| `owner/repo` slug | `parseRepo()` in `config.ts` |
| GitHub REST API | `src/github.ts` (`pulls.get`, `pulls.listFiles`) |
| Unified diff | `pulls.get` with `mediaType: diff` |
| “Only my PRs” guard | `assertAuthorIsUser()` |

### Setup

1. **Node.js 20+** — check with `node -v`

2. **Install dependencies**

   ```bash
   cd C:\Users\VieronickaKanesamoor\pr-review-agent
   npm install
   ```

3. **GitHub token** (fine-grained PAT)

   - Go to [GitHub → Settings → Developer settings → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
   - Create a token with access to **one repository** you use for practice
   - Permissions: **Contents** (Read), **Pull requests** (Read)

4. **Configure `.env`**

   ```bash
   copy .env.example .env
   ```

   Edit `.env`:

   ```
   GITHUB_TOKEN=...
   GITHUB_USERNAME=your-login
   OPENAI_API_KEY=sk-...          # Phase 2
   OPENAI_MODEL=gpt-4o-mini        # optional
   ```

### Run Phase 1 (no OpenAI call)

Use a **real PR you opened** on a repo your token can access:

```bash
npm run review -- --repo owner/repo --pr 1 --dry-run
```

Example:

```bash
npm run review -- --repo octocat/Hello-World --pr 42 --dry-run
```

To test fetching without the author check:

```bash
npm run review -- --repo owner/repo --pr 1 --dry-run --allow-any-author
```

## Phase 2: AI review in terminal (Gemini or OpenAI)

**Goal:** Send the PR diff to an LLM and print a structured review (summary, risks, suggestions).

### Setup — Gemini (default)

1. Create an API key at [Google AI Studio](https://aistudio.google.com/apikey)
2. Add to `.env`:
   ```
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```
   **Why Gemini default:** Free tier is suitable for learning; no OpenAI prepaid credits required.

   **If you get 429 `limit: 0`:** `gemini-2.0-flash` often has **no free-tier quota** anymore. Use `gemini-2.5-flash`. Some accounts also need a billing method linked in [AI Studio](https://aistudio.google.com) to activate free limits (you are not charged until you exceed free quota).

### Setup — OpenAI (when you have API credits)

1. Create an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Add to `.env`:
   ```
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```
   **Why `gpt-4o-mini`:** Lower cost while learning; upgrade to `gpt-4o` if reviews feel shallow.

### Run Phase 2

```bash
npm run review -- --repo owner/repo --pr 1 --review
```

Example:

```bash
npm run review -- --repo vieronicka/PR-Review-Bot --pr 1 --review
```

Also works: `--no-dry-run` (same as `--review`).

**Why `--review`:** Dry-run is the default so you do not accidentally spend API credits. Omitting flags runs Phase 1 only.

See [docs/phase-2-feature.md](docs/phase-2-feature.md) for methods and flow.

## Phase 3 (current): Post review to GitHub

**Goal:** Publish the same AI review as a comment on the pull request (opt-in).

### PAT permission (required for `--post`)

Edit your fine-grained token → **Pull requests: Read and write** (was Read-only for Phase 1–2).

**Why:** Creating a PR review uses `POST .../pulls/{id}/reviews`, which requires write access.

### Run Phase 3

```bash
npm run review -- --repo owner/repo --pr 1 --review --post
```

`--post` implies `--review` (you do not need both flags, but both are fine).

| Flag | What |
|------|------|
| `--post` | Publish summary + risks + suggestions on the PR |
| `--force` | Post again even if this commit was already reviewed |
| (no `--post`) | Terminal only (Phase 2) |

**Deduplication:** `.cache/reviewed-shas.json` stores the last reviewed commit per PR so repeated runs do not spam the PR. Use `--force` to override.

See [docs/phase-3-feature.md](docs/phase-3-feature.md).

### Project layout

```
pr-review-agent/
  src/
    cli.ts      ← CLI orchestration
    config.ts   ← GitHub + OpenAI env
    github.ts   ← GitHub API
    review.ts        ← truncate diff, Gemini/OpenAI, Zod parse
    review-cache.ts  ← dedupe by commit SHA before --post
  .env.example
  .cache/            ← reviewed SHAs (gitignored)
  package.json
```

## Dependencies

Run once after cloning (installs everything in `package.json`, including Phase 2 packages):

```bash
npm install
```

You do **not** need to run `npm install zod` separately unless you are adding it yourself.

| Package | Phase | What it does |
|---------|-------|----------------|
| `@octokit/rest` | 1 | GitHub REST API client (fetch PR, diff, files) |
| `commander` | 1 | CLI flags (`--repo`, `--pr`, `--dry-run`) |
| `dotenv` | 1 | Load secrets from `.env` |
| **`zod`** | **2** | Validate LLM JSON review before printing (see below) |
| `tsx` | dev | Run TypeScript without a separate compile step |
| `typescript` | dev | Type checking (`npm run typecheck`) |

### What is Zod? (Phase 2)

[Zod](https://zod.dev/) checks that the LLM response matches the shape your app expects (`summary`, `risks`, `suggestions`, optional `lineComments`). Gemini and OpenAI return text; the model can omit fields or return invalid JSON. Zod catches that in `src/review.ts` so you get a clear error (and one automatic retry) instead of broken output.

**Why it’s a dependency:** Listed in `package.json` → installed by `npm install` → imported in `review.ts` as `import { z } from "zod"`.

More detail: [docs/phase-2-feature.md](docs/phase-2-feature.md) (Dependencies section).

## Cursor project skill

This repo includes a **project-scoped** agent skill at `.cursor/skills/update-project-docs/` so Cursor keeps `README.md` and `docs/` in sync when you implement features. It applies only in this workspace, not globally.

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/PLAN.md](docs/PLAN.md) | Full learning plan and progress checklist |
| [docs/git-update-commands.md](docs/git-update-commands.md) | First commit and push to GitHub (branch setup) |
| [docs/phase-1-feature.md](docs/phase-1-feature.md) | Phase 1: GitHub fetch — what, why, how (implemented) |
| [docs/phase-2-feature.md](docs/phase-2-feature.md) | Phase 2: Gemini / OpenAI review — implemented |
| [docs/phase-3-feature.md](docs/phase-3-feature.md) | Phase 3: Post review to GitHub — implemented |
| [docs/phase-4-feature.md](docs/phase-4-feature.md) | Phase 4: React dashboard — optional |
| [docs/phase-5-feature.md](docs/phase-5-feature.md) | Phase 5: GitHub Action — optional |

## Roadmap

- **Phase 2** — Gemini / OpenAI review in terminal → [phase-2-feature.md](docs/phase-2-feature.md) (done)
- **Phase 3** — `--post` to GitHub → [phase-3-feature.md](docs/phase-3-feature.md) (done)
- **Phase 4** — Optional React UI → [phase-4-feature.md](docs/phase-4-feature.md)
- **Phase 5** — GitHub Action for whole-team reviews → [phase-5-feature.md](docs/phase-5-feature.md)
