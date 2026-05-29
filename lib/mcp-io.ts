import type { McpServer, McpServerDraft, McpServerExport } from "@/types/mcp";

// 서버 목록을 내보내기용 JSON 문자열로 직렬화 (런타임 상태/식별자는 제외)
export function serializeServers(servers: McpServer[]): string {
  const payload: McpServerExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    servers: servers.map((s) => ({
      name: s.name,
      transport: s.transport,
      command: s.command,
      args: s.args,
      url: s.url,
      headers: s.headers,
      hfToken: s.hfToken,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

// 불러오기 파일을 파싱하여 드래프트 배열로 변환. 형식이 어긋나면 예외 발생
export function parseServersFile(raw: string): McpServerDraft[] {
  const parsed = JSON.parse(raw) as Partial<McpServerExport>;
  if (!parsed || !Array.isArray(parsed.servers)) {
    throw new Error("유효한 MCP 서버 파일이 아닙니다.");
  }

  return parsed.servers.map((s) => {
    if (!s.name || !s.transport) {
      throw new Error("서버 항목에 name 또는 transport가 없습니다.");
    }
    return {
      name: s.name,
      transport: s.transport,
      command: s.command,
      args: s.args,
      url: s.url,
      headers: s.headers,
      hfToken: s.hfToken,
    };
  });
}

export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
