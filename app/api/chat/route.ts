import { requireClientId } from "@/lib/auth/require-client-id";
import { mapErrorToChatError } from "@/lib/llm/errors";
import type { ChatState } from "@/lib/supabase/chat-mapper";
import {
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
  const chatError = mapErrorToChatError(error);
  return Response.json({ error: chatError.message }, { status: 500 });
}

export async function GET() {
  const clientId = await requireClientId();
  if (clientId instanceof Response) return clientId;

  try {
    const state = await ensureChatState(clientId);
    return Response.json(state);
  } catch (error) {
    return mapStorageError(error);
  }
}

export async function PUT(request: Request) {
  const clientId = await requireClientId();
  if (clientId instanceof Response) return clientId;

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
    await saveChatState(clientId, body);
    return Response.json({ ok: true });
  } catch (error) {
    return mapStorageError(error);
  }
}
