import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RepoRef } from "./config.js";

const CACHE_DIR = ".cache";
const CACHE_FILE = join(CACHE_DIR, "reviewed-shas.json");

type ReviewCache = Record<string, string>;

function cacheKey(repo: RepoRef, prNumber: number, sha: string): string {
  return `${repo.owner}/${repo.repo}#${prNumber}:${sha}`;
}

function loadCache(): ReviewCache {
  if (!existsSync(CACHE_FILE)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as ReviewCache;
  } catch {
    return {};
  }
}

function writeCache(cache: ReviewCache): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

/** True if we already posted a review for this PR at this commit SHA */
export function hasReviewedSha(
  repo: RepoRef,
  prNumber: number,
  sha: string,
): boolean {
  const cache = loadCache();
  return cacheKey(repo, prNumber, sha) in cache;
}

/** Record that a review was posted for this PR commit */
export function saveReviewedSha(
  repo: RepoRef,
  prNumber: number,
  sha: string,
): void {
  const cache = loadCache();
  cache[cacheKey(repo, prNumber, sha)] = new Date().toISOString();
  writeCache(cache);
}
