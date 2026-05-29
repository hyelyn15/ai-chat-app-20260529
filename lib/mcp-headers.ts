const HF_HEADER = "x-hf-token";

export function extractHfToken(headers?: string): string {
  if (!headers?.trim()) return "";
  for (const line of headers.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    if (key === HF_HEADER) return line.slice(idx + 1).trim();
  }
  return "";
}

export function headersWithoutHfToken(headers?: string): string {
  if (!headers?.trim()) return "";
  return headers
    .split(/\r?\n/)
    .filter((line) => {
      const idx = line.indexOf(":");
      if (idx <= 0) return Boolean(line.trim());
      return line.slice(0, idx).trim().toLowerCase() !== HF_HEADER;
    })
    .join("\n")
    .trim();
}

export function buildHttpHeaders(
  headers?: string,
  hfToken?: string,
): Record<string, string> | undefined {
  const result: Record<string, string> = {};

  if (headers?.trim()) {
    for (const line of headers.split(/\r?\n/)) {
      const idx = line.indexOf(":");
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key && key.toLowerCase() !== HF_HEADER) {
        result[key] = value;
      }
    }
  }

  const token = hfToken?.trim();
  if (token) {
    result[HF_HEADER] = token;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
