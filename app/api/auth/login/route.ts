import { cookies } from "next/headers";

import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SEC,
} from "@/lib/auth/constants";
import { verifyAppPassword } from "@/lib/auth/password";
import { createSessionToken, isAuthConfigured } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return Response.json(
      { error: "APP_PASSWORD와 AUTH_SECRET 환경 변수를 설정해 주세요." },
      { status: 503 },
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.password || !verifyAppPassword(body.password)) {
    return Response.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = await createSessionToken();
  if (!token) {
    return Response.json({ error: "세션을 생성하지 못했습니다." }, { status: 500 });
  }

  const jar = await cookies();
  jar.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_SESSION_MAX_AGE_SEC,
    path: "/",
  });

  return Response.json({ ok: true });
}
