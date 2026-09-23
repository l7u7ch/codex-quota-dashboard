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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; loginId: string }> },
) {
  const { id, loginId } = await context.params;
  const store = getAccountStore();
  const account = await store.get(id);
  if (!account) {
    return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  }

  const result = loginManager.discard(id, loginId);
  if (result === "complete") {
    return NextResponse.json({ error: "ログインは完了しています" }, { status: 409 });
  }
  if (result === "missing") {
    return NextResponse.json({ error: "ログイン処理が見つかりません" }, { status: 404 });
  }

  await store.remove(id);
  return new NextResponse(null, { status: 204 });
}
