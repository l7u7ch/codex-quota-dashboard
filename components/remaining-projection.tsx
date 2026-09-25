import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ReactNode } from "react";
import type { UsageForecastWindow } from "@/lib/usage/types";

const MINUTE_MS = 60_000;
const HISTORY_WINDOW_MS = 60 * MINUTE_MS;
const OBSERVED_COLOR = "#38bdf8";

type ProjectionChartPoint = {
  sampledAt: number;
  observedRemainingPercent: number | null;
  forecastRemainingPercent: number | null;
};

type Props = { window: UsageForecastWindow; sampledAt: number };

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatElapsed(milliseconds: number) {
  const minutes = Math.max(1, Math.round(milliseconds / MINUTE_MS));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${minutes}分前`;
  return `${hours}時間${remainingMinutes ? `${remainingMinutes}分` : ""}前`;
}

function formatClock(timestamp: number) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date(timestamp));
}

export function RemainingProjection({ window, sampledAt }: Props) {
  const remaining = clampPercent(window.remainingPercent);
  const resetMs = window.resetsAt * 1_000;
  const hasFutureReset = resetMs > sampledAt;
  const forecast = window.forecast;
  const predicted = hasFutureReset && forecast.remainingAtResetPercent !== null;
  const endRemaining = clampPercent(forecast.remainingAtResetPercent ?? remaining);
  const isRisk = forecast.status === "at-risk" && forecast.minutesUntilDepletion !== null;
  const depletionAt = isRisk && forecast.minutesUntilDepletion !== null
    ? sampledAt + Math.max(0, forecast.minutesUntilDepletion) * MINUTE_MS
    : null;
  const depletesBeforeReset = predicted && depletionAt !== null && depletionAt < resetMs;
  const forecastColor = isRisk ? "var(--destructive)" : OBSERVED_COLOR;

  const observationsByTime = new Map<number, number>();
  for (const sample of window.samples) {
    if (
      sample.resetsAt === window.resetsAt &&
      sample.sampledAt >= sampledAt - HISTORY_WINDOW_MS &&
      sample.sampledAt <= sampledAt
    ) {
      observationsByTime.set(sample.sampledAt, clampPercent(100 - sample.usedPercent));
    }
  }

  const chartData: ProjectionChartPoint[] = [...observationsByTime]
    .sort(([left], [right]) => left - right)
    .map(([timestamp, observedRemainingPercent]) => ({
      sampledAt: timestamp,
      observedRemainingPercent,
      forecastRemainingPercent: null,
    }));
  const currentPoint = chartData.find((point) => point.sampledAt === sampledAt);
  if (currentPoint) {
    currentPoint.observedRemainingPercent = remaining;
    currentPoint.forecastRemainingPercent = predicted ? remaining : null;
  } else {
    chartData.push({
      sampledAt,
      observedRemainingPercent: remaining,
      forecastRemainingPercent: predicted ? remaining : null,
    });
  }

  if (predicted) {
    if (depletesBeforeReset && depletionAt !== null) {
      chartData.push({
        sampledAt: Math.max(sampledAt, depletionAt),
        observedRemainingPercent: null,
        forecastRemainingPercent: 0,
      });
      chartData.push({
        sampledAt: resetMs,
        observedRemainingPercent: null,
        forecastRemainingPercent: 0,
      });
    } else {
      chartData.push({
        sampledAt: resetMs,
        observedRemainingPercent: null,
        forecastRemainingPercent: endRemaining,
      });
    }
  }
  chartData.sort((left, right) => left.sampledAt - right.sampledAt);

  const chartEnd = Math.max(sampledAt, resetMs);
  const firstObservation = chartData.find((point) => point.observedRemainingPercent !== null)?.sampledAt;
  const chartStart = Math.min(firstObservation ?? sampledAt, chartEnd - MINUTE_MS);
  const tickValues = [...new Set([
    chartStart,
    sampledAt,
    ...(depletesBeforeReset && depletionAt !== null ? [depletionAt] : []),
    ...(hasFutureReset ? [resetMs] : []),
  ])].sort((left, right) => left - right);

  const formatAxisTick = (timestamp: number) => {
    if (timestamp === sampledAt) return "現在";
    if (hasFutureReset && timestamp === resetMs) return "リセット";
    if (depletesBeforeReset && timestamp === depletionAt) return "枯渇";
    if (timestamp === chartStart && timestamp < sampledAt) {
      return formatElapsed(sampledAt - timestamp);
    }
    return formatClock(timestamp);
  };

  const formatTooltipLabel = (value: ReactNode) => {
    const timestamp = Number(value);
    if (timestamp === sampledAt) return `現在（${formatClock(timestamp)}）`;
    if (depletesBeforeReset && timestamp === depletionAt) return `枯渇予測（${formatClock(timestamp)}）`;
    if (hasFutureReset && timestamp === resetMs) return `リセット予測（${formatClock(timestamp)}）`;
    return formatClock(timestamp);
  };

  const chartLabel = predicted
    ? `${window.label}の残量観測と予測`
    : `${window.label}の残量観測（予測未表示）`;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">予測残量の見通し</p>
      <div
        role="img"
        aria-label={chartLabel}
        className="h-56 w-full md:h-64"
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 720, height: 224 }}
        >
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 16, bottom: 4, left: 0 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="sampledAt"
              type="number"
              scale="time"
              domain={[chartStart, chartEnd]}
              ticks={tickValues}
              tickFormatter={formatAxisTick}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tickMargin={8}
              allowDataOverflow
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip
              labelFormatter={formatTooltipLabel}
              formatter={(value, name) => [`${Number(value)}%`, String(name)]}
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
              }}
              labelStyle={{ color: "var(--popover-foreground)" }}
              itemStyle={{ color: "var(--foreground)" }}
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              isAnimationActive={false}
            />
            {predicted ? (
              <ReferenceLine
                x={sampledAt}
                stroke="var(--muted-foreground)"
                strokeDasharray="2 4"
              />
            ) : null}
            {depletesBeforeReset && depletionAt !== null ? (
              <ReferenceLine
                x={depletionAt}
                stroke={forecastColor}
                strokeDasharray="2 3"
                label={{
                  value: "枯渇予測",
                  position: "insideTop",
                  fill: forecastColor,
                  fontSize: 11,
                }}
              />
            ) : null}
            <Area
              type="linear"
              dataKey="observedRemainingPercent"
              name="観測残量"
              stroke={OBSERVED_COLOR}
              strokeWidth={2}
              fill={OBSERVED_COLOR}
              fillOpacity={0.12}
              activeDot={{ r: 5 }}
              dot={{ r: 3, fill: OBSERVED_COLOR, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            {predicted ? (
              <Line
                type="linear"
                dataKey="forecastRemainingPercent"
                name="予測残量"
                stroke={forecastColor}
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 3, fill: forecastColor, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul aria-label="グラフ凡例" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="w-5 border-t-2 border-sky-400" />
          観測残量
        </li>
        {predicted ? (
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`w-5 border-t-2 border-dashed ${isRisk ? "border-destructive" : "border-sky-400"}`}
            />
            予測残量
          </li>
        ) : null}
      </ul>
      {predicted ? (
        <p className="text-xs text-muted-foreground">
          {isRisk ? "推定：リセット前に残量0%" : `推定：リセット時に残り${endRemaining}%`}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">予測に十分なデータが集まると破線を表示します。</p>
      )}
    </div>
  );
}
