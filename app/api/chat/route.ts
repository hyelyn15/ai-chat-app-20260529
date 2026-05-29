import { CLIENT_ID_HEADER } from "@/lib/client-id";
import { mapErrorToChatError } from "@/lib/llm/errors";
import type { ChatState } from "@/lib/supabase/chat-mapper";
import {
  clientExists,
  ensureChatState,
  saveChatState,
} from "@/lib/supabase/chat-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  }
  const chatError = mapErrorToChatError(error);
  return Response.json({ error: chatError.message }, { status: 500 });
}

export async function GET(request: Request) {
  const clientId = request.headers.get(CLIENT_ID_HEADER);
  if (!clientId) {
    return Response.json({ error: "Client ID가 필요합니다." }, { status: 400 });
  }

  try {
    if (!(await clientExists(clientId))) {
      return Response.json({ error: "Client를 찾을 수 없습니다." }, { status: 404 });
    }

    const state = await ensureChatState(clientId);
    return Response.json(state);
  } catch (error) {
    return mapStorageError(error);
  }
}

export async function PUT(request: Request) {
  const clientId = request.headers.get(CLIENT_ID_HEADER);
  if (!clientId) {
    return Response.json({ error: "Client ID가 필요합니다." }, { status: 400 });
  }

  let body: ChatState;
  try {
    body = (await request.json()) as ChatState;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.rooms?.length || !body.activeRoomId) {
    return Response.json(
      { error: "rooms와 activeRoomId가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    if (!(await clientExists(clientId))) {
      return Response.json({ error: "Client를 찾을 수 없습니다." }, { status: 404 });
    }

    await saveChatState(clientId, body);
    return Response.json({ ok: true });
  } catch (error) {
    return mapStorageError(error);
  }
}
