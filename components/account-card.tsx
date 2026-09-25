"use client";

import { useEffect, useState } from "react";
import { AlertCircle, LoaderCircle, LogIn, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AccountUsage } from "@/lib/accounts/account-usage";

function formatReset(resetsAt: number, durationMins: number) {
  const date = new Date(resetsAt * 1000);
  if (durationMins <= 24 * 60) {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatTimeUntilReset(resetsAt: number, now: number) {
  const remainingMins = Math.ceil((resetsAt * 1000 - now) / 60_000);
  if (remainingMins <= 0) return "リセット済み";

  const days = Math.floor(remainingMins / (24 * 60));
  const hours = Math.floor((remainingMins % (24 * 60)) / 60);
  const minutes = remainingMins % 60;
  const parts = [days ? `${days}日` : "", hours ? `${hours}時間` : "", minutes ? `${minutes}分` : ""].filter(Boolean);

  return `あと${parts.join("")}`;
}

function remainingProgressColor(remainingPercent: number) {
  if (remainingPercent >= 60) return "bg-green-500";
  if (remainingPercent >= 40) return "bg-yellow-500";
  if (remainingPercent >= 20) return "bg-orange-500";
  return "bg-red-500";
}

export function AccountCard({
  account,
  busy = false,
  onRename,
  onReauthenticate,
  onDelete,
}: {
  account: AccountUsage;
  busy?: boolean;
  onRename: (account: AccountUsage) => void;
  onReauthenticate: (account: AccountUsage) => void;
  onDelete: (account: AccountUsage) => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const windowsByDuration = [...account.windows].sort(
    (left, right) => left.windowDurationMins - right.windowDurationMins,
  );

  return (
    <tr className="border-b border-border/70 last:border-0">
      <th scope="row" className="w-[28%] min-w-64 px-5 py-6 text-left align-middle font-normal">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <span id={`account-${account.id}`} className="font-medium text-foreground">
              {account.displayName || account.email || "認証中のアカウント"}
            </span>
            {account.displayName && account.email ? (
              <p className="mt-1 text-xs text-muted-foreground">{account.email}</p>
            ) : null}
          </div>
          {account.planType ? (
            <Badge variant="secondary" className="h-5 rounded-sm px-1.5 text-[10px] uppercase tracking-wider">
              {account.planType}
            </Badge>
          ) : null}
        </div>
      </th>

      {account.status === "ready" ? (
        [0, 1].map((index) => {
          const window = windowsByDuration[index];
          return (
            <td key={window?.id ?? index} className="min-w-64 px-5 py-6 align-middle">
              {window ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-end">
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {window.remainingPercent}<span className="ml-0.5 text-sm font-medium text-foreground/70">%</span>
                    </p>
                  </div>
                  <Progress
                    value={window.remainingPercent}
                    className="h-1.5 rounded-none bg-muted"
                    indicatorClassName={remainingProgressColor(window.remainingPercent)}
                    aria-label={`${window.label} ${window.remainingPercent}% 残り`}
                  />
                  {window.remainingPercent === 100 ? (
                    <p className="text-[13px] text-muted-foreground">未使用</p>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] text-muted-foreground">
                        リセット{" "}
                        <span className="font-medium text-foreground/80">
                          {formatReset(window.resetsAt, window.windowDurationMins)}
                        </span>
                      </p>
                      <p className="shrink-0 text-[13px] font-medium text-foreground/80">
                        {formatTimeUntilReset(window.resetsAt, now)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </td>
          );
        })
      ) : (
        <td colSpan={2} className="px-5 py-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4" aria-hidden="true" />
            {account.status === "signed-out"
              ? "ログインが必要です"
              : account.error ?? "利用状況を取得できません"}
          </span>
        </td>
      )}

      <td className="px-3 py-6 text-right align-middle">
        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${account.displayName || account.email || "ChatGPTアカウント"}の操作`}
              disabled={busy}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <MoreHorizontal />}
            </Button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              align="end"
              className="z-50 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            >
              <DropdownMenuPrimitive.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                onSelect={() => onRename(account)}
              >
                <Pencil className="size-4 shrink-0" aria-hidden="true" />
                表示名を変更
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                onSelect={() => onReauthenticate(account)}
              >
                <LogIn className="size-4 shrink-0" aria-hidden="true" />
                再ログイン
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none focus:bg-accent focus:text-destructive"
                onSelect={() => onDelete(account)}
              >
                <Trash2 className="size-4 shrink-0" aria-hidden="true" />
                削除
              </DropdownMenuPrimitive.Item>
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
      </td>
    </tr>
  );
}
