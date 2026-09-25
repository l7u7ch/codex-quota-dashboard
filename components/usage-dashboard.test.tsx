import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UsageDashboard } from "@/components/usage-dashboard";

const sampledAt = 1_800_000_000_000;
const resetsAt = (sampledAt + 60 * 60_000) / 1_000;

function stubUsageResponse(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sampledAt,
        refreshIntervalMs: 300_000,
        accounts: [
          {
            id: "account-1",
            displayName: "Work",
            email: "work@example.com",
            planType: "plus",
            status: "ready",
            windows: [
              {
                id: "codex-primary",
                label: "5時間の使用制限",
                remainingPercent: 70,
                resetsAt,
                windowDurationMins: 300,
                samples: [
                  { sampledAt: sampledAt - 20 * 60_000, usedPercent: 10, resetsAt },
                  { sampledAt: sampledAt - 10 * 60_000, usedPercent: 20, resetsAt },
                  { sampledAt, usedPercent: 30, resetsAt },
                ],
                forecast: {
                  status: "on-track",
                  sampleCount: 3,
                  observedMinutes: 20,
                  consumptionPercentPerHour: 60,
                  minutesUntilDepletion: 70,
                  remainingAtResetPercent: 10,
                },
              },
            ],
          },
        ],
        ...overrides,
      }),
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("UsageDashboard", () => {
  it("shows per-account depletion forecasts and usage history", async () => {
    stubUsageResponse();
    render(<UsageDashboard />);

    expect(await screen.findByRole("heading", { name: "利用ペース予測" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Work" })).toBeInTheDocument();
    expect(screen.getByText("今のペースならリセット前に余裕あり")).toBeInTheDocument();
    expect(screen.getByText("リセットまで 1時間")).toBeInTheDocument();
    expect(screen.getByText("60%/時間")).toBeInTheDocument();
    expect(screen.getByText("リセット時予測残量")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "5時間の使用制限の使用率推移" })).toBeInTheDocument();
    expect(screen.getByText("20分前")).toBeInTheDocument();
  });

  it("shows the current-to-reset remaining forecast beside the observed trend", async () => {
    stubUsageResponse();
    render(<UsageDashboard />);

    const projection = await screen.findByRole("img", {
      name: "5時間の使用制限の残量予測",
    });
    expect(projection).toBeInTheDocument();
    expect(screen.getByText("予測残量の見通し")).toBeInTheDocument();
    expect(screen.getByText("観測された使用率")).toBeInTheDocument();
    expect(projection.querySelector('[data-testid="projection-line"]')).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "5時間の使用制限の使用率推移" })).toBeInTheDocument();
  });

  it("says it is still collecting observations instead of implying a forecast", async () => {
    stubUsageResponse();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sampledAt,
        refreshIntervalMs: 300_000,
        accounts: [
          {
            id: "account-1",
            displayName: "Work",
            email: "work@example.com",
            planType: "plus",
            status: "ready",
            windows: [
              {
                id: "codex-primary",
                label: "5時間の使用制限",
                remainingPercent: 90,
                resetsAt,
                windowDurationMins: 300,
                samples: [{ sampledAt, usedPercent: 10, resetsAt }],
                forecast: {
                  status: "collecting",
                  sampleCount: 1,
                  observedMinutes: 0,
                  consumptionPercentPerHour: null,
                  minutesUntilDepletion: null,
                  remainingAtResetPercent: null,
                },
              },
            ],
          },
        ],
      }),
    } as Response);

    render(<UsageDashboard />);

    expect(await screen.findByText("予測材料不足")).toBeInTheDocument();
    expect(screen.getByText(/最低10分の観測が必要/)).toBeInTheDocument();
  });

  it("keeps the page usable when there are no registered accounts", async () => {
    stubUsageResponse({ accounts: [] });
    render(<UsageDashboard />);

    expect(await screen.findByText("予測対象のアカウントがありません")).toBeInTheDocument();
  });
});
