"use client";

import {
  clearLegacyStorage,
  getStoredClientId,
  setStoredClientId,
} from "@/lib/client-id";
import {
  bootstrapClient,
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
  let clientId = getStoredClientId();

  if (!clientId) {
    const boot = await bootstrapClient(legacy);
    clientId = boot.clientId;
    setStoredClientId(clientId);
    clearLegacyStorage();
    return clientId;
  }

  if (legacy.chat || legacy.mcp?.length) {
    await migrateLegacyToExistingClient(clientId, legacy);
    clearLegacyStorage();
  }

  return clientId;
}

export function resetClientSessionForTests(): void {
  sessionPromise = null;
}
