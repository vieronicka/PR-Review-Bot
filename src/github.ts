import { Octokit } from "@octokit/rest";
import type { RepoRef } from "./config.js";

export type PrSummary = {
  number: number;
  title: string;
  state: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  url: string;
  body: string | null;
  changedFiles: number;
  additions: number;
  deletions: number;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
  diffCharCount: number;
};

export function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

/**
 * Phase 1 core: talk to GitHub and pull everything we need for a future AI review.
 *
 * APIs used:
 * - pulls.get          → PR metadata (title, author, branches)
 * - pulls.listFiles    → per-file stats (no full patch yet in dry-run display)
 * - pulls.get with mediaType diff → raw unified diff text
 */
export async function fetchPrSummary(
  octokit: Octokit,
  repo: RepoRef,
  prNumber: number,
): Promise<PrSummary> {
  const { owner, repo: repoName } = repo;

  const { data: pr } = await octokit.pulls.get({
    owner,
    repo: repoName,
    pull_number: prNumber,
  });

  const { data: fileList } = await octokit.pulls.listFiles({
    owner,
    repo: repoName,
    pull_number: prNumber,
    per_page: 100,
  });

  // Request the diff as plain text (application/vnd.github.diff)
  const diffResponse = await octokit.pulls.get({
    owner,
    repo: repoName,
    pull_number: prNumber,
    mediaType: { format: "diff" },
  });

  const diffText =
    typeof diffResponse.data === "string"
      ? diffResponse.data
      : JSON.stringify(diffResponse.data);

  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    author: pr.user?.login ?? "unknown",
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    url: pr.html_url,
    body: pr.body,
    changedFiles: pr.changed_files,
    additions: pr.additions,
    deletions: pr.deletions,
    files: fileList.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
    })),
    diffCharCount: diffText.length,
  };
}

export function assertAuthorIsUser(
  summary: PrSummary,
  expectedUsername: string,
): void {
  const normalized = expectedUsername.toLowerCase();
  if (summary.author.toLowerCase() !== normalized) {
    throw new Error(
      `PR #${summary.number} was opened by @${summary.author}, not @${expectedUsername}. ` +
        `This tool is configured to review only your own PRs.`,
    );
  }
}
