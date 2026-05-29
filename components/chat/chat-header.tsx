"use client";

import { LogOut, RotateCcw, Server } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type ChatHeaderProps = {
  model: string;
  roomName: string;
  onClearRoom: () => void;
};

export function ChatHeader({ model, roomName, onClearRoom }: ChatHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
      <div>
        <h1 className="text-base font-semibold leading-tight">{roomName}</h1>
        <p className="text-xs text-muted-foreground">{model}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearRoom}
          aria-label="대화 내역 초기화"
          title="대화 내역 초기화"
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          aria-label="MCP Inspector 열기"
          render={<Link href="/inspector" />}
        >
          <Server className="size-4" />
          MCP Inspector
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void handleLogout()}
          aria-label="로그아웃"
          title="로그아웃"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
