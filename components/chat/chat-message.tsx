"use client";

import { Bot, User } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat";

type ChatMessageProps = {
  message: Message;
  isStreaming?: boolean;
};

function MessageImages({ images }: { images: NonNullable<Message["images"]> }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {images.map((image, index) => (
        // eslint-disable-next-line @next/next/no-img-element -- MCP base64 인라인 이미지
        <img
          key={`${image.mimeType}-${index}`}
          src={`data:${image.mimeType};base64,${image.data}`}
          alt={`MCP tool image ${index + 1}`}
          className="max-h-80 max-w-full rounded-lg border object-contain"
        />
      ))}
    </div>
  );
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const hasImages = (message.images?.length ?? 0) > 0;
  const showPlaceholder =
    !isUser && !message.content && !hasImages && isStreaming;

  return (
    <div
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
      role="article"
      aria-label={isUser ? "사용자 메시지" : "AI 메시지"}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {showPlaceholder ? (
          <div className="flex items-center gap-1 py-0.5">
            <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
            <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
            <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
          </div>
        ) : (
          <>
            {message.content ? (
              <p className="whitespace-pre-wrap break-words">
                {message.content}
                {isStreaming && message.content ? (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground/70" />
                ) : null}
              </p>
            ) : null}
            {hasImages ? <MessageImages images={message.images!} /> : null}
          </>
        )}
      </div>
    </div>
  );
}
