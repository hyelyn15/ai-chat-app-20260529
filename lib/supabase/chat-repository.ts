import "server-only";

import {
  makeDefaultChatState,
  mapLegacyChatPayload,
  normalizeChatState,
  parseImages,
  serializeImages,
  toIsoString,
  type ChatState,
  type LegacyChatPayload,
} from "@/lib/supabase/chat-mapper";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ChatRoom, Message } from "@/types/chat";

export async function loadChatState(clientId: string): Promise<ChatState | null> {
  const supabase = getSupabaseAdmin();

  const { data: rooms, error: roomsError } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("client_id", clientId)
    .order("sort_order", { ascending: true });

  if (roomsError) throw roomsError;
  if (!rooms?.length) return null;

  const roomIds = rooms.map((room) => room.id);
  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("*")
    .in("room_id", roomIds)
    .order("sort_order", { ascending: true });

  if (messagesError) throw messagesError;

  const messagesByRoom = new Map<string, Message[]>();
  for (const row of messages ?? []) {
    const list = messagesByRoom.get(row.room_id) ?? [];
    list.push({
      id: row.id,
      role: row.role as Message["role"],
      content: row.content,
      images: parseImages(row.images),
      createdAt: new Date(row.created_at),
    });
    messagesByRoom.set(row.room_id, list);
  }

  const chatRooms: ChatRoom[] = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    createdAt: new Date(room.created_at),
    messages: messagesByRoom.get(room.id) ?? [],
  }));

  const { data: prefs, error: prefsError } = await supabase
    .from("client_preferences")
    .select("active_room_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (prefsError) throw prefsError;

  const activeRoomId =
    prefs?.active_room_id && chatRooms.some((room) => room.id === prefs.active_room_id)
      ? prefs.active_room_id
      : chatRooms[0].id;

  return { rooms: chatRooms, activeRoomId };
}

export async function ensureChatState(clientId: string): Promise<ChatState> {
  const existing = await loadChatState(clientId);
  if (existing) return existing;

  const state = makeDefaultChatState();
  await saveChatState(clientId, state);
  return state;
}

export async function saveChatState(
  clientId: string,
  state: ChatState,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalized = normalizeChatState(state);
  const roomIds = normalized.rooms.map((room) => room.id);

  for (const [roomIndex, room] of normalized.rooms.entries()) {
    const { error: roomError } = await supabase.from("chat_rooms").upsert(
      {
        id: room.id,
        client_id: clientId,
        name: room.name,
        created_at: toIsoString(room.createdAt),
        sort_order: roomIndex,
      },
      { onConflict: "id" },
    );
    if (roomError) throw roomError;

    const messageIds = room.messages.map((message) => message.id);

    if (room.messages.length > 0) {
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .upsert(
          room.messages.map((message, messageIndex) => ({
            id: message.id,
            room_id: room.id,
            role: message.role,
            content: message.content,
            images: serializeImages(message.images),
            created_at: toIsoString(message.createdAt),
            sort_order: messageIndex,
          })),
          { onConflict: "id" },
        );
      if (messagesError) throw messagesError;
    }

    let orphanQuery = supabase
      .from("chat_messages")
      .delete()
      .eq("room_id", room.id);
    if (messageIds.length > 0) {
      orphanQuery = orphanQuery.not("id", "in", `(${messageIds.join(",")})`);
    }
    const { error: orphanMessagesError } = await orphanQuery;
    if (orphanMessagesError) throw orphanMessagesError;
  }

  let orphanRoomsQuery = supabase
    .from("chat_rooms")
    .delete()
    .eq("client_id", clientId);
  if (roomIds.length > 0) {
    orphanRoomsQuery = orphanRoomsQuery.not("id", "in", `(${roomIds.join(",")})`);
  }
  const { error: orphanRoomsError } = await orphanRoomsQuery;
  if (orphanRoomsError) throw orphanRoomsError;

  const { data: existingPrefs } = await supabase
    .from("client_preferences")
    .select("active_mcp_server_id")
    .eq("client_id", clientId)
    .maybeSingle();

  const { error: prefsError } = await supabase.from("client_preferences").upsert(
    {
      client_id: clientId,
      active_room_id: normalized.activeRoomId,
      active_mcp_server_id: existingPrefs?.active_mcp_server_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );
  if (prefsError) throw prefsError;
}

export async function createClientWithChat(
  legacyChat?: LegacyChatPayload,
): Promise<{ clientId: string; state: ChatState }> {
  const supabase = getSupabaseAdmin();
  const state = legacyChat ? mapLegacyChatPayload(legacyChat) : makeDefaultChatState();

  const { data: client, error: clientError } = await supabase
    .from("app_clients")
    .insert({})
    .select("id")
    .single();

  if (clientError) throw clientError;

  await saveChatState(client.id, state);
  return { clientId: client.id, state };
}

export async function clientExists(clientId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
