import type { UsageForecastWindow } from "@/lib/usage/types";

type Props = { window: UsageForecastWindow; sampledAt: number };

export function RemainingProjection({ window, sampledAt }: Props) {
  const remaining = Math.max(0, Math.min(100, window.remainingPercent));
  const resetMs = window.resetsAt * 1_000;
  const durationMs = resetMs - sampledAt;
  const forecast = window.forecast;
  const predicted = durationMs > 0 && forecast.remainingAtResetPercent !== null;
  const endRemaining = Math.max(0, Math.min(100, forecast.remainingAtResetPercent ?? remaining));
  const x = (fraction: number) => 34 + 270 * Math.max(0, Math.min(1, fraction));
  const y = (percent: number) => 112 - 100 * Math.max(0, Math.min(100, percent)) / 100;
  const isRisk = forecast.status === "at-risk" && forecast.minutesUntilDepletion !== null;
  const depletionFraction = isRisk && durationMs > 0
    ? Math.max(0, Math.min(1, forecast.minutesUntilDepletion! * 60_000 / durationMs))
    : 1;
  const lineEndX = x(depletionFraction);
  const lineEndY = y(isRisk ? 0 : endRemaining);
  const color = isRisk ? "text-destructive" : "text-sky-400";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">予測残量の見通し</p>
      <svg
        role="img"
        aria-label={`${window.label}の残量予測`}
        viewBox="0 0 320 136"
        className={`h-36 w-full ${color}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{predicted
          ? `現在${remaining}%、リセット時の予測残量${endRemaining}%${isRisk ? "、リセット前に残量が尽きる見込み" : ""}`
          : `現在${remaining}%、予測はまだ表示できません`}</title>
        <line x1="34" y1="12" x2="304" y2="12" stroke="currentColor" strokeOpacity="0.12" />
        <line x1="34" y1="112" x2="304" y2="112" stroke="currentColor" strokeOpacity="0.4" />
        <text x="2" y="16" fill="currentColor" fontSize="11">100%</text>
        <text x="12" y="116" fill="currentColor" fontSize="11">0%</text>
        <circle cx="34" cy={y(remaining)} r="4" fill="currentColor" />
        {predicted ? (
          <>
            <line
              data-testid="projection-line"
              x1="34" y1={y(remaining)} x2={lineEndX} y2={lineEndY}
              stroke="currentColor" strokeWidth="2" strokeDasharray="5 4"
            />
            {isRisk && depletionFraction < 1 ? (
              <line x1={lineEndX} y1="112" x2="304" y2="112" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" />
            ) : null}
            <circle cx={lineEndX} cy={lineEndY} r="3" fill="currentColor" />
          </>
        ) : null}
        <text x="34" y="132" fill="currentColor" fontSize="11">現在</text>
        <text x="304" y="132" textAnchor="end" fill="currentColor" fontSize="11">リセット</text>
      </svg>
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
