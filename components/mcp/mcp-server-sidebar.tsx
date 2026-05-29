"use client";

import { Download, Pencil, Plus, Server, Trash2, Upload } from "lucide-react";
import { useRef } from "react";

import { McpStatusBadge } from "@/components/mcp/mcp-status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { McpServer } from "@/types/mcp";

type McpServerSidebarProps = {
  servers: McpServer[];
  activeServerId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
};

export function McpServerSidebar({
  servers,
  activeServerId,
  onSelect,
  onEdit,
  onDelete,
  onAddClick,
  onExport,
  onImportFile,
}: McpServerSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/20">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <span className="text-sm font-semibold">MCP 서버</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onAddClick}
          aria-label="새 서버 추가"
          title="새 서버 추가"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex gap-1.5 border-b px-3 py-2">
        <Button
          variant="outline"
          size="xs"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-3" />
          불러오기
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="flex-1"
          onClick={onExport}
          disabled={servers.length === 0}
        >
          <Download className="size-3" />
          내보내기
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <nav className="flex-1 overflow-y-auto py-1" aria-label="서버 목록">
        {servers.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            등록된 서버가 없습니다.
            <br />
            상단 + 버튼으로 추가하세요.
          </p>
        ) : (
          servers.map((server) => (
            <div
              key={server.id}
              role="button"
              tabIndex={0}
              aria-pressed={server.id === activeServerId}
              className={cn(
                "group mx-1 flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted",
                server.id === activeServerId && "bg-muted",
              )}
              onClick={() => onSelect(server.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(server.id)}
            >
              <Server className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "flex-1 truncate text-sm",
                      server.id === activeServerId && "font-medium",
                    )}
                  >
                    {server.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(server.id);
                    }}
                    aria-label={`${server.name} 수정`}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(server.id);
                    }}
                    aria-label={`${server.name} 삭제`}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5">
                  <McpStatusBadge status={server.status} />
                  <span className="truncate text-xs text-muted-foreground">
                    {server.transport}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
