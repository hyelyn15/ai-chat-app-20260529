export function verifyAppPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD?.trim();
  if (!expected) return false;

  const normalized = input.trim();
  if (normalized.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ normalized.charCodeAt(i);
  }
  return mismatch === 0;
}
