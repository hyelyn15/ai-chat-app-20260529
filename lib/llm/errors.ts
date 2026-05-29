export type ChatErrorCode =
  | "MISSING_API_KEY"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMIT"
  | "SERVER_ERROR"
  | "UNKNOWN";

export type ChatError = {
  code: ChatErrorCode;
  message: string;
};

export function mapErrorToChatError(error: unknown): ChatError {
  if (error instanceof Error && error.message === "MISSING_API_KEY") {
    return {
      code: "MISSING_API_KEY",
      message:
        "API 키가 설정되지 않았습니다. 프로젝트 루트의 .env.local 파일에 GEMINI_API_KEY를 추가해 주세요.",
    };
  }

  const rawMessage = getErrorMessage(error);

  if (isInvalidApiKeyError(rawMessage)) {
    return {
      code: "UNAUTHORIZED",
      message:
        "API 키가 유효하지 않습니다. .env.local의 GEMINI_API_KEY를 확인하고 dev 서버를 재시작해 주세요.",
    };
  }

  const status = getErrorStatus(error);
  if (status === 401) {
    return {
      code: "UNAUTHORIZED",
      message: "API 키가 유효하지 않습니다. GEMINI_API_KEY를 확인해 주세요.",
    };
  }
  if (status === 400 && isInvalidApiKeyError(rawMessage)) {
    return {
      code: "UNAUTHORIZED",
      message: "API 키가 유효하지 않습니다. GEMINI_API_KEY를 확인해 주세요.",
    };
  }
  if (status === 400) {
    return {
      code: "UNKNOWN",
      message: toUserFacingBadRequest(rawMessage),
    };
  }
  if (status === 403) {
    return {
      code: "FORBIDDEN",
      message: "API 접근이 거부되었습니다. 키 권한을 확인해 주세요.",
    };
  }
  if (status === 429) {
    return {
      code: "RATE_LIMIT",
      message: "요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  if (status !== undefined && status >= 500) {
    return {
      code: "SERVER_ERROR",
      message:
        "AI 서버가 일시적으로 불안정합니다. 자동 재시도 후에도 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { code: "UNKNOWN", message: rawMessage };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "알 수 없는 오류가 발생했습니다.";
}

function isInvalidApiKeyError(message: string): boolean {
  return (
    message.includes("API_KEY_INVALID") ||
    message.includes("API key not valid") ||
    message.includes("API key expired") ||
    (message.includes("INVALID_ARGUMENT") && message.includes("API key"))
  );
}

function toUserFacingBadRequest(message: string): string {
  if (
    message.includes("functionDeclaration") ||
    message.includes("function_declarations") ||
    message.includes("parametersJsonSchema") ||
    message.includes("additionalProperties") ||
    message.includes("$schema")
  ) {
    return "MCP 도구 스키마가 Gemini API와 호환되지 않습니다. Inspector에서 연결된 서버의 도구 구성을 확인해 주세요.";
  }
  if (message.length > 0 && message.length <= 240) {
    return message;
  }
  return "요청 형식이 올바르지 않습니다. MCP 도구 설정을 확인하거나 잠시 후 다시 시도해 주세요.";
}

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  const message = getErrorMessage(error);
  const statusMatch = message.match(/"code":\s*(\d{3})/);
  if (statusMatch) return Number(statusMatch[1]);

  return undefined;
}
