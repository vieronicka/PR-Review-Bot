import "dotenv/config";

export type RepoRef = { owner: string; repo: string };

export type LlmProvider = "gemini" | "openai";

export type LlmConfig = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
};

export function loadConfig(): {
  token: string;
  username: string;
} {
  const token = process.env.GITHUB_TOKEN?.trim();
  const username =
    process.env.GITHUB_USERNAME?.trim() ||
    (process.env.GITHUB_ACTIONS === "true" ? "github-actions[bot]" : "");

  if (!token) {
    throw new Error(
      "Missing GITHUB_TOKEN. Copy .env.example to .env and add your token (or use GITHUB_TOKEN in Actions).",
    );
  }
  if (!username) {
    throw new Error(
      "Missing GITHUB_USERNAME. Set your GitHub login name in .env.",
    );
  }

  return { token, username };
}

/**
 * LLM provider for Phase 2.
 * Default: gemini (free tier friendly). Set LLM_PROVIDER=openai when you have OpenAI credits.
 */
export function loadLlmConfig(): LlmConfig {
  const explicit = process.env.LLM_PROVIDER?.trim().toLowerCase();

  let provider: LlmProvider;
  if (explicit === "openai" || explicit === "gemini") {
    provider = explicit;
  } else if (explicit) {
    throw new Error(
      `Invalid LLM_PROVIDER "${explicit}". Use "gemini" or "openai".`,
    );
  } else {
    provider = "gemini";
  }

  if (provider === "gemini") {
    const apiKey =
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim();
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    if (!apiKey) {
      throw new Error(
        "Missing GEMINI_API_KEY. Get a key at https://aistudio.google.com/apikey",
      );
    }
    if (!apiKey.startsWith("AIza") && !apiKey.startsWith("AQ.")) {
      console.warn(
        "Warning: GEMINI_API_KEY usually starts with AIzaSy (from AI Studio). Check you copied the API key, not another token.",
      );
    }
    return { provider: "gemini", apiKey, model };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it to .env — get a key at https://platform.openai.com/api-keys",
    );
  }
  return { provider: "openai", apiKey, model };
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
