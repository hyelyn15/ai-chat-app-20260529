import { cookies } from "next/headers";

import { AUTH_SESSION_COOKIE } from "@/lib/auth/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  jar.delete(AUTH_SESSION_COOKIE);
  return Response.json({ ok: true });
}
