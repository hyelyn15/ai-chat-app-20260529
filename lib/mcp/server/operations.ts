import "server-only";

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

import type {
  McpCapabilities,
  McpCapabilityKind,
  McpPrompt,
  McpResource,
  McpTool,
} from "@/types/mcp";
import { getClient } from "@/lib/mcp/server/client-manager";

// 서버가 특정 capability를 지원하지 않으면 list 호출이 실패하므로 빈 배열로 흡수
async function safeList<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

export async function listCapabilities(
  client: Client,
): Promise<McpCapabilities> {
  const [tools, prompts, resources] = await Promise.all([
    safeList<McpTool>(async () => {
      const result = await client.listTools();
      return result.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as McpTool["inputSchema"],
      }));
    }),
    safeList<McpPrompt>(async () => {
      const result = await client.listPrompts();
      return result.prompts.map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments?.map((a) => ({
          name: a.name,
          description: a.description,
          required: a.required,
        })),
      }));
    }),
    safeList<McpResource>(async () => {
      const result = await client.listResources();
      return result.resources.map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }));
    }),
  ]);

  return { tools, prompts, resources };
}

type CallParams = {
  sessionId: string;
  kind: McpCapabilityKind;
  name: string;
  arguments?: Record<string, unknown>;
};

export async function runCapability({
  sessionId,
  kind,
  name,
  arguments: args,
}: CallParams): Promise<unknown> {
  const client = getClient(sessionId);

  if (kind === "tools") {
    return client.callTool({ name, arguments: args ?? {} });
  }
  if (kind === "prompts") {
    return client.getPrompt({
      name,
      arguments: (args as Record<string, string>) ?? {},
    });
  }
  // resources: name 필드에 uri를 전달
  return client.readResource({ uri: name });
}
