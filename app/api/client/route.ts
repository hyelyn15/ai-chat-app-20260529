import type { LegacyChatPayload } from "@/lib/supabase/chat-mapper";
import {
  clearClientIdCookie,
  getClientIdFromCookies,
  setClientIdCookie,
} from "@/lib/client-cookie";
import {
  clientExists,
  createClientWithChat,
  ensureChatState,
} from "@/lib/supabase/chat-repository";
import {
  loadMcpServers,
  saveLegacyMcpServers,
  type McpServersState,
} from "@/lib/supabase/mcp-repository";
import type { McpServer } from "@/types/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LegacyMcpServer = Omit<McpServer, "createdAt"> & { createdAt: string };

type ClientCreateBody = {
  legacyChat?: LegacyChatPayload;
  legacyMcp?: LegacyMcpServer[];
};

function mapStorageError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "MISSING_SUPABASE_URL") {
      return Response.json(
        { error: "NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다." },
        { status: 500 },
      );
    }
    if (error.message === "MISSING_SUPABASE_SERVICE_ROLE_KEY") {
      return Response.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. Supabase 대시보드 > Settings > API에서 확인해 주세요.",
        },
        { status: 500 },
      );
    }
    if (error.message === "INVALID_SUPABASE_SERVICE_ROLE_KEY") {
      return Response.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY 형식이 올바르지 않습니다. service_role JWT(eyJ...)를 사용해 주세요.",
        },
        { status: 500 },
      );
    }
  }
  return Response.json(
    { error: error instanceof Error ? error.message : "Client 생성에 실패했습니다." },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const clientId = await getClientIdFromCookies();
    if (!clientId || !(await clientExists(clientId))) {
      return Response.json({ error: "Client session이 없습니다." }, { status: 404 });
    }

    const chat = await ensureChatState(clientId);
    const mcp = (await loadMcpServers(clientId)) ?? {
      servers: [],
      activeServerId: null,
    };

    return Response.json({ clientId, chat, mcp });
  } catch (error) {
    return mapStorageError(error);
  }
}

export async function POST(request: Request) {
  let body: ClientCreateBody = {};
  try {
    body = (await request.json()) as ClientCreateBody;
  } catch {
    body = {};
  }

  try {
    const existingClientId = await getClientIdFromCookies();
    if (existingClientId) {
      const chat = await ensureChatState(existingClientId);
      const mcp = (await loadMcpServers(existingClientId)) ?? {
        servers: [],
        activeServerId: null,
      };
      return Response.json({ clientId: existingClientId, chat, mcp });
    }

    const { clientId, state } = await createClientWithChat(body.legacyChat);
    await setClientIdCookie(clientId);

    let mcp: McpServersState = { servers: [], activeServerId: null };
    if (body.legacyMcp?.length) {
      mcp = await saveLegacyMcpServers(clientId, body.legacyMcp);
    }

    return Response.json({ clientId, chat: state, mcp });
  } catch (error) {
    return mapStorageError(error);
  }
}

export async function DELETE() {
  await clearClientIdCookie();
  return Response.json({ ok: true });
}
