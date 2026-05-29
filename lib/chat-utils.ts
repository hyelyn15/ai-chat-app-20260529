import type { Message } from "@/types/chat";

export const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "안녕하세요! AI 채팅에 오신 것을 환영합니다. 무엇이든 물어보세요.",
    createdAt: new Date(),
  },
];

export function createMessage(
  role: Message["role"],
  content: string,
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date(),
  };
}
