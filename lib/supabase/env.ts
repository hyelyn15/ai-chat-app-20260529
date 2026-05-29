import { readEnvLocal } from "@/lib/env-reader";

function assertServiceRoleKey(key: string): string {
  const normalized = key.trim();
  if (
    normalized.startsWith("sb_publishable_") ||
    normalized.includes("anon")
  ) {
    throw new Error("INVALID_SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!normalized.startsWith("eyJ")) {
    throw new Error("INVALID_SUPABASE_SERVICE_ROLE_KEY");
  }
  return normalized;
}

export function getSupabaseUrl(): string {
  const fromFile = readEnvLocal("NEXT_PUBLIC_SUPABASE_URL");
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const url = fromFile ?? fromEnv;
  if (!url) {
    throw new Error("MISSING_SUPABASE_URL");
  }
  return url;
}

export function getSupabaseServiceRoleKey(): string {
  const fromFile = readEnvLocal("SUPABASE_SERVICE_ROLE_KEY");
  const fromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const key = fromFile ?? fromEnv;
  if (!key) {
    throw new Error("MISSING_SUPABASE_SERVICE_ROLE_KEY");
  }
  return assertServiceRoleKey(key);
}
