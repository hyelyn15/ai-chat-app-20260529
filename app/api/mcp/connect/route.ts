import { connectSession, disconnectSession } from "@/lib/mcp/server/client-manager";
import { mapMcpError } from "@/lib/mcp/server/errors";
import { listCapabilities } from "@/lib/mcp/server/operations";
import { getClient } from "@/lib/mcp/server/client-manager";
import type { McpConnectConfig } from "@/types/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let config: McpConnectConfig;
  try {
    config = (await request.json()) as McpConnectConfig;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let sessionId: string | undefined;
  try {
    sessionId = await connectSession(config);
    const capabilities = await listCapabilities(getClient(sessionId));
    return Response.json({ sessionId, capabilities });
  } catch (error) {
    // 연결은 됐지만 introspection 실패 시 세션 정리
    if (sessionId) await disconnectSession(sessionId);
    return Response.json(mapMcpError(error), { status: 502 });
  }
}
