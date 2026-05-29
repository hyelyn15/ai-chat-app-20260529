import "server-only";

import { cookies } from "next/headers";

export const CLIENT_ID_COOKIE = "client_id";
const CLIENT_ID_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export async function getClientIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CLIENT_ID_COOKIE)?.value ?? null;
}

export async function setClientIdCookie(clientId: string): Promise<void> {
  const jar = await cookies();
  jar.set(CLIENT_ID_COOKIE, clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CLIENT_ID_MAX_AGE_SEC,
    path: "/",
  });
}

export async function clearClientIdCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(CLIENT_ID_COOKIE);
}
