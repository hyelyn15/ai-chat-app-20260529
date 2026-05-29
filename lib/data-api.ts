import {
  LEGACY_CHAT_STORAGE_KEY,
  LEGACY_MCP_STORAGE_KEY,
} from "@/lib/client-id";
import type { ChatState, LegacyChatPayload } from "@/lib/supabase/chat-mapper";
import type { McpServersState } from "@/lib/supabase/mcp-repository";
import type { McpServer } from "@/types/mcp";

type SerializedMcpServer = Omit<McpServer, "createdAt"> & { createdAt: string };

export type LegacyStorageSnapshot = {
  chat: LegacyChatPayload | null;
  mcp: SerializedMcpServer[] | null;
};

const fetchOptions: RequestInit = { credentials: "include" };

export function readLegacyStorage(): LegacyStorageSnapshot {
  if (typeof window === "undefined") {
    return { chat: null, mcp: null };
  }

  let chat: LegacyChatPayload | null = null;
  let mcp: SerializedMcpServer[] | null = null;

  try {
    const chatRaw = localStorage.getItem(LEGACY_CHAT_STORAGE_KEY);
    if (chatRaw) chat = JSON.parse(chatRaw) as LegacyChatPayload;
  } catch {
    chat = null;
  }

  try {
    const mcpRaw = localStorage.getItem(LEGACY_MCP_STORAGE_KEY);
    if (mcpRaw) {
      const parsed = JSON.parse(mcpRaw) as SerializedMcpServer[];
      mcp = Array.isArray(parsed) ? parsed : null;
    }
  } catch {
    mcp = null;
  }

  return { chat, mcp };
}

export type BootstrapResponse = {
  clientId: string;
  chat: ChatState;
  mcp: McpServersState;
};

async function parseError(response: Response): Promise<never> {
  const data = await response.json().catch(() => ({}));
  throw new Error(data?.error ?? `요청에 실패했습니다. (${response.status})`);
}

export async function fetchClientSession(): Promise<BootstrapResponse> {
  const response = await fetch("/api/client", fetchOptions);
  if (!response.ok) await parseError(response);
  return normalizeBootstrapResponse(await response.json());
}

export async function bootstrapClient(
  legacy: LegacyStorageSnapshot,
): Promise<BootstrapResponse> {
  const response = await fetch("/api/client", {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      legacyChat: legacy.chat,
      legacyMcp: legacy.mcp,
    }),
  });

  if (!response.ok) await parseError(response);
  return normalizeBootstrapResponse(await response.json());
}

export async function migrateLegacyToExistingClient(
  legacy: LegacyStorageSnapshot,
): Promise<void> {
  const response = await fetch("/api/client/migrate", {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      legacyChat: legacy.chat,
      legacyMcp: legacy.mcp,
    }),
  });
  if (!response.ok) await parseError(response);
}

export async function fetchChatState(): Promise<ChatState> {
  const response = await fetch("/api/chat", fetchOptions);
  if (!response.ok) await parseError(response);
  const data = (await response.json()) as ChatState;
  return normalizeChatState(data);
}

export async function saveChatState(state: ChatState): Promise<void> {
  const response = await fetch("/api/chat", {
    ...fetchOptions,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!response.ok) await parseError(response);
}

export async function fetchMcpServersState(): Promise<McpServersState> {
  const response = await fetch("/api/mcp/servers", fetchOptions);
  if (!response.ok) await parseError(response);
  const data = (await response.json()) as McpServersState;
  return {
    ...data,
    servers: data.servers.map((server) => ({
      ...server,
      createdAt: new Date(server.createdAt),
    })),
  };
}

export async function saveMcpServersState(state: McpServersState): Promise<void> {
  const response = await fetch("/api/mcp/servers", {
    ...fetchOptions,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!response.ok) await parseError(response);
}

function normalizeBootstrapResponse(data: BootstrapResponse): BootstrapResponse {
  return {
    ...data,
    chat: normalizeChatState(data.chat),
    mcp: {
      ...data.mcp,
      servers: data.mcp.servers.map((server) => ({
        ...server,
        createdAt: new Date(server.createdAt),
      })),
    },
  };
}

function normalizeChatState(data: ChatState): ChatState {
  return {
    ...data,
    rooms: data.rooms.map((room) => ({
      ...room,
      createdAt: new Date(room.createdAt),
      messages: room.messages.map((message) => ({
        ...message,
        createdAt: new Date(message.createdAt),
      })),
    })),
  };
}
