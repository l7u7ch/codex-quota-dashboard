import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RemainingProjection } from "@/components/remaining-projection";
import type { UsageForecastWindow } from "@/lib/usage/types";

const sampledAt = 1_800_000_000_000;
const baseWindow: UsageForecastWindow = {
  id: "codex-primary",
  label: "5時間の使用制限",
  remainingPercent: 40,
  resetsAt: (sampledAt + 60 * 60_000) / 1_000,
  windowDurationMins: 300,
  samples: [],
  forecast: {
    status: "at-risk",
    sampleCount: 3,
    observedMinutes: 20,
    consumptionPercentPerHour: 80,
    minutesUntilDepletion: 30,
    remainingAtResetPercent: 0,
  },
};

afterEach(() => cleanup());

describe("RemainingProjection", () => {
  it("combines observed remaining and its forecast on one time axis", () => {
    render(<RemainingProjection
      window={{
        ...baseWindow,
        samples: [
          { sampledAt: sampledAt - 20 * 60_000, usedPercent: 10, resetsAt: baseWindow.resetsAt },
          { sampledAt: sampledAt - 10 * 60_000, usedPercent: 20, resetsAt: baseWindow.resetsAt },
          { sampledAt, usedPercent: 60, resetsAt: baseWindow.resetsAt },
        ],
      }}
      sampledAt={sampledAt}
    />);

    const chart = screen.getByRole("img", { name: "5時間の使用制限の残量観測と予測" });
    expect(chart).toBeInTheDocument();
    expect(chart.querySelector(".recharts-area-curve")).toBeInTheDocument();
    expect(chart.querySelector(".recharts-line-curve")).toBeInTheDocument();
    expect(screen.getByText("観測残量")).toBeInTheDocument();
    expect(screen.getByText("予測残量")).toBeInTheDocument();
    expect(screen.getByText("枯渇予測")).toBeInTheDocument();
  });

  it("shows depletion halfway to reset instead of at reset", () => {
    render(<RemainingProjection window={baseWindow} sampledAt={sampledAt} />);

    expect(screen.getByRole("img", { name: "5時間の使用制限の残量観測と予測" })).toBeInTheDocument();
    expect(screen.getByText("枯渇予測")).toBeInTheDocument();
    expect(screen.getByText("推定：リセット前に残量0%")).toBeInTheDocument();
  });

  it("omits the extrapolation when the forecast is still collecting", () => {
    render(<RemainingProjection
      window={{ ...baseWindow, forecast: {
        ...baseWindow.forecast,
        status: "collecting",
        minutesUntilDepletion: null,
        remainingAtResetPercent: null,
      } }}
      sampledAt={sampledAt}
    />);
    expect(screen.queryByText("予測残量")).not.toBeInTheDocument();
    expect(screen.getByText("予測に十分なデータが集まると破線を表示します。")).toBeInTheDocument();
  });
});
