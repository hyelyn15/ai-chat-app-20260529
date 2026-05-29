"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveMcpServersState, fetchMcpServersState } from "@/lib/data-api";
import { useClientSession } from "@/lib/use-client-session";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import type {
  McpServer,
  McpServerDraft,
  McpServerStatus,
} from "@/types/mcp";

type McpState = {
  servers: McpServer[];
  activeServerId: string | null;
};

function draftToServer(draft: McpServerDraft): McpServer {
  return {
    ...draft,
    id: crypto.randomUUID(),
    status: "disconnected",
    createdAt: new Date(),
  };
}

export function useMcpServers() {
  const { clientId, isReady, error: bootstrapError } = useClientSession();
  const [state, setState] = useState<McpState>({
    servers: [],
    activeServerId: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!isReady || !clientId || bootstrappedRef.current) return;

    let cancelled = false;
    bootstrappedRef.current = true;

    async function load() {
      try {
        const next = await fetchMcpServersState();
        if (cancelled) return;
        setState(next);
        setIsHydrated(true);
      } catch (loadError) {
        if (cancelled) return;
        setSaveError(
          loadError instanceof Error
            ? loadError.message
            : "MCP 서버 데이터를 불러오지 못했습니다.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [clientId, isReady]);

  useDebouncedEffect(
    () => {
      if (!clientId || !isHydrated) return;
      setSaveError(null);
      return saveMcpServersState(state).catch((saveErr) => {
        setSaveError(
          saveErr instanceof Error
            ? saveErr.message
            : "MCP 서버 데이터를 저장하지 못했습니다.",
        );
      });
    },
    [clientId, state, isHydrated],
    Boolean(clientId) && isHydrated,
  );

  const activeServer =
    state.servers.find((server) => server.id === state.activeServerId) ?? null;

  const addServer = useCallback((draft: McpServerDraft) => {
    const server = draftToServer(draft);
    setState((prev) => ({
      servers: [...prev.servers, server],
      activeServerId: server.id,
    }));
    return server.id;
  }, []);

  const importServers = useCallback((drafts: McpServerDraft[]) => {
    const created = drafts.map(draftToServer);
    setState((prev) => ({
      servers: [...prev.servers, ...created],
      activeServerId: created[0]?.id ?? prev.activeServerId,
    }));
  }, []);

  const updateServer = useCallback((id: string, patch: Partial<McpServer>) => {
    setState((prev) => ({
      ...prev,
      servers: prev.servers.map((server) =>
        server.id === id ? { ...server, ...patch } : server,
      ),
    }));
  }, []);

  const setStatus = useCallback((id: string, status: McpServerStatus) => {
    setState((prev) => ({
      ...prev,
      servers: prev.servers.map((server) =>
        server.id === id ? { ...server, status } : server,
      ),
    }));
  }, []);

  const deleteServer = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.servers.filter((server) => server.id !== id);
      const nextActiveId =
        prev.activeServerId === id
          ? (remaining[0]?.id ?? null)
          : prev.activeServerId;
      return { servers: remaining, activeServerId: nextActiveId };
    });
  }, []);

  const selectServer = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeServerId: id }));
  }, []);

  return {
    servers: state.servers,
    activeServer,
    activeServerId: state.activeServerId,
    addServer,
    importServers,
    updateServer,
    setStatus,
    deleteServer,
    selectServer,
    isLoading,
    storageError: bootstrapError ?? saveError,
  };
}
