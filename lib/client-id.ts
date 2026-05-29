export const LEGACY_CHAT_STORAGE_KEY = "ai_chat_rooms";
export const LEGACY_MCP_STORAGE_KEY = "ai_chat_mcp_servers";

export function clearLegacyStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_CHAT_STORAGE_KEY);
  localStorage.removeItem(LEGACY_MCP_STORAGE_KEY);
}
