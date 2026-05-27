import "dotenv/config";

export type RepoRef = { owner: string; repo: string };

export function loadConfig(): {
  token: string;
  username: string;
} {
  const token = process.env.GITHUB_TOKEN?.trim();
  const username = process.env.GITHUB_USERNAME?.trim();

  if (!token) {
    throw new Error(
      "Missing GITHUB_TOKEN. Copy .env.example to .env and add your token.",
    );
  }
  if (!username) {
    throw new Error(
      "Missing GITHUB_USERNAME. Set your GitHub login name in .env.",
    );
  }

  return { token, username };
}

/** Parse "octocat/Hello-World" into { owner, repo } */
export function parseRepo(slug: string): RepoRef {
  const parts = slug.trim().split("/").filter(Boolean);
  if (parts.length !== 2) {
    throw new Error(
      `Invalid repo "${slug}". Use format: owner/repo (e.g. microsoft/vscode)`,
    );
  }
  return { owner: parts[0], repo: parts[1] };
}
