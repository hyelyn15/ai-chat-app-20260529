import "server-only";

import { getClientIdFromCookies } from "@/lib/client-cookie";
import { clientExists } from "@/lib/supabase/chat-repository";

export async function requireClientId(): Promise<string | Response> {
  const clientId = await getClientIdFromCookies();
  if (!clientId) {
    return Response.json(
      { error: "Client session이 필요합니다. 페이지를 새로고침해 주세요." },
      { status: 401 },
    );
  }

  if (!(await clientExists(clientId))) {
    return Response.json({ error: "Client를 찾을 수 없습니다." }, { status: 404 });
  }

  return clientId;
}
