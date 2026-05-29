"use client";

import { Send } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatInputProps = {
  onSend: (content: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex shrink-0 gap-2 border-t p-4">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요... (/ 로 프롬프트)"
        disabled={disabled}
        rows={1}
        className="min-h-10 max-h-32 resize-none"
        aria-label="메시지 입력"
      />
      <Button
        type="button"
        size="icon"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="메시지 전송"
        className="shrink-0 self-end"
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
}
