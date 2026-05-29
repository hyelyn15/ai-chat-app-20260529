import { mapMcpError } from "@/lib/mcp/server/errors";
import { runCapability } from "@/lib/mcp/server/operations";
import type { McpCapabilityKind } from "@/types/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CallBody = {
  sessionId?: string;
  kind?: McpCapabilityKind;
  name?: string;
  arguments?: Record<string, unknown>;
};

export async function POST(request: Request) {
  let body: CallBody;
  try {
    body = (await request.json()) as CallBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.sessionId || !body.kind || !body.name) {
    return Response.json(
      { error: "sessionId, kind, name이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const result = await runCapability({
      sessionId: body.sessionId,
      kind: body.kind,
      name: body.name,
      arguments: body.arguments,
    });
    return Response.json({ result });
  } catch (error) {
    return Response.json(mapMcpError(error), { status: 502 });
  }
}
