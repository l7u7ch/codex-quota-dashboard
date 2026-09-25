import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getAccountStore } from "@/lib/accounts/account-store";
import { loginManager } from "@/lib/accounts/login-manager";
import { getAuthStore } from "@/lib/auth/auth-store";
import { isValidSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!isValidSession(sessionToken, await getAuthStore().read())) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await context.params;
  const account = await getAccountStore().get(id);
  if (!account) {
    return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  }

  try {
    const login = await loginManager.begin(account, { persistOnComplete: false });
    return NextResponse.json({ accountId: id, ...login }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Codexのログインを開始できませんでした" },
      { status: 503 },
    );
  }
}
