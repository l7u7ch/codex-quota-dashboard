"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RemainingProjection } from "@/components/remaining-projection";
import type { UsageForecastAccount, UsageForecastResponse, UsageForecastWindow } from "@/lib/usage/types";
import type { UsageForecastStatus, UsageSample } from "@/lib/usage/forecast";

const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1_000;

const forecastPresentation: Record<UsageForecastStatus, { label: string; className: string }> = {
  "at-risk": {
    label: "リセット前に上限到達の可能性",
    className: "border-destructive/50 bg-destructive/10 text-destructive",
  },
  "on-track": {
    label: "今のペースならリセット前に余裕あり",
    className: "border-green-500/40 bg-green-500/10 text-green-300",
  },
  steady: {
    label: "直近では利用増加を観測していません",
    className: "border-border bg-muted/50 text-muted-foreground",
  },
  collecting: {
    label: "予測材料不足",
    className: "border-border bg-muted/50 text-muted-foreground",
  },
  depleted: {
    label: "利用枠を使い切っています",
    className: "border-destructive/50 bg-destructive/10 text-destructive",
  },
  "reset-due": {
    label: "利用枠のリセット時刻を過ぎています",
    className: "border-border bg-muted/50 text-muted-foreground",
  },
};

function formatPercent(value: number) {
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 }).format(value);
}

function formatDuration(minutes: number) {
  const roundedMinutes = Math.max(0, Math.round(minutes));
  const days = Math.floor(roundedMinutes / (24 * 60));
  const hours = Math.floor((roundedMinutes % (24 * 60)) / 60);
  const remainingMinutes = roundedMinutes % 60;
  const parts = [
    days ? `${days}日` : "",
    hours ? `${hours}時間` : "",
    remainingMinutes ? `${remainingMinutes}分` : "",
  ].filter(Boolean);
  return parts.length ? parts.join("") : "1分未満";
}

function formatSampledAt(sampledAt: number) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(sampledAt));
}

function UsageTrend({ label, samples }: { label: string; samples: UsageSample[] }) {
  const points = samples.slice(-13);
  if (points.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        推移グラフは複数回の観測後に表示します。
      </p>
    );
  }

  const firstAt = points[0].sampledAt;
  const duration = Math.max(1, points[points.length - 1].sampledAt - firstAt);
  const polyline = points
    .map((point) => {
      const x = ((point.sampledAt - firstAt) / duration) * 100;
      const y = 38 - (point.usedPercent / 100) * 34;
      return `${x},${y}`;
    })
    .join(" ");
  const lastPoint = points[points.length - 1];
  const lastX = ((lastPoint.sampledAt - firstAt) / duration) * 100;
  const lastY = 38 - (lastPoint.usedPercent / 100) * 34;

  return (
    <div className="space-y-1">
      <svg
        role="img"
        aria-label={`${label}の使用率推移`}
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-14 w-full overflow-visible text-sky-400"
      >
        <line x1="0" y1="4" x2="100" y2="4" stroke="currentColor" strokeOpacity="0.12" />
        <line x1="0" y1="21" x2="100" y2="21" stroke="currentColor" strokeOpacity="0.12" />
        <line x1="0" y1="38" x2="100" y2="38" stroke="currentColor" strokeOpacity="0.12" />
        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lastX} cy={lastY} r="1.8" fill="currentColor" />
      </svg>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{formatDuration((points[points.length - 1].sampledAt - firstAt) / 60_000)}前</span>
        <span>現在</span>
      </div>
    </div>
  );
}

function WindowForecast({ window, sampledAt }: { window: UsageForecastWindow; sampledAt: number }) {
  const presentation = forecastPresentation[window.forecast.status];
  const resetMinutes = (window.resetsAt * 1_000 - sampledAt) / 60_000;
  const minutesUntilPrediction = Math.max(0, 10 - window.forecast.observedMinutes);

  return (
    <section className="grid gap-5 rounded-lg border border-border/70 bg-muted/10 p-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)]">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium">{window.label}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              リセットまで {formatDuration(resetMinutes)}
            </p>
          </div>
          <p className="shrink-0 text-right text-2xl font-semibold tabular-nums">
            {window.remainingPercent}%
            <span className="ml-1 text-xs font-normal text-muted-foreground">残り</span>
          </p>
        </div>
        <Progress
          value={window.remainingPercent}
          className="h-2 bg-muted"
          indicatorClassName="bg-sky-500"
          aria-label={`${window.label} ${window.remainingPercent}% 残り`}
        />
        <div className="space-y-1">
          <Badge variant="outline" className={presentation.className}>
            {presentation.label}
          </Badge>
          <ForecastDetails window={window} minutesUntilPrediction={minutesUntilPrediction} />
        </div>
      </div>
      <div className="space-y-4 border-t border-border/60 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <RemainingProjection window={window} sampledAt={sampledAt} />
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-xs font-medium text-muted-foreground">観測された使用率</p>
          <UsageTrend label={window.label} samples={window.samples} />
        </div>
      </div>
    </section>
  );
}

function ForecastDetails({
  window,
  minutesUntilPrediction,
}: {
  window: UsageForecastWindow;
  minutesUntilPrediction: number;
}) {
  const forecast = window.forecast;
  if (forecast.status === "collecting") {
    return (
      <p className="text-sm text-muted-foreground">
        {minutesUntilPrediction > 0
          ? `あと約${minutesUntilPrediction}分、最低10分の観測が必要です。`
          : "観測データが不安定なため、予測を保留しています。"}
      </p>
    );
  }
  if (forecast.status === "reset-due") {
    return <p className="text-sm text-muted-foreground">次の利用状況取得で予測を更新します。</p>;
  }
  if (forecast.status === "depleted") {
    return <p className="text-sm text-muted-foreground">利用状況を更新して、リセット後の残量をご確認ください。</p>;
  }
  if (forecast.status === "steady") {
    return (
      <p className="text-sm text-muted-foreground">
        {forecast.remainingAtResetPercent}%程度の残量でリセットを迎える見込みです。
      </p>
    );
  }

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>
        消費ペース <span className="font-medium text-foreground">{formatPercent(forecast.consumptionPercentPerHour ?? 0)}%/時間</span>
      </p>
      {forecast.minutesUntilDepletion !== null ? (
        <p>
          上限到達まで推定あと <span className="font-medium text-foreground">{formatDuration(forecast.minutesUntilDepletion)}</span>
        </p>
      ) : null}
      <p>
        リセット時予測残量 <span className="font-medium text-foreground">{forecast.remainingAtResetPercent}%</span>
      </p>
    </div>
  );
}

function AccountForecast({ account, sampledAt }: { account: UsageForecastAccount; sampledAt: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-lg font-semibold">
            {account.displayName || account.email || "認証中のアカウント"}
          </h2>
          <CardDescription>
            {account.email && account.displayName ? account.email : "Codex利用枠の推移"}
          </CardDescription>
        </div>
        {account.planType ? <Badge variant="secondary">{account.planType}</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {account.status === "ready" ? (
          account.windows.length ? (
            account.windows.map((window) => (
              <WindowForecast key={window.id} window={window} sampledAt={sampledAt} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">利用枠の情報がありません。</p>
          )
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="size-4" aria-hidden="true" />
            {account.status === "signed-out"
              ? "ログインが必要です"
              : account.error ?? "利用状況を取得できません"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function UsageDashboard() {
  const [data, setData] = useState<UsageForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    try {
      const response = await fetch("/api/usage", { cache: "no-store" });
      if (!response.ok) throw new Error("Usage request failed");
      const result = (await response.json()) as UsageForecastResponse;
      setData(result);
      setRefreshError(false);
    } catch {
      setRefreshError(true);
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initialRefresh);
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(
      () => void refresh(),
      data?.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [data?.refreshIntervalMs, refresh]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-7 px-5 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Codex Usage
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">利用ペース予測</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            直近の利用率から、リセット前に利用枠へ到達する可能性を推定します。
          </p>
          <Link href="/" className="inline-block text-sm text-foreground underline underline-offset-4">
            アカウント管理に戻る
          </Link>
        </div>
        <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {refreshing ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              利用状況を更新中
            </span>
          ) : data ? (
            <span>表示中は5分ごとに更新・最終取得 {formatSampledAt(data.sampledAt)}</span>
          ) : (
            <span>5分ごとに更新</span>
          )}
        </div>
      </header>

      {refreshError ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          利用状況を取得できませんでした。次回の自動更新で再試行します。
        </div>
      ) : null}

      <section aria-label="アカウント別の利用予測" className="space-y-4">
        {loading && !data ? (
          <p className="py-12 text-center text-sm text-muted-foreground">利用状況を取得しています…</p>
        ) : data?.accounts.length ? (
          data.accounts.map((account) => (
            <AccountForecast key={account.id} account={account} sampledAt={data.sampledAt} />
          ))
        ) : data ? (
          <div className="rounded-lg border border-dashed px-6 py-12 text-center">
            <p className="font-medium">予測対象のアカウントがありません</p>
            <p className="mt-1 text-sm text-muted-foreground">登録済みアカウントがあると利用ペースを表示します。</p>
          </div>
        ) : null}
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        予測は直近1時間の利用率の傾向に基づく目安です。十分な観測データが集まるまでは予測を表示しません。
      </p>
    </main>
  );
}
