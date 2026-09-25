export type UsageSample = {
  sampledAt: number;
  usedPercent: number;
  resetsAt: number;
};

export type UsageForecastStatus =
  | "collecting"
  | "steady"
  | "on-track"
  | "at-risk"
  | "depleted"
  | "reset-due";

export type UsageForecast = {
  status: UsageForecastStatus;
  sampleCount: number;
  observedMinutes: number;
  consumptionPercentPerHour: number | null;
  minutesUntilDepletion: number | null;
  remainingAtResetPercent: number | null;
};

const SAMPLE_WINDOW_MS = 60 * 60 * 1_000;
const MIN_SAMPLE_COUNT = 3;
const MIN_OBSERVATION_MS = 10 * 60 * 1_000;
const MAX_TREND_RESIDUAL_PERCENT = 10;

function emptyForecast(
  status: UsageForecastStatus,
  sampleCount = 0,
  observedMinutes = 0,
): UsageForecast {
  return {
    status,
    sampleCount,
    observedMinutes,
    consumptionPercentPerHour: null,
    minutesUntilDepletion: null,
    remainingAtResetPercent: null,
  };
}

export function calculateUsageForecast({
  now = Date.now(),
  remainingPercent,
  resetsAt,
  samples,
}: {
  now?: number;
  remainingPercent: number;
  resetsAt: number;
  samples: UsageSample[];
}): UsageForecast {
  if (remainingPercent <= 0) return emptyForecast("depleted");
  const resetTime = resetsAt * 1_000;
  if (resetTime <= now) return emptyForecast("reset-due");

  const pointsByTime = new Map<number, UsageSample>();
  for (const sample of samples) {
    if (
      sample.resetsAt === resetsAt &&
      sample.sampledAt <= now &&
      sample.sampledAt >= now - SAMPLE_WINDOW_MS
    ) {
      pointsByTime.set(sample.sampledAt, sample);
    }
  }
  pointsByTime.set(now, {
    sampledAt: now,
    usedPercent: 100 - remainingPercent,
    resetsAt,
  });

  let points = [...pointsByTime.values()].sort(
    (left, right) => left.sampledAt - right.sampledAt,
  );

  // If the backend corrects usage downward within one reset cycle, only use
  // observations after the latest correction rather than forecasting from it.
  let startIndex = 0;
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].usedPercent < points[index - 1].usedPercent) {
      startIndex = index;
    }
  }
  points = points.slice(startIndex);

  const observedMs = points.length
    ? points[points.length - 1].sampledAt - points[0].sampledAt
    : 0;
  const observedMinutes = Math.max(0, Math.round(observedMs / 60_000));
  if (points.length < MIN_SAMPLE_COUNT || observedMs < MIN_OBSERVATION_MS) {
    return emptyForecast("collecting", points.length, observedMinutes);
  }

  const firstSampledAt = points[0].sampledAt;
  const xValues = points.map((point) => (point.sampledAt - firstSampledAt) / 3_600_000);
  const yValues = points.map((point) => point.usedPercent);
  const meanX = xValues.reduce((total, value) => total + value, 0) / xValues.length;
  const meanY = yValues.reduce((total, value) => total + value, 0) / yValues.length;
  const variance = xValues.reduce(
    (total, value) => total + (value - meanX) ** 2,
    0,
  );
  if (variance === 0) return emptyForecast("collecting", points.length, observedMinutes);

  const covariance = xValues.reduce(
    (total, value, index) => total + (value - meanX) * (yValues[index] - meanY),
    0,
  );
  const consumptionPercentPerHour = Math.max(0, covariance / variance);
  const trendResidualPercent = Math.sqrt(
    xValues.reduce((total, value, index) => {
      const predicted = meanY + consumptionPercentPerHour * (value - meanX);
      return total + (yValues[index] - predicted) ** 2;
    }, 0) / xValues.length,
  );
  if (trendResidualPercent > MAX_TREND_RESIDUAL_PERCENT) {
    return emptyForecast("collecting", points.length, observedMinutes);
  }

  if (consumptionPercentPerHour === 0) {
    return {
      status: "steady",
      sampleCount: points.length,
      observedMinutes,
      consumptionPercentPerHour: 0,
      minutesUntilDepletion: null,
      remainingAtResetPercent: remainingPercent,
    };
  }

  const minutesUntilDepletion = Math.round(
    (remainingPercent / consumptionPercentPerHour) * 60,
  );
  const minutesUntilReset = (resetTime - now) / 60_000;
  const remainingAtResetPercent = Math.max(
    0,
    Math.round(remainingPercent - consumptionPercentPerHour * (minutesUntilReset / 60)),
  );

  return {
    status: minutesUntilDepletion <= minutesUntilReset ? "at-risk" : "on-track",
    sampleCount: points.length,
    observedMinutes,
    consumptionPercentPerHour,
    minutesUntilDepletion,
    remainingAtResetPercent,
  };
}
