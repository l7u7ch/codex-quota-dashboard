import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getAccountStore } from "@/lib/accounts/account-store";
import { loginManager } from "@/lib/accounts/login-manager";
import { getAuthStore } from "@/lib/auth/auth-store";
import { isValidSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthenticated() {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return isValidSession(sessionToken, await getAuthStore().read());
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body) || !("displayName" in body)) {
    return NextResponse.json({ error: "表示名を確認してください" }, { status: 400 });
  }

  const requestedName = (body as { displayName?: unknown }).displayName;
  if (requestedName !== null && typeof requestedName !== "string") {
    return NextResponse.json({ error: "表示名を確認してください" }, { status: 400 });
  }

  const displayName = typeof requestedName === "string" ? requestedName.trim() : "";
  if (displayName.length > 50) {
    return NextResponse.json({ error: "表示名は50文字以内で入力してください" }, { status: 400 });
  }

  const { id } = await context.params;
  const account = await getAccountStore().updateDisplayName(id, displayName || null);
  if (!account) {
    return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ displayName: account.displayName ?? null });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await context.params;
  const store = getAccountStore();
  if (!(await store.get(id))) {
    return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  }

  loginManager.cancelAccount(id);
  if (!(await store.remove(id))) {
    return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
