"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, LoaderCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
}: {
  account: AccountUsage;
  busy?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: (account: AccountUsage) => void;
  onMoveDown: (account: AccountUsage) => void;
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
          <svg
            role="img"
            aria-label="ChatGPT"
            className="size-6 shrink-0 text-foreground"
            viewBox="0 0 16 16"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z" />
          </svg>
          <div className="min-w-0">
            <span id={`account-${account.id}`} className="font-medium text-foreground">
              {account.displayName || account.email || "認証中のアカウント"}
            </span>
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
                disabled={busy || !canMoveUp}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                onSelect={() => onMoveUp(account)}
              >
                <ArrowUp className="size-4 shrink-0" aria-hidden="true" />
                上へ移動
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item
                disabled={busy || !canMoveDown}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                onSelect={() => onMoveDown(account)}
              >
                <ArrowDown className="size-4 shrink-0" aria-hidden="true" />
                下へ移動
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                onSelect={() => onRename(account)}
              >
                <Pencil className="size-4 shrink-0" aria-hidden="true" />
                ラベルを変更
              </DropdownMenuPrimitive.Item>
              {/* 一時的に非表示。再有効化するときはアクションを戻す。 */}
              {/*
              <DropdownMenuPrimitive.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                onSelect={() => onReauthenticate(account)}
              >
                <LogIn className="size-4 shrink-0" aria-hidden="true" />
                再ログイン
              </DropdownMenuPrimitive.Item>
              */}
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
