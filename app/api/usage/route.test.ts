import { afterEach, describe, expect, it, vi } from "vitest";

const {
  getAccountStoreMock,
  getAuthStoreMock,
  getUsageHistoryStoreMock,
  isValidSessionMock,
  loadAccountUsageMock,
} = vi.hoisted(() => ({
  getAccountStoreMock: vi.fn(),
  getAuthStoreMock: vi.fn(),
  getUsageHistoryStoreMock: vi.fn(),
  isValidSessionMock: vi.fn(),
  loadAccountUsageMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session" }) }),
}));
vi.mock("@/lib/accounts/account-store", () => ({ getAccountStore: getAccountStoreMock }));
vi.mock("@/lib/accounts/account-usage", () => ({ loadAccountUsage: loadAccountUsageMock }));
vi.mock("@/lib/auth/auth-store", () => ({ getAuthStore: getAuthStoreMock }));
vi.mock("@/lib/auth/session", () => ({
  isValidSession: isValidSessionMock,
  SESSION_COOKIE_NAME: "dashboard_session",
}));
vi.mock("@/lib/usage/history-store", () => ({
  getUsageHistoryStore: getUsageHistoryStoreMock,
  SAMPLE_INTERVAL_MS: 300_000,
}));

import { GET } from "@/app/api/usage/route";

const now = 1_800_000_000_000;
const resetsAt = (now + 60 * 60_000) / 1_000;
const usage = {
  id: "account-1",
  displayName: "Work",
  email: "work@example.com",
  planType: "plus",
  status: "ready" as const,
  windows: [
    {
      id: "codex-primary",
      label: "5時間の使用制限",
      remainingPercent: 70,
      resetsAt,
      windowDurationMins: 300,
    },
  ],
};

afterEach(() => vi.restoreAllMocks());

describe("GET /api/usage", () => {
  it("records current quota snapshots and returns per-window forecasts", async () => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    const account = { id: "account-1", codexHome: "/profiles/account-1" };
    const history = {
      "account-1": {
        "codex-primary": [
          { sampledAt: now - 20 * 60_000, usedPercent: 10, resetsAt },
          { sampledAt: now - 10 * 60_000, usedPercent: 20, resetsAt },
        ],
      },
    };
    const historyStore = { recordSnapshots: vi.fn().mockResolvedValue(history) };
    getAuthStoreMock.mockReturnValue({ read: vi.fn().mockResolvedValue({}) });
    isValidSessionMock.mockReturnValue(true);
    getAccountStoreMock.mockReturnValue({ list: vi.fn().mockResolvedValue([account]) });
    loadAccountUsageMock.mockResolvedValue(usage);
    getUsageHistoryStoreMock.mockReturnValue(historyStore);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(historyStore.recordSnapshots).toHaveBeenCalledWith(
      [
        {
          id: "account-1",
          windows: [{ id: "codex-primary", remainingPercent: 70, resetsAt }],
        },
      ],
      now,
    );
    expect(await response.json()).toMatchObject({
      sampledAt: now,
      refreshIntervalMs: 300_000,
      accounts: [
        {
          id: "account-1",
          windows: [
            {
              id: "codex-primary",
              samples: [
                { sampledAt: now - 20 * 60_000, usedPercent: 10, resetsAt },
                { sampledAt: now - 10 * 60_000, usedPercent: 20, resetsAt },
                { sampledAt: now, usedPercent: 30, resetsAt },
              ],
              forecast: {
                status: "on-track",
                consumptionPercentPerHour: 60,
                minutesUntilDepletion: 70,
                remainingAtResetPercent: 10,
              },
            },
          ],
        },
      ],
    });
  });

  it("requires a valid dashboard session before reading account profiles", async () => {
    const list = vi.fn();
    getAuthStoreMock.mockReturnValue({ read: vi.fn().mockResolvedValue({}) });
    isValidSessionMock.mockReturnValue(false);
    getAccountStoreMock.mockReturnValue({ list });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "認証が必要です" });
    expect(list).not.toHaveBeenCalled();
  });
});
