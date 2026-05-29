import type { ChatErrorCode } from "@/lib/llm/errors";
import type { MessageImage, MessageRole } from "@/types/chat";
import type { McpConnectConfig } from "@/types/mcp";

export type StreamChatMessage = {
  role: MessageRole;
  content: string;
};

export type ToolEvent = { name: string; phase: "start" | "end" };

type StreamChatOptions = {
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  onImage?: (image: MessageImage) => void;
  onToolEvent?: (event: ToolEvent) => void;
  mcpServers?: McpConnectConfig[];
};

type StreamEvent =
  | { text: string }
  | { done: true }
  | { image: MessageImage }
  | { tool: ToolEvent }
  | { error: string; code?: ChatErrorCode };

export async function streamChat(
  messages: StreamChatMessage[],
  { signal, onChunk, onImage, onToolEvent, mcpServers }: StreamChatOptions,
): Promise<void> {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, mcpServers }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`요청에 실패했습니다. (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("스트림 응답을 읽을 수 없습니다.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const payload = JSON.parse(line.slice(6)) as StreamEvent;

      if ("error" in payload && payload.error) {
        throw new Error(payload.error);
      }
      if ("tool" in payload && payload.tool) {
        onToolEvent?.(payload.tool);
      }
      if ("image" in payload && payload.image) {
        onImage?.(payload.image);
      }
      if ("text" in payload && payload.text) {
        onChunk(payload.text);
      }
    }
  }
}
