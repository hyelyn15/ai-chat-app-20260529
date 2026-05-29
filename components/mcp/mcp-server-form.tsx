"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  extractHfToken,
  headersWithoutHfToken,
} from "@/lib/mcp-headers";
import type { McpServerDraft, McpTransport } from "@/types/mcp";

type McpServerFormProps = {
  initialValue?: McpServerDraft;
  onSubmit: (draft: McpServerDraft) => void;
  onCancel: () => void;
  submitLabel?: string;
  title?: string;
};

const TRANSPORT_LABELS: Record<McpTransport, string> = {
  stdio: "stdio (로컬 프로세스)",
  http: "Streamable HTTP",
};

export function McpServerForm({
  initialValue,
  onSubmit,
  onCancel,
  submitLabel = "추가",
  title = "새 MCP 서버 연결",
}: McpServerFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [transport, setTransport] = useState<McpTransport>(
    initialValue?.transport ?? "stdio",
  );
  const [command, setCommand] = useState(initialValue?.command ?? "");
  const [args, setArgs] = useState(initialValue?.args ?? "");
  const [url, setUrl] = useState(initialValue?.url ?? "");
  const [headers, setHeaders] = useState(
    headersWithoutHfToken(initialValue?.headers) || "",
  );
  const [hfToken, setHfToken] = useState(
    initialValue?.hfToken ?? extractHfToken(initialValue?.headers) ?? "",
  );

  const isStdio = transport === "stdio";
  const canSubmit =
    name.trim() && (isStdio ? command.trim() : url.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      transport,
      command: isStdio ? command.trim() : undefined,
      args: isStdio ? args.trim() || undefined : undefined,
      url: isStdio ? undefined : url.trim(),
      headers: isStdio ? undefined : headers.trim() || undefined,
      hfToken: isStdio ? undefined : hfToken.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mcp-name">이름</Label>
        <Input
          id="mcp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 파일시스템 서버"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>전송 방식</Label>
        <Select
          value={transport}
          onValueChange={(v) => setTransport(v as McpTransport)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TRANSPORT_LABELS) as McpTransport[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TRANSPORT_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isStdio ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mcp-command">실행 명령</Label>
            <Input
              id="mcp-command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="예: npx"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mcp-args">인자 (공백 구분)</Label>
            <Input
              id="mcp-args"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="예: -y @modelcontextprotocol/server-filesystem /path"
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mcp-url">엔드포인트 URL</Label>
            <Input
              id="mcp-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/mcp"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mcp-hf-token">HuggingFace 토큰 (선택)</Label>
            <Input
              id="mcp-hf-token"
              type="password"
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              placeholder="hf_..."
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              generate-image 등 이미지 생성 도구 사용 시 x-hf-token 헤더로
              전달됩니다.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mcp-headers">기타 헤더 (선택, 한 줄에 하나)</Label>
            <Textarea
              id="mcp-headers"
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              placeholder="Authorization: Bearer ..."
              rows={2}
              className="resize-none"
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
