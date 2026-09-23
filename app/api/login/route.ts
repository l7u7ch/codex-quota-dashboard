import { NextResponse } from "next/server";

import {
  createSession,
  isValidCredential,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { getAuthStore } from "@/lib/auth/auth-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const auth = await getAuthStore().read();

  if (!isValidCredential(id, password, auth)) {
    return NextResponse.json({ error: "IDまたはパスワードが正しくありません。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, createSession(auth), {
    httpOnly: true,
    maxAge: 8 * 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
