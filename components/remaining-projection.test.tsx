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
  it("shows depletion halfway to reset instead of at reset", () => {
    const { container } = render(<RemainingProjection window={baseWindow} sampledAt={sampledAt} />);
    const line = container.querySelector('[data-testid="projection-line"]');
    expect(line).toHaveAttribute("x2", "169");
    expect(line).toHaveAttribute("y2", "112");
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
    expect(screen.queryByTestId("projection-line")).not.toBeInTheDocument();
    expect(screen.getByText("予測に十分なデータが集まると破線を表示します。")).toBeInTheDocument();
  });
});
