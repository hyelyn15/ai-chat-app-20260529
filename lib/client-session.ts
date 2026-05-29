"use client";

import { clearLegacyStorage } from "@/lib/client-id";
import {
  bootstrapClient,
  fetchClientSession,
  migrateLegacyToExistingClient,
  readLegacyStorage,
} from "@/lib/data-api";

let sessionPromise: Promise<string> | null = null;

export function getClientSession(): Promise<string> {
  if (!sessionPromise) {
    sessionPromise = initClientSession().catch((error) => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

async function initClientSession(): Promise<string> {
  const legacy = readLegacyStorage();

  try {
    const session = await fetchClientSession();
    if (legacy.chat || legacy.mcp?.length) {
      await migrateLegacyToExistingClient(legacy);
      clearLegacyStorage();
    }
    return session.clientId;
  } catch {
    const boot = await bootstrapClient(legacy);
    clearLegacyStorage();
    return boot.clientId;
  }
}

export function resetClientSessionForTests(): void {
  sessionPromise = null;
}
