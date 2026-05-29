import type { ChatRoom, Message, MessageImage } from "@/types/chat";
import type { Json } from "@/types/database";

const WELCOME_CONTENT =
  "안녕하세요! AI 채팅에 오신 것을 환영합니다. 무엇이든 물어보세요.";

export type ChatState = {
  rooms: ChatRoom[];
  activeRoomId: string;
};

export function toIsoString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export function normalizeChatState(state: ChatState): ChatState {
  return {
    activeRoomId: state.activeRoomId,
    rooms: state.rooms.map((room) => ({
      ...room,
      createdAt:
        room.createdAt instanceof Date
          ? room.createdAt
          : new Date(room.createdAt),
      messages: room.messages.map((message) => ({
        ...message,
        createdAt:
          message.createdAt instanceof Date
            ? message.createdAt
            : new Date(message.createdAt),
      })),
    })),
  };
}

export function makeWelcomeMessage(): Message {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: WELCOME_CONTENT,
    createdAt: new Date(),
  };
}

export function makeDefaultRoom(name = "채팅 1"): ChatRoom {
  return {
    id: crypto.randomUUID(),
    name,
    messages: [makeWelcomeMessage()],
    createdAt: new Date(),
  };
}

export function makeDefaultChatState(): ChatState {
  const room = makeDefaultRoom();
  return { rooms: [room], activeRoomId: room.id };
}

function parseImages(value: Json | null): MessageImage[] | undefined {
  if (!value || !Array.isArray(value)) return undefined;
  const images = value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.data !== "string" || typeof record.mimeType !== "string") {
      return [];
    }
    return [{ data: record.data, mimeType: record.mimeType }];
  });
  return images.length > 0 ? images : undefined;
}

export function serializeImages(images?: MessageImage[]): Json | null {
  if (!images?.length) return null;
  return images.map((image) => ({
    data: image.data,
    mimeType: image.mimeType,
  }));
}

export type LegacyChatPayload = {
  rooms: Array<{
    id: string;
    name: string;
    createdAt: string;
    messages: Array<{
      id: string;
      role: Message["role"];
      content: string;
      createdAt: string;
      images?: MessageImage[];
    }>;
  }>;
  activeRoomId: string;
};

export function mapLegacyChatPayload(payload: LegacyChatPayload): ChatState {
  return {
    activeRoomId: payload.activeRoomId,
    rooms: payload.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      createdAt: new Date(room.createdAt),
      messages: room.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        images: message.images,
        createdAt: new Date(message.createdAt),
      })),
    })),
  };
}

export { parseImages };
