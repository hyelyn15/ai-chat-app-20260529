export const CLIENT_ID_HEADER = "X-Client-Id";

export const LEGACY_CHAT_STORAGE_KEY = "ai_chat_rooms";
export const LEGACY_MCP_STORAGE_KEY = "ai_chat_mcp_servers";
export const CLIENT_ID_STORAGE_KEY = "ai_chat_client_id";

export function getStoredClientId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLIENT_ID_STORAGE_KEY);
}

export function setStoredClientId(clientId: string): void {
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
}

export function clearLegacyStorage(): void {
  localStorage.removeItem(LEGACY_CHAT_STORAGE_KEY);
  localStorage.removeItem(LEGACY_MCP_STORAGE_KEY);
}
