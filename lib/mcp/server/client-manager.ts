import "server-only";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { McpConnectConfig } from "@/types/mcp";

type Session = {
  id: string;
  client: Client;
  configKey: string;
  createdAt: number;
};

// 개발 중 HMR로 모듈이 재평가되어도 연결이 유지되도록 globalThis에 세션 맵을 보관
const globalForMcp = globalThis as unknown as {
  __mcpSessions?: Map<string, Session>;
  __mcpSessionKeys?: Map<string, string>;
};

const sessions: Map<string, Session> =
  globalForMcp.__mcpSessions ?? new Map<string, Session>();
globalForMcp.__mcpSessions = sessions;

const sessionKeys: Map<string, string> =
  globalForMcp.__mcpSessionKeys ?? new Map<string, string>();
globalForMcp.__mcpSessionKeys = sessionKeys;

// Windows에서는 npx/uvx 같은 .cmd 런처가 셸을 통해서만 해석되므로 cmd /c로 감싼다.
function resolveStdioCommand(
  command: string,
  args: string[],
): { command: string; args: string[] } {
  if (process.platform !== "win32") return { command, args };

  const lower = command.toLowerCase();
  const alreadyResolvable =
    command === "cmd" ||
    lower.endsWith(".exe") ||
    lower.endsWith(".cmd") ||
    lower.endsWith(".bat") ||
    command.includes("/") ||
    command.includes("\\");

  if (alreadyResolvable) return { command, args };
  return { command: "cmd", args: ["/c", command, ...args] };
}

function createTransport(config: McpConnectConfig) {
  if (config.transport === "stdio") {
    if (!config.command) {
      throw new Error("stdio 전송에는 command가 필요합니다.");
    }
    const resolved = resolveStdioCommand(config.command, config.args ?? []);
    return new StdioClientTransport({
      command: resolved.command,
      args: resolved.args,
      env: config.env,
    });
  }

  if (!config.url) {
    throw new Error("HTTP 전송에는 url이 필요합니다.");
  }
  return new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: config.headers ? { headers: config.headers } : undefined,
  });
}

function getConfigKey(config: McpConnectConfig): string {
  return JSON.stringify(sortObject(config));
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortObject(v)]),
  );
}

export async function connectSession(
  config: McpConnectConfig,
): Promise<string> {
  const configKey = getConfigKey(config);
  const existingId = sessionKeys.get(configKey);
  if (existingId && sessions.has(existingId)) {
    return existingId;
  }
  if (existingId) {
    sessionKeys.delete(configKey);
  }

  const client = new Client({ name: "ai-chat-inspector", version: "1.0.0" });
  const transport = createTransport(config);

  await client.connect(transport);

  const id = crypto.randomUUID();
  sessions.set(id, { id, client, configKey, createdAt: Date.now() });
  sessionKeys.set(configKey, id);
  return id;
}

export function getClient(sessionId: string): Client {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }
  return session.client;
}

export async function disconnectSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);
  sessionKeys.delete(session.configKey);
  try {
    await session.client.close();
  } catch {
    // 종료 중 오류는 무시 (이미 끊긴 경우 등)
  }
}
