import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import { toIsoString } from "@/lib/supabase/chat-mapper";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { McpServer, McpServerStatus } from "@/types/mcp";

export type McpServersState = {
  servers: McpServer[];
  activeServerId: string | null;
};

type LegacyMcpServer = Omit<McpServer, "createdAt"> & { createdAt: string };

function rowToServer(row: {
  id: string;
  name: string;
  transport: string;
  command: string | null;
  args: string | null;
  url: string | null;
  headers: string | null;
  hf_token: string | null;
  status: string;
  created_at: string;
}): McpServer {
  return {
    id: row.id,
    name: row.name,
    transport: row.transport as McpServer["transport"],
    command: row.command ?? undefined,
    args: row.args ?? undefined,
    url: row.url ?? undefined,
    headers: row.headers ?? undefined,
    hfToken: decryptSecret(row.hf_token) ?? undefined,
    status: row.status as McpServerStatus,
    createdAt: new Date(row.created_at),
  };
}

export async function loadMcpServers(
  clientId: string,
): Promise<McpServersState | null> {
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from("mcp_servers")
    .select("*")
    .eq("client_id", clientId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  if (!rows?.length) return { servers: [], activeServerId: null };

  const servers = rows.map(rowToServer);

  const { data: prefs, error: prefsError } = await supabase
    .from("client_preferences")
    .select("active_mcp_server_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (prefsError) throw prefsError;

  const activeServerId =
    prefs?.active_mcp_server_id &&
    servers.some((server) => server.id === prefs.active_mcp_server_id)
      ? prefs.active_mcp_server_id
      : (servers[0]?.id ?? null);

  return { servers, activeServerId };
}

export async function saveMcpServers(
  clientId: string,
  state: McpServersState,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const serverIds = state.servers.map((server) => server.id);

  if (state.servers.length > 0) {
    const { error: upsertError } = await supabase.from("mcp_servers").upsert(
      state.servers.map((server, index) => ({
        id: server.id,
        client_id: clientId,
        name: server.name,
        transport: server.transport,
        command: server.command ?? null,
        args: server.args ?? null,
        url: server.url ?? null,
        headers: server.headers ?? null,
        hf_token: server.hfToken ? encryptSecret(server.hfToken) : null,
        status: server.status,
        created_at: toIsoString(server.createdAt),
        sort_order: index,
      })),
      { onConflict: "id" },
    );
    if (upsertError) throw upsertError;
  }

  let orphanQuery = supabase
    .from("mcp_servers")
    .delete()
    .eq("client_id", clientId);
  if (serverIds.length > 0) {
    orphanQuery = orphanQuery.not("id", "in", `(${serverIds.join(",")})`);
  }
  const { error: orphanError } = await orphanQuery;
  if (orphanError) throw orphanError;

  const { data: existingPrefs } = await supabase
    .from("client_preferences")
    .select("active_room_id")
    .eq("client_id", clientId)
    .maybeSingle();

  const { error: prefsError } = await supabase.from("client_preferences").upsert(
    {
      client_id: clientId,
      active_room_id: existingPrefs?.active_room_id ?? null,
      active_mcp_server_id: state.activeServerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );
  if (prefsError) throw prefsError;
}

export async function saveLegacyMcpServers(
  clientId: string,
  legacyServers: LegacyMcpServer[],
): Promise<McpServersState> {
  const servers: McpServer[] = legacyServers.map((server) => ({
    ...server,
    status:
      server.status === "connected"
        ? ("connected" as McpServerStatus)
        : ("disconnected" as McpServerStatus),
    createdAt: new Date(server.createdAt),
  }));

  const state = {
    servers,
    activeServerId: servers[0]?.id ?? null,
  };

  await saveMcpServers(clientId, state);
  return state;
}
