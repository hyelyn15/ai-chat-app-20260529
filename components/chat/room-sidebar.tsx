import { MessageSquare, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatRoom } from "@/types/chat";

type RoomSidebarProps = {
  rooms: ChatRoom[];
  activeRoomId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

// 인덱스 0은 항상 웰컴 메시지이므로 제외하고, 마지막 실제 메시지를 요약 반환
function getRoomPreview(room: ChatRoom): string {
  const messages = room.messages.slice(1).filter((m) => m.content.trim());
  const last = messages[messages.length - 1];
  if (!last) return "";
  const prefix = last.role === "user" ? "나: " : "";
  return prefix + last.content.replace(/\s+/g, " ").trim();
}

export function RoomSidebar({
  rooms,
  activeRoomId,
  onSelect,
  onCreate,
  onDelete,
}: RoomSidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/20">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <span className="text-sm font-semibold">채팅방</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCreate}
          aria-label="새 채팅방 만들기"
          title="새 채팅방 만들기"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-1" aria-label="채팅방 목록">
        {rooms.map((room) => {
          const preview = getRoomPreview(room);
          return (
            <div
              key={room.id}
              role="button"
              tabIndex={0}
              aria-pressed={room.id === activeRoomId}
              className={cn(
                "group mx-1 flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted",
                room.id === activeRoomId && "bg-muted",
              )}
              onClick={() => onSelect(room.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(room.id)}
            >
              <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "flex-1 truncate text-sm",
                      room.id === activeRoomId && "font-medium",
                    )}
                  >
                    {room.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(room.id);
                    }}
                    aria-label={`${room.name} 삭제`}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                {preview && (
                  <span className="truncate text-xs text-muted-foreground">
                    {preview}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
