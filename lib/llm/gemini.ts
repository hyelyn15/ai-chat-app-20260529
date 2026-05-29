import {
  GoogleGenAI,
  createFunctionResponsePartFromBase64,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
} from "@google/genai";

import { getGeminiApiKey, getLlmModel } from "@/lib/env";
import type { ParsedToolResult } from "@/lib/mcp/tool-result";
import type { MessageImage, MessageRole } from "@/types/chat";

export type ChatTurn = {
  role: MessageRole;
  content: string;
};

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<ParsedToolResult>;

export type StreamGeminiOptions = {
  signal?: AbortSignal;
  functionDeclarations?: FunctionDeclaration[];
  executeTool?: ToolExecutor;
  onToolEvent?: (event: { name: string; phase: "start" | "end" }) => void;
  onImage?: (image: MessageImage) => void;
};

const MAX_TOOL_TURNS = 6;

export async function* streamGeminiChat(
  messages: ChatTurn[],
  options: StreamGeminiOptions = {},
): AsyncGenerator<string> {
  const { signal, functionDeclarations, executeTool, onToolEvent, onImage } =
    options;
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const contents = normalizeContents(messages);
  const tools =
    functionDeclarations && functionDeclarations.length > 0
      ? [{ functionDeclarations }]
      : undefined;

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn += 1) {
    const calls = yield* runModelStream(ai, contents, tools, signal);

    if (signal?.aborted) return;
    if (calls.length === 0 || !executeTool) return;

    contents.push({
      role: "model",
      parts: calls.map((call) => ({ functionCall: call })),
    });

    const responseParts: Content["parts"] = [];
    for (const call of calls) {
      const name = call.name ?? "";
      onToolEvent?.({ name, phase: "start" });

      let response: Record<string, unknown>;
      try {
        const output = await executeTool(
          name,
          (call.args as Record<string, unknown>) ?? {},
        );
        for (const image of output.images) {
          onImage?.(image);
        }
        responseParts.push(buildFunctionResponse(name, output));
      } catch (error) {
        response = {
          error: error instanceof Error ? error.message : String(error),
        };
        responseParts.push({ functionResponse: { name, response } });
      } finally {
        onToolEvent?.({ name, phase: "end" });
      }
    }

    contents.push({ role: "user", parts: responseParts });
  }
}

function buildFunctionResponse(name: string, result: ParsedToolResult) {
  const parts = result.images.map((image) =>
    createFunctionResponsePartFromBase64(image.data, image.mimeType),
  );

  return {
    functionResponse: {
      name,
      response: result.text ? { output: result.text } : {},
      ...(parts.length > 0 ? { parts } : {}),
    },
  };
}

// 한 번의 스트리밍 요청을 수행하며 텍스트를 yield하고, 누적된 functionCall 목록을 반환
async function* runModelStream(
  ai: GoogleGenAI,
  contents: Content[],
  tools: Array<{ functionDeclarations: FunctionDeclaration[] }> | undefined,
  signal?: AbortSignal,
): AsyncGenerator<string, FunctionCall[]> {
  const models = getCandidateModels();
  let lastError: unknown;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];

    for (let attempt = 0; attempt < 3; attempt += 1) {
      let yielded = false;
      const calls: FunctionCall[] = [];

      try {
        const response = await ai.models.generateContentStream({
          model,
          contents,
          config: { abortSignal: signal, tools },
        });

        for await (const chunk of response) {
          if (signal?.aborted) break;
          const text = chunk.text;
          if (text) {
            yielded = true;
            yield text;
          }
          if (chunk.functionCalls) {
            calls.push(...chunk.functionCalls);
          }
        }
        return calls;
      } catch (error) {
        lastError = error;
        const canTryFallbackModel =
          !signal?.aborted &&
          !yielded &&
          getErrorStatus(error) === 429 &&
          modelIndex < models.length - 1;
        if (canTryFallbackModel) break;

        const retryDelay = getRetryDelayMs(error, attempt);
        if (signal?.aborted || yielded || attempt === 2 || retryDelay === null) {
          throw error;
        }
        await delay(retryDelay);
      }
    }
  }

  throw lastError;
}

function getCandidateModels(): string[] {
  const primary = getLlmModel();
  const fallbacks =
    primary.includes("lite")
      ? ["gemini-2.5-flash", "gemini-flash-latest"]
      : ["gemini-flash-latest"];
  return Array.from(new Set([primary, ...fallbacks]));
}

function normalizeContents(messages: ChatTurn[]): Content[] {
  const contents: Content[] = [];

  for (const message of messages) {
    const text = message.content.trim();
    if (!text) continue;

    const role = message.role === "assistant" ? "model" : "user";
    if (contents.length === 0 && role === "model") continue;
    if (role === "model" && isUiErrorMessage(text)) continue;

    const last = contents[contents.length - 1];
    const lastText = last?.parts?.[0]?.text;
    if (last?.role === role && typeof lastText === "string") {
      last.parts![0].text = `${lastText}\n\n${text}`;
      continue;
    }

    contents.push({ role, parts: [{ text }] });
  }

  return contents;
}

function isUiErrorMessage(text: string): boolean {
  return (
    text.includes("AI 서버에 일시적인 오류") ||
    text.includes("요청 한도를 초과했습니다") ||
    text.includes("응답 생성 중 오류") ||
    text.includes("API 키가 유효하지 않습니다") ||
    text.includes("MCP 도구 스키마")
  );
}

function getRetryDelayMs(error: unknown, attempt: number): number | null {
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message : String(error);

  if (status === 429 && !message.includes("limit: 0")) {
    const retrySeconds = message.match(/retry in ([\d.]+)s/i)?.[1];
    const parsedDelay = retrySeconds ? Number(retrySeconds) * 1000 : 1500;
    return Math.min(Math.max(parsedDelay, 1000), 30_000);
  }

  if (status && [500, 502, 503, 504].includes(status)) {
    return 500 * (attempt + 1);
  }

  const retryableMessage =
    message.includes("INTERNAL") ||
    message.includes("UNAVAILABLE") ||
    message.includes("overloaded") ||
    message.includes("temporarily unavailable");

  return retryableMessage ? 500 * (attempt + 1) : null;
}

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = message.match(/"code":\s*(\d{3})/);
  if (statusMatch) return Number(statusMatch[1]);

  return undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
