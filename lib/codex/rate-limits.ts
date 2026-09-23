export type RateLimitWindow = {
  usedPercent: number;
  windowDurationMins: number;
  resetsAt: number;
};

export type RateLimitSnapshot = {
  limitId: string;
  limitName: string | null;
  primary: RateLimitWindow | null;
  secondary: RateLimitWindow | null;
  rateLimitReachedType: string | null;
};

export type UsageWindow = {
  id: string;
  label: string;
  remainingPercent: number;
  resetsAt: number;
  windowDurationMins: number;
};

function windowLabel(durationMins: number) {
  if (durationMins === 10_080) return "週間利用上限";
  if (durationMins % 60 === 0) {
    return `${durationMins / 60}時間の使用制限`;
  }
  return `${durationMins}分の使用制限`;
}

function toWindow(
  limitId: string,
  kind: "primary" | "secondary",
  window: RateLimitWindow | null,
): UsageWindow | null {
  if (!window) return null;

  return {
    id: `${limitId}-${kind}`,
    label: windowLabel(window.windowDurationMins),
    remainingPercent: Math.max(0, Math.min(100, 100 - window.usedPercent)),
    resetsAt: window.resetsAt,
    windowDurationMins: window.windowDurationMins,
  };
}

export function toUsageWindows(snapshot: RateLimitSnapshot): UsageWindow[] {
  return [
    toWindow(snapshot.limitId, "primary", snapshot.primary),
    toWindow(snapshot.limitId, "secondary", snapshot.secondary),
  ].filter((window): window is UsageWindow => window !== null);
}
