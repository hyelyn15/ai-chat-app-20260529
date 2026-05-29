import "server-only";

import type { FunctionDeclaration } from "@google/genai";

import { parseMcpToolResult, type ParsedToolResult } from "@/lib/mcp/tool-result";
import { connectSession, getClient } from "@/lib/mcp/server/client-manager";
import type { McpConnectConfig, McpJsonSchema } from "@/types/mcp";

export type PreparedTools = {
  functionDeclarations: FunctionDeclaration[];
  execute: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<ParsedToolResult>;
};

type RegistryEntry = { sessionId: string; toolName: string };

export async function prepareMcpTools(
  configs: McpConnectConfig[],
): Promise<PreparedTools> {
  const functionDeclarations: FunctionDeclaration[] = [];
  const registry = new Map<string, RegistryEntry>();

  for (const config of configs) {
    let sessionId: string;
    try {
      sessionId = await connectSession(config);
    } catch {
      continue;
    }

    let tools;
    try {
      tools = (await getClient(sessionId).listTools()).tools;
    } catch {
      continue;
    }

    for (const tool of tools) {
      const fnName = uniqueName(sanitizeName(tool.name), registry);
      registry.set(fnName, { sessionId, toolName: tool.name });
      functionDeclarations.push({
        name: fnName,
        description: tool.description,
        parametersJsonSchema: toParametersSchema(
          tool.inputSchema as McpJsonSchema | undefined,
        ),
      });
    }
  }

  return {
    functionDeclarations,
    execute: async (name, args) => {
      const entry = registry.get(name);
      if (!entry) {
        throw new Error(`알 수 없는 도구입니다: ${name}`);
      }
      const result = await getClient(entry.sessionId).callTool({
        name: entry.toolName,
        arguments: args ?? {},
      });
      return parseMcpToolResult(result);
    },
  };
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const prefixed = /^[a-zA-Z_]/.test(cleaned) ? cleaned : `t_${cleaned}`;
  return prefixed.slice(0, 60);
}

function uniqueName(base: string, registry: Map<string, RegistryEntry>): string {
  if (!registry.has(base)) return base;
  let i = 2;
  while (registry.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

function toParametersSchema(schema?: McpJsonSchema): Record<string, unknown> {
  if (!schema || schema.type !== "object") {
    return { type: "object", properties: {} };
  }
  return sanitizeJsonSchema({
    type: "object",
    properties: schema.properties ?? {},
    ...(schema.required?.length ? { required: schema.required } : {}),
  }) as Record<string, unknown>;
}

const SCHEMA_KEEP_KEYS = new Set([
  "type",
  "format",
  "description",
  "enum",
  "items",
  "properties",
  "required",
  "minimum",
  "maximum",
  "minItems",
  "maxItems",
]);

function sanitizeJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonSchema);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(input)) {
    if (!SCHEMA_KEEP_KEYS.has(key)) continue;
    if (key === "properties" && typeof nested === "object" && nested !== null) {
      const properties: Record<string, unknown> = {};
      for (const [propName, propSchema] of Object.entries(nested)) {
        properties[propName] = sanitizeJsonSchema(propSchema);
      }
      output.properties = properties;
      continue;
    }
    output[key] = sanitizeJsonSchema(nested);
  }

  return output;
}
