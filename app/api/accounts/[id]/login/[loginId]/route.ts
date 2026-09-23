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
  const state = loginManager.status(id, loginId);
  if (!state) {
    return NextResponse.json({ error: "ログイン処理が見つかりません" }, { status: 404 });
  }
  if (state.status === "complete") {
    const account = loginManager.getAccount(id, loginId);
    if (!account) {
      return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
    }
    await getAccountStore().persist(account);
  }
  return NextResponse.json(state);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; loginId: string }> },
) {
  const { id, loginId } = await context.params;
  const store = getAccountStore();
  const account = loginManager.getAccount(id, loginId);

  const result = loginManager.discard(id, loginId);
  if (result === "complete") {
    return NextResponse.json({ error: "ログインは完了しています" }, { status: 409 });
  }
  if (result === "missing") {
    return NextResponse.json({ error: "ログイン処理が見つかりません" }, { status: 404 });
  }

  if (!account) {
    return NextResponse.json({ error: "ログイン処理が見つかりません" }, { status: 404 });
  }
  await store.discardPending(account);
  return new NextResponse(null, { status: 204 });
}
