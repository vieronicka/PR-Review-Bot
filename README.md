# PR Review Agent

A small CLI to learn how GitHub pull requests work and, in later phases, post AI-generated reviews.

## Phase 1 (current): GitHub only — no AI

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
   ```

### Run Phase 1

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

### Project layout

```
pr-review-agent/
  src/
    cli.ts      ← command-line arguments and printing
    config.ts   ← .env and repo parsing
    github.ts   ← all GitHub API calls
  .env.example
  package.json
```

## Cursor project skill

This repo includes a **project-scoped** agent skill at `.cursor/skills/update-project-docs/` so Cursor keeps `README.md` and `docs/` in sync when you implement features. It applies only in this workspace, not globally.

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/PLAN.md](docs/PLAN.md) | Full learning plan and progress checklist |
| [docs/git-update-commands.md](docs/git-update-commands.md) | First commit and push to GitHub (branch setup) |
| [docs/phase-1-feature.md](docs/phase-1-feature.md) | Phase 1: GitHub fetch — what, why, how (implemented) |
| [docs/phase-2-feature.md](docs/phase-2-feature.md) | Phase 2: LLM review — planned |
| [docs/phase-3-feature.md](docs/phase-3-feature.md) | Phase 3: Post review to GitHub — planned |
| [docs/phase-4-feature.md](docs/phase-4-feature.md) | Phase 4: React dashboard — optional |
| [docs/phase-5-feature.md](docs/phase-5-feature.md) | Phase 5: GitHub Action — optional |

## Roadmap

- **Phase 2** — Send diff to OpenAI/Azure OpenAI, print JSON review → [phase-2-feature.md](docs/phase-2-feature.md)
- **Phase 3** — `--post` to create a PR review comment on GitHub → [phase-3-feature.md](docs/phase-3-feature.md)
- **Phase 4** — Optional React UI → [phase-4-feature.md](docs/phase-4-feature.md)
- **Phase 5** — GitHub Action for whole-team reviews → [phase-5-feature.md](docs/phase-5-feature.md)
