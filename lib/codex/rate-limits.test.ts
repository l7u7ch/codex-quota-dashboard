import { describe, expect, it } from "vitest";

import { toUsageWindows } from "@/lib/codex/rate-limits";

describe("toUsageWindows", () => {
  it("converts Codex used percentages into remaining quota cards", () => {
    const windows = toUsageWindows({
      limitId: "codex",
      limitName: null,
      primary: {
        usedPercent: 28,
        windowDurationMins: 300,
        resetsAt: 1_800_000_000,
      },
      secondary: {
        usedPercent: 59,
        windowDurationMins: 10_080,
        resetsAt: 1_800_345_600,
      },
      rateLimitReachedType: null,
    });

    expect(windows).toEqual([
      {
        id: "codex-primary",
        label: "5時間の使用制限",
        remainingPercent: 72,
        resetsAt: 1_800_000_000,
        windowDurationMins: 300,
      },
      {
        id: "codex-secondary",
        label: "週間利用上限",
        remainingPercent: 41,
        resetsAt: 1_800_345_600,
        windowDurationMins: 10_080,
      },
    ]);
  });

  it("clamps malformed percentages and omits unavailable windows", () => {
    const windows = toUsageWindows({
      limitId: "codex",
      limitName: null,
      primary: {
        usedPercent: 140,
        windowDurationMins: 60,
        resetsAt: 1_800_000_000,
      },
      secondary: null,
      rateLimitReachedType: null,
    });

    expect(windows).toEqual([
      {
        id: "codex-primary",
        label: "1時間の使用制限",
        remainingPercent: 0,
        resetsAt: 1_800_000_000,
        windowDurationMins: 60,
      },
    ]);
  });
});
