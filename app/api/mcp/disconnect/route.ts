import { disconnectSession } from "@/lib/mcp/server/client-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { sessionId?: string };
  try {
    body = (await request.json()) as { sessionId?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  await disconnectSession(body.sessionId);
  return Response.json({ ok: true });
}
