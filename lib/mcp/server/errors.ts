import "server-only";

export type McpErrorResponse = {
  error: string;
  code: string;
};

export function mapMcpError(error: unknown): McpErrorResponse {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("SESSION_NOT_FOUND")) {
    return {
      code: "SESSION_NOT_FOUND",
      error:
        "세션이 만료되었거나 존재하지 않습니다. 서버에 다시 연결해 주세요.",
    };
  }

  if (message.includes("ENOENT") || message.includes("spawn")) {
    return {
      code: "SPAWN_FAILED",
      error:
        "실행 명령을 찾을 수 없습니다. command/args가 올바른지, 해당 프로그램이 설치되어 있는지 확인해 주세요.",
    };
  }

  if (
    message.includes("ECONNREFUSED") ||
    message.includes("fetch failed") ||
    message.includes("Failed to fetch")
  ) {
    return {
      code: "CONNECTION_REFUSED",
      error: "서버에 연결할 수 없습니다. URL과 서버 상태를 확인해 주세요.",
    };
  }

  if (message.includes("401") || message.includes("403")) {
    return {
      code: "UNAUTHORIZED",
      error: "인증에 실패했습니다. 헤더(토큰)를 확인해 주세요.",
    };
  }

  return { code: "MCP_ERROR", error: message };
}
