# app/api — Route Handler Rules

## Module Context

Gemini API를 호출하고 결과를 SSE로 스트리밍하는 서버 전용 레이어.
클라이언트는 절대 이 레이어를 우회하지 않는다.

## SSE 응답 포맷

모든 스트리밍 Route Handler는 아래 포맷을 준수한다.

```ts
// 청크 전송
data: {"text": "...\n\n"}

// 완료
data: {"done": true}\n\n

// 에러
data: {"error": "사용자 친화적 메시지", "code": "RATE_LIMIT"}\n\n
```

Response headers:
```
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
```

## LLM 어댑터 패턴

- LLM 호출은 `lib/llm/` 하위에 어댑터로 분리한다. Route Handler에 SDK 코드 직접 작성 금지.
- Gemini 어댑터: `lib/llm/gemini.ts` — `streamGeminiChat(messages, signal)` 제너레이터 함수.
- 새 LLM(Claude 등) 추가 시 동일한 시그니처의 어댑터 파일을 `lib/llm/` 에 추가한다.

## 에러 처리

- 모든 에러는 `lib/llm/errors.ts`의 `mapErrorToChatError(error)` 로 변환 후 SSE error 이벤트로 전송한다.
- Route Handler는 절대 raw 에러를 클라이언트에 노출하지 않는다.
- `ChatErrorCode`: `MISSING_API_KEY` | `UNAUTHORIZED` | `FORBIDDEN` | `RATE_LIMIT` | `SERVER_ERROR` | `UNKNOWN`

## Do / Don't

- Do: `request.signal`을 LLM 어댑터까지 전달하여 클라이언트 AbortController 취소를 지원한다.
- Do: Request body의 `messages` 배열을 빈 content 기준으로 필터링한 뒤 LLM에 전달한다.
- Don't: Route Handler 내부에서 `GoogleGenAI` 등 SDK를 직접 import하지 않는다. 반드시 어댑터 경유.
- Don't: HTTP 상태 코드 200 외에 스트리밍 응답을 시작하지 않는다. 에러도 200으로 시작 후 SSE error 이벤트로 전달한다.
