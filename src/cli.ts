#!/usr/bin/env node
/**
 * PR review agent CLI
 *
 * Phase 1: --dry-run (default) — fetch PR from GitHub, print summary
 * Phase 2: --review — send diff to Gemini or OpenAI and print AI review
 * Phase 3: --post — publish review on GitHub (requires --review or use --post alone)
 */
import { Command, Option } from "commander";
import { loadConfig, loadLlmConfig, parseRepo } from "./config.js";
import {
  assertAuthorIsUser,
  createOctokit,
  fetchPrSummary,
  postPrReview,
} from "./github.js";
import { hasReviewedSha, saveReviewedSha } from "./review-cache.js";
import {
  formatReviewBody,
  generateReview,
  printReview,
} from "./review.js";

const program = new Command();

program
  .name("pr-review")
  .description("PR review agent — fetch GitHub PRs, AI review, optional post to PR")
  .requiredOption("-r, --repo <slug>", "Repository as owner/repo")
  .requiredOption("-p, --pr <number>", "Pull request number", (v) => {
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n) || n < 1) throw new Error("PR number must be a positive integer");
    return n;
  })
  .addOption(
    new Option(
      "--dry-run",
      "Fetch from GitHub and print summary only (no LLM call)",
    ).default(true),
  )
  .option(
    "--review",
    "Run AI review after fetch (same as --no-dry-run)",
  )
  .option(
    "--post",
    "Post AI review to GitHub as a PR comment (implies --review; needs Pull requests Write on PAT)",
  )
  .option(
    "--force",
    "Post even if this commit was already reviewed (skip deduplication cache)",
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
  review?: boolean;
  post?: boolean;
  force?: boolean;
  allowAnyAuthor?: boolean;
}>();

const wantsPost = opts.post === true;
const runAiReview =
  wantsPost ||
  opts.review === true ||
  process.argv.includes("--no-dry-run");
const dryRun = !runAiReview;

function providerLabel(provider: string): string {
  return provider === "gemini" ? "Gemini" : "OpenAI";
}

async function main(): Promise<void> {
  const { token, username } = loadConfig();
  const repo = parseRepo(opts.repo);
  const octokit = createOctokit(token);

  let phaseLabel = "Phase 1: GitHub fetch";
  if (runAiReview && wantsPost) {
    phaseLabel = "Phase 3: GitHub + AI review + post";
  } else if (runAiReview) {
    phaseLabel = "Phase 2: GitHub + AI review";
  }

  console.log(`\n--- ${phaseLabel} ---\n`);
  console.log(`Connecting as GitHub user: @${username}`);
  console.log(`Repository: ${repo.owner}/${repo.repo}`);
  console.log(`PR number: ${opts.pr}\n`);

  const summary = await fetchPrSummary(octokit, repo, opts.pr);

  if (!opts.allowAnyAuthor) {
    assertAuthorIsUser(summary, username);
  }

  printSummary(summary, dryRun);

  if (dryRun) {
    console.log("Dry-run complete. No LLM call and no comment posted on GitHub.");
    console.log("Next: run with --review to generate an AI review, or --review --post to publish on the PR.\n");
    return;
  }

  const llm = loadLlmConfig();
  console.log(`Calling ${providerLabel(llm.provider)} (${llm.model})…\n`);
  const review = await generateReview(summary, llm);

  let posted = false;
  let reviewUrl: string | undefined;

  if (wantsPost) {
    if (!opts.force && hasReviewedSha(repo, opts.pr, summary.headCommitSha)) {
      console.log(
        `Skipping post: PR #${opts.pr} at commit ${summary.headCommitSha.slice(0, 7)} was already reviewed.`,
      );
      console.log("Use --force to post again.\n");
      printReview(review);
      return;
    }

    const body = formatReviewBody(review);
    console.log("Posting review to GitHub…\n");
    reviewUrl = await postPrReview(
      octokit,
      repo,
      opts.pr,
      summary.headCommitSha,
      body,
    );
    saveReviewedSha(repo, opts.pr, summary.headCommitSha);
    posted = true;
  }

  printReview(review, { posted, reviewUrl });
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
  console.log(`  Head commit: ${summary.headCommitSha.slice(0, 7)}`);

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
      "\n  Note: Large diff — truncation will apply before sending to the LLM.",
    );
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nError: ${message}\n`);
  process.exit(1);
});
