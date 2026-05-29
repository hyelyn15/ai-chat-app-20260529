"use client";

import { useEffect, useRef } from "react";

import { ChatMessage } from "@/components/chat/chat-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/types/chat";

type ChatTimelineProps = {
  messages: Message[];
  isLoading: boolean;
  streamingMessageId?: string | null;
  activeTools?: string[];
};

function ToolActivity({ tools }: { tools: string[] }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="MCP 도구 실행 중">
      {tools.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          도구 실행 중: {name}
        </span>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3" aria-label="AI가 응답 중">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <span className="sr-only">응답 생성 중</span>
      </div>
      <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function ChatTimeline({
  messages,
  isLoading,
  streamingMessageId,
  activeTools = [],
}: ChatTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, activeTools]);

  const showTypingIndicator =
    isLoading &&
    !messages.some((message) => message.id === streamingMessageId);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-4 px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            대화를 시작해 보세요.
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={message.id === streamingMessageId && isLoading}
            />
          ))
        )}
        {activeTools.length > 0 ? <ToolActivity tools={activeTools} /> : null}
        {showTypingIndicator ? <TypingIndicator /> : null}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
