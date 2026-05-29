import type { MessageImage } from "@/types/chat";

export type ParsedToolResult = {
  text: string;
  images: MessageImage[];
};

type ContentPart = {
  type?: string;
  text?: string;
  data?: string;
  mimeType?: string;
};

type ToolResult = {
  content?: ContentPart[];
  structuredContent?: unknown;
  isError?: boolean;
};

export function parseMcpToolResult(result: unknown): ParsedToolResult {
  const typed = result as ToolResult;
  const images: MessageImage[] = [];
  const textParts: string[] = [];

  for (const part of typed.content ?? []) {
    if (part.type === "text" && part.text) {
      textParts.push(part.text);
      continue;
    }
    if (part.type === "image" && part.data && part.mimeType) {
      images.push({ data: part.data, mimeType: part.mimeType });
    }
  }

  if (textParts.length > 0 || images.length > 0) {
    return { text: textParts.join("\n"), images };
  }

  if (typed.structuredContent !== undefined) {
    return { text: JSON.stringify(typed.structuredContent), images: [] };
  }

  return { text: JSON.stringify(result), images: [] };
}

export function extractImagesFromJson(raw: string): MessageImage[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseMcpToolResult(parsed).images;
  } catch {
    return [];
  }
}
