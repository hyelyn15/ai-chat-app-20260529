"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatTimeline } from "@/components/chat/chat-timeline";
import { RoomSidebar } from "@/components/chat/room-sidebar";
import { streamChat } from "@/lib/chat-stream-client";
import { createMessage } from "@/lib/chat-utils";
import { serverToConfig } from "@/lib/mcp-client";
import { useChatRooms } from "@/lib/use-chat-rooms";
import { useMcpServers } from "@/lib/use-mcp-servers";

type ChatPageProps = {
  model: string;
};

function removeFirst(list: string[], value: string): string[] {
  const index = list.indexOf(value);
  if (index === -1) return list;
  return [...list.slice(0, index), ...list.slice(index + 1)];
}

export function ChatPage({ model }: ChatPageProps) {
  const {
    rooms,
    activeRoom,
    setActiveRoomMessages,
    createRoom,
    deleteRoom,
    selectRoom,
    clearActiveRoom,
    isLoading: isStorageLoading,
    storageError,
  } = useChatRooms();
  const { servers } = useMcpServers();

  const [isSending, setIsSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const connectedServers = servers.filter((s) => s.status === "connected");

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSelectRoom = useCallback(
    (roomId: string) => {
      abortRef.current?.abort();
      abortRef.current = null;
      setIsSending(false);
      setStreamingMessageId(null);
      setActiveTools([]);
      selectRoom(roomId);
    },
    [selectRoom],
  );

  const handleSend = useCallback(
    async (content: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage = createMessage("user", content);

      // 웰컴 메시지 등 앞쪽의 assistant 메시지를 제외하고, user 메시지부터 히스토리 구성
      // Gemini API는 대화가 반드시 user 턴으로 시작해야 함
      const firstUserIndex = activeRoom.messages.findIndex(
        (m) => m.role === "user",
      );
      const conversationHistory =
        firstUserIndex >= 0 ? activeRoom.messages.slice(firstUserIndex) : [];
      const historyForApi = [...conversationHistory, userMessage];
      const assistantId = crypto.randomUUID();

      setActiveRoomMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: "assistant", content: "", createdAt: new Date() },
      ]);
      setIsSending(true);
      setStreamingMessageId(assistantId);
      setActiveTools([]);

      const mcpServers = connectedServers.map(serverToConfig);

      try {
        await streamChat(
          historyForApi.map((m) => ({ role: m.role, content: m.content })),
          {
            signal: controller.signal,
            mcpServers,
            onChunk: (text) => {
              setActiveRoomMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + text }
                    : m,
                ),
              );
            },
            onImage: (image) => {
              setActiveRoomMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, images: [...(m.images ?? []), image] }
                    : m,
                ),
              );
            },
            onToolEvent: ({ name, phase }) => {
              setActiveTools((prev) =>
                phase === "start"
                  ? [...prev, name]
                  : removeFirst(prev, name),
              );
            },
          },
        );
      } catch (error) {
        if (controller.signal.aborted) return;

        const errorMessage =
          error instanceof Error
            ? error.message
            : "응답 생성 중 오류가 발생했습니다.";

        setActiveRoomMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: errorMessage } : m,
          ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSending(false);
          setStreamingMessageId(null);
          setActiveTools([]);
        }
      }
    },
    [activeRoom.messages, connectedServers, setActiveRoomMessages],
  );

  return (
    <div className="flex h-dvh w-full bg-background">
      <RoomSidebar
        rooms={rooms}
        activeRoomId={activeRoom.id}
        onSelect={handleSelectRoom}
        onCreate={createRoom}
        onDelete={deleteRoom}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatHeader
          model={model}
          roomName={activeRoom.name}
          onClearRoom={clearActiveRoom}
        />
        {storageError ? (
          <p className="shrink-0 border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {storageError}
          </p>
        ) : null}
        {isStorageLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            채팅 데이터를 불러오는 중...
          </div>
        ) : (
          <>
            <ChatTimeline
              messages={activeRoom.messages}
              isLoading={isSending}
              streamingMessageId={streamingMessageId}
              activeTools={activeTools}
            />
            <ChatInput onSend={handleSend} disabled={isSending || isStorageLoading} />
          </>
        )}
      </div>
    </div>
  );
}
