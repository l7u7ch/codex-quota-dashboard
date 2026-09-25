import { describe, expect, it } from "vitest";

import { calculateUsageForecast } from "@/lib/usage/forecast";

const minute = 60_000;
const now = 1_800_000_000_000;

function sample(minutesAgo: number, usedPercent: number, resetsInMinutes = 60) {
  return {
    sampledAt: now - minutesAgo * minute,
    usedPercent,
    resetsAt: Math.floor((now + resetsInMinutes * minute) / 1_000),
  };
}

describe("calculateUsageForecast", () => {
  it("predicts remaining usage at reset when the observed pace stays below the limit", () => {
    const result = calculateUsageForecast({
      now,
      remainingPercent: 70,
      resetsAt: sample(0, 30).resetsAt,
      samples: [sample(20, 10), sample(10, 20)],
    });

    expect(result).toMatchObject({
      status: "on-track",
      sampleCount: 3,
      consumptionPercentPerHour: 60,
      minutesUntilDepletion: 70,
      remainingAtResetPercent: 10,
    });
  });

  it("warns when the observed pace would exhaust the window before reset", () => {
    const result = calculateUsageForecast({
      now,
      remainingPercent: 30,
      resetsAt: sample(0, 70, 30).resetsAt,
      samples: [sample(20, 10, 30), sample(10, 40, 30)],
    });

    expect(result).toMatchObject({
      status: "at-risk",
      consumptionPercentPerHour: 180,
      minutesUntilDepletion: 10,
      remainingAtResetPercent: 0,
    });
  });

  it("does not forecast before it has enough observations spanning ten minutes", () => {
    const result = calculateUsageForecast({
      now,
      remainingPercent: 70,
      resetsAt: sample(0, 30).resetsAt,
      samples: [sample(5, 20)],
    });

    expect(result.status).toBe("collecting");
    expect(result.consumptionPercentPerHour).toBeNull();
  });

  it("ignores samples from a previous reset cycle", () => {
    const current = sample(0, 30);
    const result = calculateUsageForecast({
      now,
      remainingPercent: 70,
      resetsAt: current.resetsAt,
      samples: [
        { ...sample(30, 90), resetsAt: current.resetsAt - 3_600 },
        sample(10, 20),
      ],
    });

    expect(result.status).toBe("collecting");
    expect(result.sampleCount).toBe(2);
  });

  it("reports no observed consumption for a flat usage window", () => {
    const result = calculateUsageForecast({
      now,
      remainingPercent: 80,
      resetsAt: sample(0, 20).resetsAt,
      samples: [sample(20, 20), sample(10, 20)],
    });

    expect(result.status).toBe("steady");
    expect(result.consumptionPercentPerHour).toBe(0);
    expect(result.remainingAtResetPercent).toBe(80);
  });

  it("withholds predictions when recent usage is too volatile for a reliable trend", () => {
    const current = sample(0, 80);
    const result = calculateUsageForecast({
      now,
      remainingPercent: 20,
      resetsAt: current.resetsAt,
      samples: [sample(15, 10), sample(10, 70), sample(5, 70)],
    });

    expect(result.status).toBe("collecting");
    expect(result.consumptionPercentPerHour).toBeNull();
    expect(result.remainingAtResetPercent).toBeNull();
  });
});
