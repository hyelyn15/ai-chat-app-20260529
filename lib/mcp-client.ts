import { buildHttpHeaders, extractHfToken } from "@/lib/mcp-headers";
import type {
  McpCapabilities,
  McpCapabilityKind,
  McpConnectConfig,
  McpField,
  McpJsonSchema,
  McpPromptArgument,
  McpServer,
} from "@/types/mcp";

type ConnectResult = {
  sessionId: string;
  capabilities: McpCapabilities;
};

export function serverToConfig(server: McpServer): McpConnectConfig {
  if (server.transport === "stdio") {
    return {
      transport: "stdio",
      command: server.command?.trim(),
      args: server.args ? server.args.split(/\s+/).filter(Boolean) : [],
    };
  }
  return {
    transport: "http",
    url: server.url?.trim(),
    headers: buildHttpHeaders(
      server.headers,
      server.hfToken ?? extractHfToken(server.headers),
    ),
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? `요청에 실패했습니다. (${response.status})`);
  }
  return data as T;
}

export function connectServer(server: McpServer): Promise<ConnectResult> {
  return postJson<ConnectResult>("/api/mcp/connect", serverToConfig(server));
}

export async function disconnectServer(sessionId: string): Promise<void> {
  await fetch("/api/mcp/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export async function runCapability(
  sessionId: string,
  kind: McpCapabilityKind,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const data = await postJson<{ result: unknown }>("/api/mcp/call", {
    sessionId,
    kind,
    name,
    arguments: args,
  });
  return JSON.stringify(data.result, null, 2);
}

export function toolFields(schema?: McpJsonSchema): McpField[] {
  if (!schema?.properties) return [];
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, prop]) => ({
    name,
    type: prop.type ?? "string",
    description: prop.description,
    required: required.has(name),
  }));
}

export function promptFields(args?: McpPromptArgument[]): McpField[] {
  return (args ?? []).map((a) => ({
    name: a.name,
    type: "string",
    description: a.description,
    required: a.required,
  }));
}

// 폼 입력(문자열)을 필드 타입에 맞춰 변환. 비어있는 선택 인자는 제외
export function coerceInputs(
  fields: McpField[],
  inputs: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = inputs[field.name];
    if (raw === undefined || raw.trim() === "") continue;

    if (field.type === "number" || field.type === "integer") {
      const num = Number(raw);
      result[field.name] = Number.isNaN(num) ? raw : num;
    } else if (field.type === "boolean") {
      result[field.name] = raw === "true";
    } else if (field.type === "object" || field.type === "array") {
      try {
        result[field.name] = JSON.parse(raw);
      } catch {
        result[field.name] = raw;
      }
    } else {
      result[field.name] = raw;
    }
  }
  return result;
}
