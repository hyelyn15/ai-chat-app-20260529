"use client";

import { ArrowLeft, MessageSquare, Plug, PlugZap, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { McpCapabilitiesPanel } from "@/components/mcp/mcp-capabilities";
import { McpServerForm } from "@/components/mcp/mcp-server-form";
import { McpServerSidebar } from "@/components/mcp/mcp-server-sidebar";
import { McpStatusBadge } from "@/components/mcp/mcp-status-badge";
import { Button } from "@/components/ui/button";
import { connectServer, disconnectServer } from "@/lib/mcp-client";
import { downloadJson, parseServersFile, serializeServers } from "@/lib/mcp-io";
import { useMcpServers } from "@/lib/use-mcp-servers";
import type { McpCapabilities } from "@/types/mcp";

type Connection = {
  sessionId: string;
  capabilities: McpCapabilities;
};

type FormMode = { kind: "create" } | { kind: "edit"; serverId: string };

export function McpInspector() {
  const {
    servers,
    activeServer,
    activeServerId,
    addServer,
    importServers,
    updateServer,
    setStatus,
    deleteServer,
    selectServer,
  } = useMcpServers();

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connections, setConnections] = useState<Record<string, Connection>>(
    {},
  );
  const restoringRef = useRef(new Set<string>());

  const handleConnect = useCallback(
    async (serverId: string) => {
      const server = servers.find((s) => s.id === serverId);
      if (!server) return;

      setConnectError(null);
      setStatus(serverId, "connecting");
      try {
        const { sessionId, capabilities } = await connectServer(server);
        setConnections((prev) => ({
          ...prev,
          [serverId]: { sessionId, capabilities },
        }));
        setStatus(serverId, "connected");
      } catch (error) {
        setStatus(serverId, "error");
        setConnectError(
          error instanceof Error ? error.message : "연결에 실패했습니다.",
        );
      }
    },
    [servers, setStatus],
  );

  const handleDisconnect = useCallback(
    async (serverId: string) => {
      const connection = connections[serverId];
      if (connection) {
        await disconnectServer(connection.sessionId);
      }
      setConnections((prev) => {
        const next = { ...prev };
        delete next[serverId];
        return next;
      });
      setStatus(serverId, "disconnected");
    },
    [connections, setStatus],
  );

  useEffect(() => {
    for (const server of servers) {
      if (
        server.status !== "connected" ||
        connections[server.id] ||
        restoringRef.current.has(server.id)
      ) {
        continue;
      }

      restoringRef.current.add(server.id);
      void handleConnect(server.id).finally(() => {
        restoringRef.current.delete(server.id);
      });
    }
  }, [connections, handleConnect, servers]);

  const handleDeleteServer = useCallback(
    (serverId: string) => {
      const connection = connections[serverId];
      if (connection) void disconnectServer(connection.sessionId);
      setConnections((prev) => {
        const next = { ...prev };
        delete next[serverId];
        return next;
      });
      deleteServer(serverId);
    },
    [connections, deleteServer],
  );

  const handleEditServer = useCallback(
    (serverId: string) => {
      selectServer(serverId);
      setFormMode({ kind: "edit", serverId });
      setConnectError(null);
    },
    [selectServer],
  );

  const handleUpdateServer = useCallback(
    async (serverId: string, draft: Parameters<typeof updateServer>[1]) => {
      const connection = connections[serverId];
      if (connection) await disconnectServer(connection.sessionId);

      setConnections((prev) => {
        const next = { ...prev };
        delete next[serverId];
        return next;
      });
      updateServer(serverId, { ...draft, status: "disconnected" });
      setConnectError(null);
      setFormMode(null);
    },
    [connections, updateServer],
  );

  const handleExport = useCallback(() => {
    downloadJson("mcp-servers.json", serializeServers(servers));
  }, [servers]);

  const handleImportFile = useCallback(
    async (file: File) => {
      setImportError(null);
      try {
        const text = await file.text();
        importServers(parseServersFile(text));
      } catch (error) {
        setImportError(
          error instanceof Error ? error.message : "불러오기에 실패했습니다.",
        );
      }
    },
    [importServers],
  );

  const activeConnection = activeServer
    ? connections[activeServer.id]
    : undefined;
  const isConnected =
    activeServer?.status === "connected" && Boolean(activeConnection);
  const editingServer =
    formMode?.kind === "edit"
      ? (servers.find((server) => server.id === formMode.serverId) ?? null)
      : null;

  return (
    <div className="flex h-dvh w-full bg-background">
      <McpServerSidebar
        servers={servers}
        activeServerId={activeServerId}
        onSelect={selectServer}
        onEdit={handleEditServer}
        onDelete={handleDeleteServer}
        onAddClick={() => setFormMode({ kind: "create" })}
        onExport={handleExport}
        onImportFile={handleImportFile}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              render={<Link href="/" />}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                MCP Inspector
              </h1>
              <p className="text-xs text-muted-foreground">
                서버 연결 · 도구/프롬프트/리소스 테스트
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeServer && !formMode && (
              <>
                <McpStatusBadge status={activeServer.status} />
                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(activeServer.id)}
                  >
                    <Plug className="size-4" />
                    연결 끊기
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(activeServer.id)}
                    disabled={activeServer.status === "connecting"}
                  >
                    {activeServer.status === "connecting" ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <PlugZap className="size-4" />
                    )}
                    연결
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              size="icon"
              nativeButton={false}
              render={<Link href="/" />}
              aria-label="채팅 홈으로 이동"
              title="채팅 홈으로 이동"
            >
              <MessageSquare className="size-4" />
            </Button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {importError && (
            <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {importError}
            </p>
          )}

          {formMode ? (
            <div className="mx-auto max-w-lg">
              <McpServerForm
                key={
                  formMode.kind === "edit"
                    ? `edit:${formMode.serverId}`
                    : "create"
                }
                initialValue={editingServer ?? undefined}
                title={
                  formMode.kind === "edit"
                    ? "MCP 서버 정보 수정"
                    : "새 MCP 서버 연결"
                }
                submitLabel={formMode.kind === "edit" ? "저장" : "추가"}
                onSubmit={(draft) => {
                  if (formMode.kind === "edit") {
                    void handleUpdateServer(formMode.serverId, draft);
                    return;
                  }
                  addServer(draft);
                  setFormMode(null);
                }}
                onCancel={() => setFormMode(null)}
              />
            </div>
          ) : !activeServer ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              <div>
                <p>등록된 MCP 서버가 없습니다.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setFormMode({ kind: "create" })}
                >
                  서버 추가
                </Button>
              </div>
            </div>
          ) : isConnected && activeConnection ? (
            <McpCapabilitiesPanel
              capabilities={activeConnection.capabilities}
              sessionId={activeConnection.sessionId}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              <div className="max-w-md">
                <p className="font-medium text-foreground">
                  {activeServer.name}
                </p>
                <p className="mt-1">
                  연결하면 도구·프롬프트·리소스를 조회할 수 있습니다.
                </p>
                {connectError && activeServer.status === "error" && (
                  <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {connectError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
