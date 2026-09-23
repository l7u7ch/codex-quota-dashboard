"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AccountCard } from "@/components/account-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AccountUsage } from "@/lib/accounts/account-usage";

type LoginPrompt = {
  accountId: string;
  loginId: string;
  verificationUrl: string;
  userCode: string;
};

export function Dashboard({
  initialAccounts,
}: {
  initialAccounts: AccountUsage[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [login, setLogin] = useState<LoginPrompt | null>(null);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      if (!response.ok) throw new Error("request failed");
      const body = (await response.json()) as { accounts: AccountUsage[] };
      setAccounts(body.accounts);
    } catch {
      if (!quiet) toast.error("利用状況を更新できませんでした");
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(true), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const discardLogin = useCallback(
    async (loginToDiscard: LoginPrompt) => {
      try {
        const response = await fetch(
          `/api/accounts/${loginToDiscard.accountId}/login/${loginToDiscard.loginId}`,
          { method: "DELETE" },
        );
        if (response.status === 409) await refresh(true);
      } catch {
        toast.error("未完了のアカウントを削除できませんでした");
      }
    },
    [refresh],
  );

  useEffect(() => {
    if (!login) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(
        `/api/accounts/${login.accountId}/login/${login.loginId}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const result = (await response.json()) as {
        status: "pending" | "complete" | "failed";
        error?: string;
      };
      if (result.status === "complete") {
        window.clearInterval(timer);
        toast.success("ChatGPTアカウントを追加しました");
        setDialogOpen(false);
        setLogin(null);
        await refresh(true);
      } else if (result.status === "failed") {
        window.clearInterval(timer);
        toast.error(result.error ?? "ログインに失敗しました");
        void discardLogin(login);
        setDialogOpen(false);
        setLogin(null);
      }
    }, 1_500);
    return () => window.clearInterval(timer);
  }, [discardLogin, login, refresh]);

  async function addAccount() {
    setLogin(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = (await response.json()) as LoginPrompt & {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error);
      setLogin(result);
      setDialogOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "アカウントを追加できませんでした",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between px-6 lg:px-10">
          <div className="flex items-baseline gap-3">
            <p className="text-sm font-semibold tracking-[0.16em]">
              Codex Quota Dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? "animate-spin" : ""} />
              更新
            </Button>
            <Button
              onClick={() => void addAccount()}
              disabled={submitting}
            >
              {submitting ? <LoaderCircle className="animate-spin" /> : <Plus />}
              アカウントを追加
            </Button>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open && login) {
                  void discardLogin(login);
                  setLogin(null);
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ChatGPTアカウントを追加</DialogTitle>
                  <DialogDescription>
                    認証情報はこのサーバー上のアカウント別プロファイルに保存されます。
                  </DialogDescription>
                </DialogHeader>
                {login ? (
                  <div className="space-y-5">
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <p className="mb-2 text-sm text-muted-foreground">
                        認証コード
                      </p>
                      <p className="font-mono text-2xl font-semibold tracking-widest">
                        {login.userCode}
                      </p>
                    </div>
                    <Button asChild className="w-full">
                      <a
                        href={login.verificationUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        OpenAIの認証ページを開く
                      </a>
                    </Button>
                    <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      ログイン完了を待っています
                    </p>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-[1500px] px-6 py-8 lg:px-10">
        {accounts.length ? (
          <div className="overflow-hidden rounded-md border border-border/80 bg-card/30">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <th
                      scope="col"
                      className="min-w-64 px-5 py-3 text-left font-medium"
                    >
                      Account
                    </th>
                    <th
                      scope="col"
                      className="min-w-64 px-5 py-3 text-left font-medium"
                    >
                      5時間枠
                    </th>
                    <th
                      scope="col"
                      className="min-w-64 px-5 py-3 text-left font-medium"
                    >
                      週間枠
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <p className="font-medium">アカウントがまだありません</p>
            <p className="mt-1 text-sm text-muted-foreground">
              アカウントを追加すると、Codexの利用枠がここに表示されます。
            </p>
          </div>
        )}
      </main>
    </>
  );
}
