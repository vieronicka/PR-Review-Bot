# Phase 5 — GitHub Actions setup guide

**Goal:** Automatically review PRs when opened or updated — posts as `github-actions[bot]`.

---

## Is Phase 5 appropriate now?

**Yes**, if Phase 1–3 work locally:

| Phase | Required before Actions |
|-------|-------------------------|
| 1 — GitHub fetch | Yes |
| 2 — LLM review | Yes |
| 3 — `--post` | Yes |

Actions only **automates** the same `npm run review -- --post` command in the cloud.

---

## One-time repository setup (admin)

### 1. Add secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required? | Value |
|--------|-----------|-------|
| `GEMINI_API_KEY` | Yes (if using Gemini) | From [AI Studio](https://aistudio.google.com/apikey) |
| `OPENAI_API_KEY` | Only if using OpenAI | From [OpenAI](https://platform.openai.com/api-keys) |

**Why secrets:** Contributors can trigger the workflow without seeing your API keys.

### 2. Optional variables

**Settings → Secrets and variables → Actions → Variables**

| Variable | Default | Example |
|----------|---------|---------|
| `LLM_PROVIDER` | `gemini` | `gemini` or `openai` |
| `GEMINI_MODEL` | `gemini-2.5-flash` | `gemini-2.5-flash` |

### 3. Merge the workflow file

Commit `.github/workflows/pr-review.yml` to your default branch (usually `main`).

**Why:** Workflows only run from the default branch for `pull_request` events (for new PRs targeting the repo).

### 4. Enable Actions

**Settings → Actions → General** — allow Actions for this repository.

---

## What triggers a review

| Event | When |
|-------|------|
| PR opened | First review |
| Push to PR branch (`synchronize`) | Re-review if **head commit SHA changed** |
| **Actions → PR Review Agent → Run workflow** | Manual re-run (enter PR number) |

**Skipped automatically:**

- Draft PRs
- PRs opened by `dependabot[bot]`

---

## How it differs from your laptop CLI

| | Local CLI | GitHub Action |
|---|-----------|---------------|
| Who posts | You (`@vieronicka`) | `github-actions[bot]` |
| Token | Your PAT | `GITHUB_TOKEN` (automatic) |
| Author check | Only your PRs (default) | All PRs (`--allow-any-author`) |
| Secrets | `.env` | Repository secrets |
| Dedup cache | `.cache/` on disk | Actions cache per PR+commit |

---

## After you push new commits to a PR

1. GitHub runs workflow again (`synchronize`).
2. New `head.sha` → dedup cache miss → **new review comment** posted.
3. Old review comments **stay** (not updated).

Same behavior as local `--post` with a new commit.

---

## Fork PRs (security)

Workflow uses `pull_request` (not `pull_request_target`).

- **Same-repo branches:** secrets available, review runs.
- **Fork PRs from strangers:** secrets may **not** run on fork workflows (GitHub security default).

**Why:** Prevents untrusted code in fork PRs from accessing `GEMINI_API_KEY`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Workflow does not appear | Merge workflow to `main`; enable Actions in repo settings |
| Job fails: missing `GEMINI_API_KEY` | Add secret in repo settings |
| 403 on post | Job needs `pull-requests: write` (in workflow file) |
| Gemini 503 | Retry workflow from Actions tab |
| Duplicate comments on same commit | Expected if you use **Re-run all jobs** — cache restores dedup; use only when needed |

---

## Test manually

1. Add secrets on GitHub.
2. Push `.github/workflows/pr-review.yml` to `main`.
3. Open a test PR (or use **Run workflow** with a PR number).
4. Check PR for comment from **github-actions[bot]**.

---

## Related

- [phase-5-feature.md](./phase-5-feature.md) — architecture
- [README.md](../README.md) — CLI commands
