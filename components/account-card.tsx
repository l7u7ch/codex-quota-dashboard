"use client";

import { useEffect, useState } from "react";
import { AlertCircle, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  if (remainingPercent >= 80) return "bg-blue-500";
  if (remainingPercent >= 60) return "bg-green-500";
  if (remainingPercent >= 40) return "bg-yellow-500";
  if (remainingPercent >= 20) return "bg-orange-500";
  return "bg-red-500";
}

export function AccountCard({ account }: { account: AccountUsage }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="space-y-4" aria-labelledby={`account-${account.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-4" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 id={`account-${account.id}`} className="font-semibold">
              {account.email ?? "認証中のアカウント"}
            </h2>
            {account.planType ? (
              <Badge variant="secondary" className="uppercase">
                {account.planType}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {account.status === "ready" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {account.windows.map((window) => (
            <Card key={window.id} className="border-border/70 bg-card shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {window.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-2xl font-semibold tracking-tight">
                  {window.remainingPercent}% 残り
                </p>
                <Progress
                  value={window.remainingPercent}
                  indicatorClassName={remainingProgressColor(window.remainingPercent)}
                  aria-label={`${window.label} ${window.remainingPercent}% 残り`}
                />
                <p className="text-sm text-muted-foreground">
                  リセット: {formatReset(window.resetsAt, window.windowDurationMins)}（{formatTimeUntilReset(window.resetsAt, now)}）
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-card/60 shadow-none">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <AlertCircle className="size-5" aria-hidden="true" />
            <span>
              {account.status === "signed-out"
                ? "ログインが必要です"
                : account.error ?? "利用状況を取得できません"}
            </span>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
