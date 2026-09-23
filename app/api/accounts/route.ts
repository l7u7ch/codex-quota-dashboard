import { NextResponse } from "next/server";
import { z } from "zod";

import { getAccountStore } from "@/lib/accounts/account-store";
import { loadAccountUsage } from "@/lib/accounts/account-usage";
import { loginManager } from "@/lib/accounts/login-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createAccountSchema = z.object({
  label: z.string().trim().min(1, "アカウント名を入力してください").max(80),
});

export async function GET() {
  const storedAccounts = await getAccountStore().list();
  const accounts = await Promise.all(storedAccounts.map((account) => loadAccountUsage(account)));
  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const parsed = createAccountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" },
      { status: 400 },
    );
  }

  try {
    const account = await getAccountStore().create(parsed.data.label);
    const login = await loginManager.begin(account);
    return NextResponse.json({ accountId: account.id, ...login }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Codexのログインを開始できませんでした" },
      { status: 503 },
    );
  }
}
