import { readFileSync } from "fs";
import { join } from "path";

export function readEnvLocal(key: string): string | undefined {
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
