#!/usr/bin/env node
/**
 * Phase 1 entry point — learn the GitHub side before adding AI.
 *
 * Flow:
 *   1. Read .env (token + your username)
 *   2. Call GitHub API for the PR
 *   3. Print a human-readable summary (--dry-run is default behavior for now)
 */
import { Command } from "commander";
import { loadConfig, parseRepo } from "./config.js";
import {
  assertAuthorIsUser,
  createOctokit,
  fetchPrSummary,
} from "./github.js";

const program = new Command();

program
  .name("pr-review")
  .description("PR review agent — Phase 1: fetch and inspect GitHub PRs")
  .requiredOption("-r, --repo <slug>", "Repository as owner/repo")
  .requiredOption("-p, --pr <number>", "Pull request number", (v) => {
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n) || n < 1) throw new Error("PR number must be a positive integer");
    return n;
  })
  .option(
    "--dry-run",
    "Fetch from GitHub and print summary only (default for Phase 1)",
    true,
  )
  .option(
    "--allow-any-author",
    "Skip check that you opened the PR (for testing on others' PRs)",
  );

program.parse();
const opts = program.opts<{
  repo: string;
  pr: number;
  dryRun: boolean;
  allowAnyAuthor?: boolean;
}>();

async function main(): Promise<void> {
  const { token, username } = loadConfig();
  const repo = parseRepo(opts.repo);
  const octokit = createOctokit(token);

  console.log("\n--- Phase 1: GitHub fetch ---\n");
  console.log(`Connecting as GitHub user: @${username}`);
  console.log(`Repository: ${repo.owner}/${repo.repo}`);
  console.log(`PR number: ${opts.pr}\n`);

  const summary = await fetchPrSummary(octokit, repo, opts.pr);

  if (!opts.allowAnyAuthor) {
    assertAuthorIsUser(summary, username);
  }

  printSummary(summary, opts.dryRun);

  if (opts.dryRun) {
    console.log("Dry-run complete. No AI call and no comment posted on GitHub.");
    console.log("Next (Phase 2): send the diff to an LLM and print a review.\n");
  }
}

function printSummary(
  summary: Awaited<ReturnType<typeof fetchPrSummary>>,
  dryRun: boolean,
): void {
  console.log("PR summary");
  console.log("----------");
  console.log(`  #${summary.number}  ${summary.title}`);
  console.log(`  URL:    ${summary.url}`);
  console.log(`  State:  ${summary.state}`);
  console.log(`  Author: @${summary.author}`);
  console.log(`  Base:   ${summary.baseBranch}  ← merge target`);
  console.log(`  Head:   ${summary.headBranch}  ← your branch`);
  console.log(
    `  Stats:  ${summary.changedFiles} files, +${summary.additions} / -${summary.deletions} lines`,
  );
  console.log(`  Diff size (chars): ${summary.diffCharCount.toLocaleString()}`);

  if (summary.body?.trim()) {
    console.log("\n  Description (first 200 chars):");
    console.log(
      `  ${summary.body.trim().slice(0, 200).replace(/\n/g, "\n  ")}${summary.body.length > 200 ? "…" : ""}`,
    );
  }

  console.log("\n  Changed files:");
  for (const f of summary.files) {
    console.log(
      `    [${f.status.padEnd(12)}] ${f.filename}  (+${f.additions} -${f.deletions})`,
    );
  }

  if (dryRun && summary.diffCharCount > 100_000) {
    console.log(
      "\n  Note: Large diff — Phase 2 will need truncation before sending to an LLM.",
    );
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nError: ${message}\n`);
  process.exit(1);
});
