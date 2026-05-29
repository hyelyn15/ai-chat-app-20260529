# AI Chat — Agent Governance

## Operational Commands

```bash
pnpm install        # 의존성 설치
pnpm dev            # 개발 서버 (http://localhost:3000)
pnpm build          # 프로덕션 빌드
pnpm lint           # ESLint
pnpm typecheck      # TypeScript 타입 체크
```

- 패키지 매니저: `pnpm` 고정. npm/yarn 사용 금지.
- 환경 변수: `.env.local` (GEMINI_API_KEY, LLM_MODEL). `.env.local`은 커밋 금지.
- Node: LTS

## Project Context

Next.js App Router 기반 AI 채팅 클라이언트. Gemini API를 서버 사이드에서 호출하고 SSE로 스트리밍 응답을 제공한다.

Tech Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (@base-ui/react), Lucide, @google/genai

## Golden Rules

**Immutable (절대 금지)**
- 클라이언트 컴포넌트에서 Gemini/MCP 등 외부 API 직접 호출 금지. 반드시 서버 Route Handler 경유.
- API 키, 시크릿을 코드에 하드코딩 금지.
- `GEMINI_API_KEY`를 클라이언트 번들에 노출 금지 (`NEXT_PUBLIC_` 접두사 절대 불가).

**Do**
- 서버 로직은 `app/api/` Route Handler로만 구현한다.
- 스트리밍은 SSE(`text/event-stream`)로 제공하고, 클라이언트는 AbortController로 취소를 지원한다.
- 에러는 `lib/llm/errors.ts`의 `mapErrorToChatError`로 통일 변환한다. 새 에러 타입 추가 시 이 파일을 확장한다.
- 모든 파일은 500 LOC 미만으로 유지한다. 초과 시 단일 책임 원칙에 따라 분리한다.
- shadcn/ui 컴포넌트를 우선 사용한다. 없는 경우에만 직접 구현한다.

**Don't**
- `useState`/`useEffect` 외 전역 상태 관리 라이브러리를 무단 도입하지 않는다.
- 서버 DB, ORM을 MVP 단계에서 도입하지 않는다. 필요 시 Drizzle 도입 제안만 한다.
- 주석으로 코드 동작을 설명하지 않는다. 비즈니스 의도/제약만 주석으로 남긴다.

## Standards

- 커밋 메시지: `feat:`, `fix:`, `refactor:`, `chore:` 등 Conventional Commits 형식.
- 컴포넌트 파일명: kebab-case (`chat-message.tsx`).
- 타입 파일: `types/` 디렉토리에 도메인별로 분리.
- `lib/utils.ts`: shadcn/ui의 `cn()` 유틸만 위치. 기타 유틸은 기능별 파일로 분리.

**Maintenance Policy:** 규칙과 실제 코드 패턴 간 괴리가 발생하면 이 파일 업데이트를 제안한다.

## Context Map

- **[API Route / 스트리밍 SSE](./app/api/AGENTS.md)** — `/api/chat/stream` Route Handler 및 서버 LLM 로직 수정 시.
- **[채팅 UI 컴포넌트](./components/chat/AGENTS.md)** — `components/chat/` 내 컴포넌트 추가·수정 시.
