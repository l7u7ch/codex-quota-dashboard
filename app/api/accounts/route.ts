import { NextResponse } from "next/server";

import { getAccountStore } from "@/lib/accounts/account-store";
import { loadAccountUsage } from "@/lib/accounts/account-usage";
import { loginManager } from "@/lib/accounts/login-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET() {
  const storedAccounts = await getAccountStore().list();
  const accounts = await Promise.all(storedAccounts.map((account) => loadAccountUsage(account)));
  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  await request.json().catch(() => null);
  const store = getAccountStore();
  let account: Awaited<ReturnType<typeof store.create>> | null = null;

  try {
    account = await store.create();
    const login = await loginManager.begin(account);
    return NextResponse.json({ accountId: account.id, ...login }, { status: 201 });
  } catch {
    if (account) await store.remove(account.id);
    return NextResponse.json(
      { error: "Codexのログインを開始できませんでした" },
      { status: 503 },
    );
  }
}
