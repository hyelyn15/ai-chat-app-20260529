import { NextResponse, type NextRequest } from "next/server";

import { AUTH_SESSION_COOKIE, PUBLIC_PATHS } from "@/lib/auth/constants";
import { isAuthConfigured, verifySessionToken } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/edge";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function authRequired(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return isAuthConfigured();
  }
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/api/auth/logout") {
    return NextResponse.next();
  }

  if (authRequired()) {
    if (!isAuthConfigured()) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error:
              "APP_PASSWORD와 AUTH_SECRET 환경 변수를 설정해 주세요.",
          },
          { status: 503 },
        );
      }
      return new NextResponse(
        "APP_PASSWORD와 AUTH_SECRET 환경 변수를 설정해 주세요.",
        { status: 503 },
      );
    }

    if (!isPublicPath(pathname)) {
      const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
      const valid = token ? await verifySessionToken(token) : false;
      if (!valid) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  if (pathname === "/api/chat/stream") {
    const ip = getClientIp(request);
    const { allowed, retryAfterSec } = checkRateLimit(
      `chat-stream:${ip}`,
      20,
      60_000,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        },
      );
    }
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    const ip = getClientIp(request);
    const { allowed, retryAfterSec } = checkRateLimit(
      `auth-login:${ip}`,
      5,
      60_000,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
