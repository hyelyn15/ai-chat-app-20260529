export type McpTransport = "stdio" | "http";

export type McpServerStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type McpServer = {
  id: string;
  name: string;
  transport: McpTransport;
  // stdio 전용
  command?: string;
  args?: string;
  // http 전용
  url?: string;
  headers?: string;
  hfToken?: string;
  status: McpServerStatus;
  createdAt: Date;
};

// 폼에서 신규 서버를 만들 때 사용하는 입력 형태 (id/status/createdAt 제외)
export type McpServerDraft = Omit<McpServer, "id" | "status" | "createdAt">;

// 서버 사이드 MCP Client 연결에 사용하는 정규화된 설정
export type McpConnectConfig = {
  transport: McpTransport;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
};

export type McpJsonSchemaProperty = {
  type?: string;
  description?: string;
};

export type McpJsonSchema = {
  type?: string;
  properties?: Record<string, McpJsonSchemaProperty>;
  required?: string[];
};

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: McpJsonSchema;
};

export type McpPromptArgument = {
  name: string;
  description?: string;
  required?: boolean;
};

export type McpPrompt = {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
};

export type McpResource = {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
};

export type McpCapabilities = {
  tools: McpTool[];
  prompts: McpPrompt[];
  resources: McpResource[];
};

export type McpCapabilityKind = "tools" | "prompts" | "resources";

// 테스터 UI가 렌더링하는 입력 필드 (tool inputSchema / prompt arguments에서 변환)
export type McpField = {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
};

// 내보내기/불러오기 파일 포맷
export type McpServerExport = {
  version: 1;
  exportedAt: string;
  servers: McpServerDraft[];
};
