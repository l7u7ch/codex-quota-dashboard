import { NextResponse } from "next/server";

import { getAuthStore } from "@/lib/auth/auth-store";
import {
  createSession,
  SESSION_COOKIE_NAME,
  SESSION_LIFETIME_SECONDS,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.slice(0, -1);
  if (request.headers.get("origin") !== `${protocol}://${host}`) {
    return NextResponse.json({ error: "許可されていないリクエストです。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  const password = body?.password;
  if (typeof id !== "string" || id.trim() !== id || !/^[\w.-]{1,64}$/.test(id) ||
      typeof password !== "string" || password.length === 0 || password.length > 1024) {
    return NextResponse.json({ error: "IDとパスワードを入力してください。" }, { status: 400 });
  }

  let auth;
  try {
    auth = await getAuthStore().create(id, password);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return NextResponse.json({ error: "アカウントは既に作成されています。ログインしてください。" }, { status: 409 });
    }
    throw error;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, createSession(auth), {
    httpOnly: true,
    maxAge: SESSION_LIFETIME_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}