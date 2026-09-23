import { NextResponse } from "next/server";

import { getAccountStore } from "@/lib/accounts/account-store";
import { loadAccountUsage } from "@/lib/accounts/account-usage";
import { loginManager } from "@/lib/accounts/login-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET() {
  const store = getAccountStore();
  const storedAccounts = await store.list();
  const usage = await Promise.all(storedAccounts.map((account) => loadAccountUsage(account)));
  const abandonedIds = usage
    .filter((account) => account.status === "signed-out")
    .map((account) => account.id);
  await Promise.all(abandonedIds.map((id) => store.remove(id)));
  return NextResponse.json({
    accounts: usage.filter((account) => !abandonedIds.includes(account.id)),
  });
}

export async function POST(request: Request) {
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
