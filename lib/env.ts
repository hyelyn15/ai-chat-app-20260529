import { readFileSync } from "fs";
import { join } from "path";

const DEFAULT_MODEL = "gemini-2.5-flash";

function readEnvLocal(key: string): string | undefined {
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const envKey = trimmed.slice(0, separator).trim();
      if (envKey !== key) continue;

      return trimmed
        .slice(separator + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isLikelyValidGeminiKey(key: string | undefined): boolean {
  return Boolean(key && key.length >= 20);
}

export function getGeminiApiKey(): string {
  const fromFile = readEnvLocal("GEMINI_API_KEY");
  const fromEnv = (
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  )?.trim();

  // .env.local을 우선 — 셸/프로세스 환경변수가 잘못된 키로 덮어쓰는 것을 방지
  const apiKey = isLikelyValidGeminiKey(fromFile)
    ? fromFile
    : isLikelyValidGeminiKey(fromEnv)
      ? fromEnv
      : (fromFile ?? fromEnv);

  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  return apiKey;
}

export function getLlmModel(): string {
  const fromFile = readEnvLocal("LLM_MODEL");
  const fromEnv = process.env.LLM_MODEL;
  return (fromFile ?? fromEnv ?? DEFAULT_MODEL).trim();
}
