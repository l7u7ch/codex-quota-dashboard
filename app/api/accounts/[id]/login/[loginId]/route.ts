import { NextResponse } from "next/server";

import { getAccountStore } from "@/lib/accounts/account-store";
import { loginManager } from "@/lib/accounts/login-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; loginId: string }> },
) {
  const { id, loginId } = await context.params;
  const account = await getAccountStore().get(id);
  if (!account) {
    return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  }

  const state = loginManager.status(id, loginId);
  if (!state) {
    return NextResponse.json({ error: "ログイン処理が見つかりません" }, { status: 404 });
  }
  return NextResponse.json(state);
}
