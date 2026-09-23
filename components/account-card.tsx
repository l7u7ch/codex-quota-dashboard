"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  if (remainingPercent < 20) return "bg-red-500";
  if (remainingPercent < 40) return "bg-amber-400";
  return "bg-foreground/75";
}

function remainingTextColor(remainingPercent: number) {
  if (remainingPercent < 20) return "text-red-400";
  if (remainingPercent < 40) return "text-amber-300";
  return "text-foreground";
}

export function AccountCard({ account }: { account: AccountUsage }) {
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
          <span id={`account-${account.id}`} className="font-medium text-foreground">
            {account.email ?? "認証中のアカウント"}
          </span>
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
                  <div className="flex items-baseline justify-between gap-4">
                    <p className={`text-2xl font-semibold tabular-nums tracking-tight ${remainingTextColor(window.remainingPercent)}`}>
                      {window.remainingPercent}<span className="ml-0.5 text-sm font-medium text-muted-foreground">%</span>
                    </p>
                    <p className="text-sm font-medium text-muted-foreground">
                      {formatTimeUntilReset(window.resetsAt, now)}
                    </p>
                  </div>
                  <Progress
                    value={window.remainingPercent}
                    className="h-1.5 rounded-none bg-muted"
                    indicatorClassName={remainingProgressColor(window.remainingPercent)}
                    aria-label={`${window.label} ${window.remainingPercent}% 残り`}
                  />
                  <p className="text-xs text-muted-foreground">
                    リセット {formatReset(window.resetsAt, window.windowDurationMins)}
                  </p>
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
    </tr>
  );
}
