const PRIVATE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function getAllowedHosts(): string[] {
  const raw = process.env.MCP_ALLOWED_HOSTS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isHostAllowed(hostname: string, allowedHosts: string[]): boolean {
  const host = hostname.toLowerCase();
  return allowedHosts.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

export function assertAllowedMcpUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("MCP URL이 유효하지 않습니다.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("MCP URL은 http 또는 https만 허용됩니다.");
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("프로덕션에서는 https MCP URL만 허용됩니다.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    PRIVATE_HOSTS.has(hostname) ||
    isPrivateIpv4(hostname) ||
    hostname.endsWith(".local")
  ) {
    throw new Error("내부/로컬 MCP URL은 허용되지 않습니다.");
  }

  const allowedHosts = getAllowedHosts();
  if (process.env.NODE_ENV === "production" && allowedHosts.length === 0) {
    throw new Error(
      "MCP_ALLOWED_HOSTS 환경 변수에 허용 호스트를 설정해 주세요.",
    );
  }

  if (allowedHosts.length > 0 && !isHostAllowed(hostname, allowedHosts)) {
    throw new Error(`허용되지 않은 MCP 호스트입니다: ${hostname}`);
  }
}

export function validateMcpConnectConfig(config: {
  transport: string;
  url?: string;
  command?: string;
}): void {
  if (config.transport === "stdio") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("stdio MCP는 프로덕션에서 허용되지 않습니다.");
    }
    return;
  }

  if (config.transport === "http" || config.transport === "sse") {
    if (!config.url) {
      throw new Error("HTTP MCP 연결에는 url이 필요합니다.");
    }
    assertAllowedMcpUrl(config.url);
  }
}
