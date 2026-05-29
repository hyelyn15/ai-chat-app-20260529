import { mapErrorToChatError } from "@/lib/llm/errors";
import { streamGeminiChat, type ChatTurn } from "@/lib/llm/gemini";
import { prepareMcpTools } from "@/lib/mcp/server/chat-tools";
import type { MessageRole } from "@/types/chat";
import type { McpConnectConfig } from "@/types/mcp";

export const runtime = "nodejs";

type StreamRequestBody = {
  messages?: Array<{ role: MessageRole; content: string }>;
  mcpServers?: McpConnectConfig[];
};

function encodeSse(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(request: Request) {
  let body: StreamRequestBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages?.filter((message) => message.content.trim());

  if (!messages?.length) {
    return Response.json({ error: "Messages are required" }, { status: 400 });
  }

  const mcpServers = body.mcpServers ?? [];

  const stream = new ReadableStream({
    async start(controller) {
      let emittedContent = false;
      try {
        const tools =
          mcpServers.length > 0 ? await prepareMcpTools(mcpServers) : undefined;

        for await (const text of streamGeminiChat(messages as ChatTurn[], {
          signal: request.signal,
          functionDeclarations: tools?.functionDeclarations,
          executeTool: tools?.execute,
          onToolEvent: ({ name, phase }) => {
            controller.enqueue(encodeSse({ tool: { name, phase } }));
          },
          onImage: (image) => {
            emittedContent = true;
            controller.enqueue(encodeSse({ image }));
          },
        })) {
          emittedContent = true;
          controller.enqueue(encodeSse({ text }));
        }

        if (request.signal.aborted) return;
        if (!emittedContent) {
          controller.enqueue(
            encodeSse({
              error: "AI가 빈 응답을 반환했습니다. 다시 시도해 주세요.",
              code: "UNKNOWN",
            }),
          );
          return;
        }

        controller.enqueue(encodeSse({ done: true }));
      } catch (error) {
        if (request.signal.aborted) return;
        const chatError = mapErrorToChatError(error);
        controller.enqueue(
          encodeSse({ error: chatError.message, code: chatError.code }),
        );
      } finally {
        try {
          controller.close();
        } catch {
          // 클라이언트가 먼저 연결을 닫은 경우
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
