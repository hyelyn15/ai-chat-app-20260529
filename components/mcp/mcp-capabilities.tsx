"use client";

import { useState } from "react";

import { McpTester } from "@/components/mcp/mcp-tester";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  coerceInputs,
  promptFields,
  runCapability,
  toolFields,
} from "@/lib/mcp-client";
import { cn } from "@/lib/utils";
import type {
  McpCapabilities,
  McpCapabilityKind,
  McpField,
} from "@/types/mcp";

type McpCapabilitiesPanelProps = {
  capabilities: McpCapabilities;
  sessionId: string;
};

type SelectedItem = {
  kind: McpCapabilityKind;
  name: string;
  description?: string;
  fields: McpField[];
};

export function McpCapabilitiesPanel({
  capabilities,
  sessionId,
}: McpCapabilitiesPanelProps) {
  const [selected, setSelected] = useState<SelectedItem | null>(null);

  const renderRow = (item: SelectedItem, key: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setSelected(item)}
      className={cn(
        "flex w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted",
        selected?.kind === item.kind &&
          selected?.name === item.name &&
          "border-primary/40 bg-muted",
      )}
    >
      <span className="font-mono text-sm break-all">{item.name}</span>
      {item.description && (
        <span className="line-clamp-1 text-xs text-muted-foreground">
          {item.description}
        </span>
      )}
    </button>
  );

  const emptyHint = (label: string) => (
    <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
      {label}
    </p>
  );

  return (
    <Tabs
      defaultValue="tools"
      onValueChange={() => setSelected(null)}
      className="gap-4"
    >
      <TabsList>
        <TabsTrigger value="tools">
          Tools{" "}
          <span className="text-muted-foreground">
            {capabilities.tools.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="prompts">
          Prompts{" "}
          <span className="text-muted-foreground">
            {capabilities.prompts.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="resources">
          Resources{" "}
          <span className="text-muted-foreground">
            {capabilities.resources.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <div className="grid gap-4 md:grid-cols-2">
        <TabsContent value="tools" className="flex flex-col gap-2">
          {capabilities.tools.length === 0
            ? emptyHint("이 서버는 Tool을 제공하지 않습니다.")
            : capabilities.tools.map((tool) =>
                renderRow(
                  {
                    kind: "tools",
                    name: tool.name,
                    description: tool.description,
                    fields: toolFields(tool.inputSchema),
                  },
                  tool.name,
                ),
              )}
        </TabsContent>

        <TabsContent value="prompts" className="flex flex-col gap-2">
          {capabilities.prompts.length === 0
            ? emptyHint("이 서버는 Prompt를 제공하지 않습니다.")
            : capabilities.prompts.map((prompt) =>
                renderRow(
                  {
                    kind: "prompts",
                    name: prompt.name,
                    description: prompt.description,
                    fields: promptFields(prompt.arguments),
                  },
                  prompt.name,
                ),
              )}
        </TabsContent>

        <TabsContent value="resources" className="flex flex-col gap-2">
          {capabilities.resources.length === 0
            ? emptyHint("이 서버는 Resource를 제공하지 않습니다.")
            : capabilities.resources.map((resource) =>
                renderRow(
                  {
                    kind: "resources",
                    name: resource.uri,
                    description: resource.description ?? resource.name,
                    fields: [],
                  },
                  resource.uri,
                ),
              )}
        </TabsContent>

        <div>
          {selected ? (
            <McpTester
              key={`${selected.kind}:${selected.name}`}
              name={selected.name}
              description={selected.description}
              fields={selected.fields}
              onRun={(inputs) =>
                runCapability(
                  sessionId,
                  selected.kind,
                  selected.name,
                  coerceInputs(selected.fields, inputs),
                )
              }
            />
          ) : (
            <div className="flex h-full min-h-32 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              항목을 선택하면 조회·테스트할 수 있습니다.
            </div>
          )}
        </div>
      </div>
    </Tabs>
  );
}
