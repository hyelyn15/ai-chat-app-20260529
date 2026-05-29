import { requireClientId } from "@/lib/auth/require-client-id";
import type { LegacyChatPayload } from "@/lib/supabase/chat-mapper";
import { saveChatState } from "@/lib/supabase/chat-repository";
import {
  saveLegacyMcpServers,
} from "@/lib/supabase/mcp-repository";
import type { McpServer } from "@/types/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LegacyMcpServer = Omit<McpServer, "createdAt"> & { createdAt: string };

type MigrateBody = {
  legacyChat?: LegacyChatPayload;
  legacyMcp?: LegacyMcpServer[];
};

export async function POST(request: Request) {
  const clientId = await requireClientId();
  if (clientId instanceof Response) return clientId;

  let body: MigrateBody = {};
  try {
    body = (await request.json()) as MigrateBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.legacyChat) {
      await saveChatState(clientId, {
        activeRoomId: body.legacyChat.activeRoomId,
        rooms: body.legacyChat.rooms.map((room) => ({
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

    if (body.legacyMcp?.length) {
      await saveLegacyMcpServers(clientId, body.legacyMcp);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "마이그레이션에 실패했습니다." },
      { status: 500 },
    );
  }
}
