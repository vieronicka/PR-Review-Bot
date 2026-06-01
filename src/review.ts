import { z } from "zod";
import type { LlmConfig } from "./config.js";
import type { PrSummary } from "./github.js";

const ReviewSchema = z.object({
  summary: z.string(),
  risks: z.array(z.string()),
  suggestions: z.array(z.string()),
  lineComments: z
    .array(
      z.object({
        path: z.string(),
        line: z.number().int().positive(),
        body: z.string(),
      }),
    )
    .optional(),
});

export type ReviewResult = z.infer<typeof ReviewSchema>;

const SKIP_FILE_PATTERNS = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)Cargo\.lock$/,
  /\.min\.(js|css)$/,
];

const DEFAULT_MAX_DIFF_CHARS = 80_000;

export type TruncateResult = {
  diff: string;
  omittedFileCount: number;
  skippedLockfiles: number;
};

/** Split unified diff by file; cap total size; skip noisy lockfiles */
export function truncateDiff(
  diffText: string,
  maxChars: number = DEFAULT_MAX_DIFF_CHARS,
): TruncateResult {
  const parts = diffText.split(/(?=^diff --git )/m);
  const header = parts[0]?.startsWith("diff --git") ? "" : (parts.shift() ?? "");
  const chunks: string[] = header ? [header] : [];
  let omittedFileCount = 0;
  let skippedLockfiles = 0;
  let totalLen = chunks.join("").length;

  for (const part of parts) {
    if (!part.startsWith("diff --git ")) continue;

    const firstLine = part.split("\n")[0] ?? "";
    const pathMatch = firstLine.match(/^diff --git a\/(.+?) b\//);
    const path = pathMatch?.[1] ?? "";

    if (SKIP_FILE_PATTERNS.some((re) => re.test(path))) {
      skippedLockfiles += 1;
      continue;
    }

    if (totalLen + part.length > maxChars) {
      omittedFileCount += 1;
      continue;
    }

    chunks.push(part);
    totalLen += part.length;
  }

  let diff = chunks.join("");
  const notes: string[] = [];
  if (skippedLockfiles > 0) {
    notes.push(`${skippedLockfiles} lockfile(s) skipped`);
  }
  if (omittedFileCount > 0) {
    notes.push(`${omittedFileCount} file(s) omitted (size limit)`);
  }
  if (notes.length > 0) {
    diff += `\n\n[Diff truncated: ${notes.join("; ")}. Max ${maxChars.toLocaleString()} chars.]\n`;
  }

  return { diff, omittedFileCount, skippedLockfiles };
}

export function buildPrompt(summary: PrSummary, truncatedDiff: string): {
  system: string;
  user: string;
} {
  const fileList = summary.files
    .map((f) => `- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`)
    .join("\n");

  const system = `You are a senior software engineer performing a pull request code review.
Respond with a single JSON object only (no markdown fences), matching this shape:
{
  "summary": "2-4 sentences overall assessment",
  "risks": ["bugs, security, or breaking issues"],
  "suggestions": ["specific actionable improvements"],
  "lineComments": [{"path": "file.ts", "line": 10, "body": "optional inline note"}]
}

Focus on correctness, missing tests, error handling, and security (secrets, injection).
Avoid pure style nitpicks. lineComments is optional; include only high-value items.`;

  const user = `Review this pull request.

Title: ${summary.title}
Author: @${summary.author}
Base: ${summary.baseBranch} ← Head: ${summary.headBranch}
Stats: ${summary.changedFiles} files, +${summary.additions}/-${summary.deletions}
PR description:
${summary.body?.trim() || "(none)"}

Changed files:
${fileList}

Unified diff:
${truncatedDiff}`;

  return { system, user };
}

async function callOpenAi(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no message content");
  }
  return content;
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429 && body.includes("limit: 0")) {
      throw new Error(
        `Gemini free-tier quota is 0 for model "${model}". ` +
          `Try GEMINI_MODEL=gemini-2.5-flash in .env, or enable billing in AI Studio (can unlock free-tier limits). ` +
          `Details: https://ai.google.dev/gemini-api/docs/rate-limits\n${body}`,
      );
    }
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Gemini returned no message content");
  }
  return content;
}

async function callLlm(
  llm: LlmConfig,
  system: string,
  user: string,
): Promise<string> {
  if (llm.provider === "gemini") {
    return callGemini(llm.apiKey, llm.model, system, user);
  }
  return callOpenAi(llm.apiKey, llm.model, system, user);
}

function parseReviewJson(raw: string): ReviewResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM response was not valid JSON");
  }
  return ReviewSchema.parse(parsed);
}

/** Fetch AI review: truncate diff → LLM → Zod validate (one retry on parse failure) */
export async function generateReview(
  summary: PrSummary,
  llm: LlmConfig,
): Promise<ReviewResult> {
  const { diff } = truncateDiff(summary.diffText);
  const { system, user } = buildPrompt(summary, diff);

  let raw = await callLlm(llm, system, user);

  try {
    return parseReviewJson(raw);
  } catch (firstError) {
    const retryUser = `${user}\n\nYour previous reply was invalid. Return ONLY valid JSON matching the required schema.`;
    raw = await callLlm(llm, system, retryUser);
    try {
      return parseReviewJson(raw);
    } catch {
      const hint =
        firstError instanceof Error ? firstError.message : String(firstError);
      throw new Error(`Failed to parse LLM review after retry: ${hint}`);
    }
  }
}

export function printReview(review: ReviewResult): void {
  console.log("\n--- AI review ---\n");
  console.log("Summary");
  console.log("-------");
  console.log(`  ${review.summary}\n`);

  console.log("Risks");
  console.log("-----");
  if (review.risks.length === 0) {
    console.log("  (none identified)\n");
  } else {
    for (const r of review.risks) {
      console.log(`  • ${r}`);
    }
    console.log();
  }

  console.log("Suggestions");
  console.log("-----------");
  if (review.suggestions.length === 0) {
    console.log("  (none)\n");
  } else {
    for (const s of review.suggestions) {
      console.log(`  • ${s}`);
    }
    console.log();
  }

  if (review.lineComments && review.lineComments.length > 0) {
    console.log("Line comments (for your notes — not posted in Phase 2)");
    console.log("--------------------------------------------------------");
    for (const c of review.lineComments) {
      console.log(`  ${c.path}:${c.line} — ${c.body}`);
    }
    console.log();
  }

  console.log("Review complete. Nothing posted to GitHub (Phase 3 adds --post).\n");
}
