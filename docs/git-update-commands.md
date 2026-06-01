# Git — first commit and push to GitHub

You're on the right track. Here's how to make your **first commit** on `feat-vk-CLIvsGithubCommunication` and push it to GitHub.

---

## Current situation

From what you described:

- You created branch **`feat-vk-CLIvsGithubCommunication`** on GitHub.
- The repo has **no project files yet** (empty or only GitHub's default README).
- Your **local code** is in `C:\Users\VieronickaKanesamoor\pr-review-agent`.

So you need to: **init git locally → connect remote → commit → push to that branch**.

---

## Before you start

**Do not commit `.env`** — it contains your GitHub token.  
Your `.gitignore` already excludes it (good).

**Safe to commit:**

- `src/`
- `docs/`
- `.cursor/skills/`
- `README.md`
- `package.json`, `package-lock.json`
- `tsconfig.json`
- `.env.example` (placeholders only, no real secrets)
- `.gitignore`

---

## Step-by-step (PowerShell)

Run these from your project folder:

```powershell
cd C:\Users\VieronickaKanesamoor\pr-review-agent
```

### 1. Initialize git (if not done yet)

```powershell
git init
```

**Why:** Turns this folder into a git repo so you can commit.

---

### 2. Connect to your GitHub repo

Replace with your actual repo URL if different:

```powershell
git remote add origin https://github.com/vieronicka/PR-Review-Bot.git
```

**Why:** Links local folder to GitHub so `push` knows where to send files.

If `origin` already exists:

```powershell
git remote -v
```

---

### 3. Create/switch to your feature branch locally

```powershell
git checkout -b feat-vk-CLIvsGithubCommunication
```

**Why:** Local branch name should match the branch you created on GitHub.

---

### 4. Stage files

```powershell
git add .
```

**Why:** Prepares all tracked files for commit (`.env` and `node_modules/` are ignored).

**Verify before commit:**

```powershell
git status
```

You should **not** see `.env` in "Changes to be committed".

---

### 5. First commit

```powershell
git commit -m "feat: add Phase 1 CLI for GitHub PR fetch (dry-run)"
```

**Why:** Creates the first snapshot of your project on this branch.

Good first-commit message because it describes **Phase 1**: CLI talks to GitHub, no AI yet.

---

### 6. Push to GitHub

If the GitHub repo is **empty** (no commits yet):

```powershell
git push -u origin feat-vk-CLIvsGithubCommunication
```

If GitHub already has commits on `main` (e.g. README from "Create repo"):

```powershell
git fetch origin
git push -u origin feat-vk-CLIvsGithubCommunication
```

**Why `-u`:** Sets upstream so future pushes can use just `git push`.

---

## If push is rejected

| Error | Meaning | Fix |
|-------|---------|-----|
| `failed to push some refs` / non-fast-forward | Remote branch has commits you don't have | `git pull origin feat-vk-CLIvsGithubCommunication --rebase` then push again |
| `repository not found` | Wrong URL or no access | Check repo name and GitHub login |
| Auth failed | Not logged in | Use GitHub CLI `gh auth login` or a PAT for HTTPS |

---

## After push

On GitHub you should see:

- Branch: `feat-vk-CLIvsGithubCommunication`
- Files: `src/`, `docs/`, `README.md`, etc.
- **No** `.env` file

Then open a **Pull Request** from that branch → `main` when ready.

---

## Quick checklist

- [ ] `.env` is **not** staged
- [ ] `git status` looks correct
- [ ] Commit message describes Phase 1
- [ ] Push to `feat-vk-CLIvsGithubCommunication`
- [ ] Files visible on GitHub
