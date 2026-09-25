import { cleanup, render, screen } from "@testing-library/react";
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("UsageDashboard", () => {
  it("links back to account management", async () => {
    stubUsageResponse({ accounts: [] });
    render(<UsageDashboard />);

    expect(await screen.findByRole("link", { name: "アカウント管理に戻る" })).toHaveAttribute("href", "/");
  });

  it("shows per-account forecasts with observations in the combined chart", async () => {
    stubUsageResponse();
    render(<UsageDashboard />);

    expect(await screen.findByRole("heading", { name: "Work" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "利用ペース予測" })).toBeInTheDocument();
    expect(screen.getByText("今のペースならリセット前に余裕あり")).toBeInTheDocument();
    expect(screen.getByText("リセットまで 1時間")).toBeInTheDocument();
    expect(screen.getByText("60%/時間")).toBeInTheDocument();
    expect(screen.getByText("リセット時予測残量")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "5時間の使用制限の残量観測と予測" })).toBeInTheDocument();
    expect(screen.getByText("観測残量")).toBeInTheDocument();
  });

  it("prioritizes the forecast projection over account details", async () => {
    stubUsageResponse();
    render(<UsageDashboard />);

    const projection = await screen.findByRole("img", {
      name: "5時間の使用制限の残量観測と予測",
    });
    expect(projection).toBeInTheDocument();
    expect(projection).toHaveClass("h-56", "md:h-64");
    expect(screen.getByText("予測残量の見通し")).toBeInTheDocument();
    expect(screen.getByText("観測残量")).toBeInTheDocument();
    expect(screen.getByText("予測残量")).toBeInTheDocument();
    expect(screen.queryByText("観測された使用率")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "5時間の使用制限の使用率推移" })).not.toBeInTheDocument();
    expect(
      projection.compareDocumentPosition(
        screen.getByRole("heading", { name: "5時間の使用制限" }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
