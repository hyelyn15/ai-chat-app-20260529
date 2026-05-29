import {
  CLIENT_ID_HEADER,
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

export async function bootstrapClient(
  legacy: LegacyStorageSnapshot,
): Promise<BootstrapResponse> {
  const response = await fetch("/api/client", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      legacyChat: legacy.chat,
      legacyMcp: legacy.mcp,
    }),
  });

  if (!response.ok) await parseError(response);
  return response.json() as Promise<BootstrapResponse>;
}

export async function fetchChatState(clientId: string): Promise<ChatState> {
  const response = await fetch("/api/chat", {
    headers: { [CLIENT_ID_HEADER]: clientId },
  });
  if (!response.ok) await parseError(response);
  const data = (await response.json()) as ChatState;
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

export async function saveChatState(
  clientId: string,
  state: ChatState,
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "PUT",
    headers: {
      [CLIENT_ID_HEADER]: clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(state),
  });
  if (!response.ok) await parseError(response);
}

export async function fetchMcpServersState(
  clientId: string,
): Promise<McpServersState> {
  const response = await fetch("/api/mcp/servers", {
    headers: { [CLIENT_ID_HEADER]: clientId },
  });
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

export async function saveMcpServersState(
  clientId: string,
  state: McpServersState,
): Promise<void> {
  const response = await fetch("/api/mcp/servers", {
    method: "PUT",
    headers: {
      [CLIENT_ID_HEADER]: clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(state),
  });
  if (!response.ok) await parseError(response);
}

export async function migrateLegacyToExistingClient(
  clientId: string,
  legacy: LegacyStorageSnapshot,
): Promise<void> {
  if (legacy.chat) {
    await saveChatState(clientId, {
      activeRoomId: legacy.chat.activeRoomId,
      rooms: legacy.chat.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        createdAt: new Date(room.createdAt),
        messages: room.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          images: message.images,
          createdAt: new Date(message.createdAt),
        })),
      })),
    });
  }

  if (legacy.mcp?.length) {
    await saveMcpServersState(clientId, {
      servers: legacy.mcp.map((server) => ({
        ...server,
        status:
          server.status === "connected" ? "connected" : "disconnected",
        createdAt: new Date(server.createdAt),
      })),
      activeServerId: legacy.mcp[0]?.id ?? null,
    });
  }
}
