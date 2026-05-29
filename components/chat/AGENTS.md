# components/chat — Chat UI Rules

## Module Context

채팅 UI의 모든 컴포넌트. `chat-page.tsx`가 유일한 상태 소유자이며, 나머지는 순수 표현 컴포넌트다.

## 컴포넌트 책임 분리

| 컴포넌트 | 역할 | 상태 소유 |
|---|---|---|
| `chat-page.tsx` | messages, isLoading, streaming 상태 관리 + API 호출 | Yes (`"use client"`) |
| `chat-timeline.tsx` | 메시지 목록 렌더링 + auto-scroll | No |
| `chat-message.tsx` | 단일 메시지 버블 (user/assistant) + 스트리밍 커서 | No |
| `chat-input.tsx` | 텍스트 입력 + 전송 이벤트 emit | No (`onSend` 콜백만) |
| `chat-header.tsx` | 앱 타이틀 + 모델명 표시 | No |

## 스트리밍 UI 패턴

스트리밍 중에는 assistant 메시지 객체가 먼저 `messages` 배열에 빈 content로 추가되고, `onChunk` 콜백으로 content가 점진적으로 누적된다.

```ts
// chat-page.tsx 핵심 흐름
const assistantId = crypto.randomUUID();
setMessages(prev => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
// onChunk: (text) => setMessages(prev => prev.map(m => m.id === assistantId ? {...m, content: m.content + text} : m))
```

- `streamingMessageId`: 현재 스트리밍 중인 메시지 ID. `chat-message`에 `isStreaming` prop으로 전달.
- `isStreaming && content.length > 0` 일 때 커서(`▍`) 표시.
- `isStreaming && content.length === 0` 일 때 typing indicator(dots) 표시.

## API 호출

- `lib/chat-stream-client.ts`의 `streamChat()` 함수만 사용한다.
- `AbortController`를 `abortRef`에 저장하고, 새 메시지 전송 시 기존 요청을 먼저 abort한다.
- `controller.signal.aborted` 확인 후에만 상태 업데이트. abort된 요청의 에러는 무시한다.

## Do / Don't

- Do: 새 채팅 컴포넌트 추가 시 `chat-page.tsx`에서 상태를 받아 props로 전달하는 패턴을 유지한다.
- Do: shadcn/ui `ScrollArea`, `Textarea`, `Button`을 사용한다.
- Don't: `chat-timeline.tsx`, `chat-message.tsx` 등 표현 컴포넌트에 `useState`로 서버 상태를 직접 관리하지 않는다.
- Don't: `fetch`를 컴포넌트에서 직접 호출하지 않는다. 반드시 `chat-page.tsx` → `streamChat()` 경유.
