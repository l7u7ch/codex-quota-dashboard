import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getAccountStore } from "@/lib/accounts/account-store";
import { loadAccountUsage } from "@/lib/accounts/account-usage";
import { loginManager } from "@/lib/accounts/login-manager";
import { getAuthStore } from "@/lib/auth/auth-store";
import { isValidSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET() {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!isValidSession(sessionToken, await getAuthStore().read())) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const store = getAccountStore();
  const storedAccounts = await store.list();
  const usage = await Promise.all(storedAccounts.map((account) => loadAccountUsage(account)));
  return NextResponse.json({ accounts: usage });
}

export async function PATCH(request: Request) {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!isValidSession(sessionToken, await getAuthStore().read())) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "アカウントの順序を確認してください" }, { status: 400 });
  }

  const accountIds = (body as { accountIds?: unknown }).accountIds;
  if (
    !Array.isArray(accountIds) ||
    !accountIds.every((id) => typeof id === "string" && id.length > 0)
  ) {
    return NextResponse.json({ error: "アカウントの順序を確認してください" }, { status: 400 });
  }

  const orderedAccounts = await getAccountStore().reorder(accountIds);
  if (!orderedAccounts) {
    return NextResponse.json({ error: "アカウント一覧が更新されています。再読み込みしてください" }, { status: 409 });
  }

  return NextResponse.json({ accountIds: orderedAccounts.map((account) => account.id) });
}

export async function POST(request: Request) {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!isValidSession(sessionToken, await getAuthStore().read())) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  await request.json().catch(() => null);
  const store = getAccountStore();
  let account: Awaited<ReturnType<typeof store.createPending>> | null = null;

  try {
    account = await store.createPending();
    const login = await loginManager.begin(account);
    return NextResponse.json({ accountId: account.id, ...login }, { status: 201 });
  } catch {
    if (account) await store.discardPending(account);
    return NextResponse.json(
      { error: "Codexのログインを開始できませんでした" },
      { status: 503 },
    );
  }
}
