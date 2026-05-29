import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const PREFIX = "enc:v1:";

function getEncryptionKey(): Buffer | null {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) return null;
  return scryptSync(secret, "ai-chat-secrets", 32);
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required for secret encryption");
    }
    return plaintext;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith(PREFIX)) return value;

  const key = getEncryptionKey();
  if (!key) return undefined;

  const payload = value.slice(PREFIX.length);
  const [ivPart, tagPart, dataPart] = payload.split(":");
  if (!ivPart || !tagPart || !dataPart) return undefined;

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
