"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchChatState, saveChatState } from "@/lib/data-api";
import {
  makeDefaultChatState,
  makeDefaultRoom,
  makeWelcomeMessage,
  type ChatState,
} from "@/lib/supabase/chat-mapper";
import { useClientSession } from "@/lib/use-client-session";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import type { Message } from "@/types/chat";

export function useChatRooms() {
  const { clientId, isReady, error: bootstrapError } = useClientSession();
  const [state, setState] = useState<ChatState>(makeDefaultChatState());
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!isReady || !clientId || bootstrappedRef.current) return;
    const sessionClientId = clientId;

    let cancelled = false;
    bootstrappedRef.current = true;

    async function load() {
      try {
        const next = await fetchChatState(sessionClientId);
        if (cancelled) return;
        setState(next);
        setIsHydrated(true);
      } catch (loadError) {
        if (cancelled) return;
        setSaveError(
          loadError instanceof Error
            ? loadError.message
            : "채팅 데이터를 불러오지 못했습니다.",
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
      return saveChatState(clientId, state).catch((saveErr) => {
        setSaveError(
          saveErr instanceof Error
            ? saveErr.message
            : "채팅 데이터를 저장하지 못했습니다.",
        );
      });
    },
    [clientId, state, isHydrated],
    Boolean(clientId) && isHydrated,
  );

  const activeRoom =
    state.rooms.find((room) => room.id === state.activeRoomId) ?? state.rooms[0];

  const setActiveRoomMessages = useCallback(
    (updater: Message[] | ((prev: Message[]) => Message[])) => {
      setState((prev) => {
        const current =
          prev.rooms.find((room) => room.id === prev.activeRoomId)?.messages ??
          [];
        const next =
          typeof updater === "function" ? updater(current) : updater;
        return {
          ...prev,
          rooms: prev.rooms.map((room) =>
            room.id === prev.activeRoomId ? { ...room, messages: next } : room,
          ),
        };
      });
    },
    [],
  );

  const createRoom = useCallback(() => {
    setState((prev) => {
      const newRoom = makeDefaultRoom(`채팅 ${prev.rooms.length + 1}`);
      return {
        rooms: [...prev.rooms, newRoom],
        activeRoomId: newRoom.id,
      };
    });
  }, []);

  const deleteRoom = useCallback((roomId: string) => {
    setState((prev) => {
      if (prev.rooms.length === 1) {
        const fresh = makeDefaultRoom("채팅 1");
        return { rooms: [fresh], activeRoomId: fresh.id };
      }
      const remaining = prev.rooms.filter((room) => room.id !== roomId);
      const newActiveId =
        prev.activeRoomId === roomId
          ? (remaining[remaining.length - 1]?.id ?? remaining[0].id)
          : prev.activeRoomId;
      return { rooms: remaining, activeRoomId: newActiveId };
    });
  }, []);

  const selectRoom = useCallback((roomId: string) => {
    setState((prev) => ({ ...prev, activeRoomId: roomId }));
  }, []);

  const clearActiveRoom = useCallback(() => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === prev.activeRoomId
          ? { ...room, messages: [makeWelcomeMessage()] }
          : room,
      ),
    }));
  }, []);

  return {
    rooms: state.rooms,
    activeRoom,
    setActiveRoomMessages,
    createRoom,
    deleteRoom,
    selectRoom,
    clearActiveRoom,
    isLoading,
    storageError: bootstrapError ?? saveError,
  };
}
