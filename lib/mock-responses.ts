import type { Message } from "@/types/chat";

export const MOCK_DELAY_MS = 600;

export const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "안녕하세요! AI 채팅에 오신 것을 환영합니다. 무엇이든 물어보세요. (현재는 목업 응답 모드입니다)",
    createdAt: new Date(),
  },
];

const GENERAL_RESPONSES = [
  "좋은 질문이네요. 현재는 LLM API가 연결되지 않아 목업 응답을 드리고 있습니다.",
  "요청을 이해했습니다. 실제 AI 연동 후 더 정확한 답변을 제공할 수 있습니다.",
  "흥미로운 주제입니다. 추가로 궁금한 점이 있으시면 편하게 물어보세요.",
  "목업 모드에서는 미리 준비된 응답을 순환하여 보여드립니다.",
];

let responseIndex = 0;

export function getMockResponse(input: string): string {
  const trimmed = input.trim();

  if (trimmed.startsWith("/")) {
    return `프롬프트 명령 "${trimmed}"을(를) 받았습니다. 프롬프트 기능은 추후 지원 예정입니다.`;
  }

  if (/안녕|hello|hi/i.test(trimmed)) {
    return "안녕하세요! 오늘 무엇을 도와드릴까요?";
  }

  if (/감사|고마|thanks/i.test(trimmed)) {
    return "천만에요! 다른 도움이 필요하시면 언제든 말씀해 주세요.";
  }

  const response = GENERAL_RESPONSES[responseIndex % GENERAL_RESPONSES.length];
  responseIndex += 1;
  return response;
}

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
