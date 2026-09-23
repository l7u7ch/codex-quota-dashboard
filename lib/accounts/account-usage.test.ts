import { describe, expect, it, vi } from "vitest";

import { loadAccountUsage } from "@/lib/accounts/account-usage";
import type { StoredAccount } from "@/lib/accounts/account-store";

const storedAccount: StoredAccount = {
  id: "account-1",
  codexHome: "/profiles/account-1",
  createdAt: "2026-09-23T00:00:00.000Z",
};

describe("loadAccountUsage", () => {
  it("returns signed-in account details and quota windows", async () => {
    const close = vi.fn();
    const result = await loadAccountUsage(storedAccount, async () => ({
      readAccount: async () => ({
        account: { type: "chatgpt" as const, email: "me@example.com", planType: "plus" },
        requiresOpenaiAuth: true,
      }),
      readRateLimits: async () => ({
        rateLimits: {
          limitId: "codex",
          limitName: null,
          primary: { usedPercent: 28, windowDurationMins: 300, resetsAt: 1_800_000_000 },
          secondary: { usedPercent: 59, windowDurationMins: 10_080, resetsAt: 1_800_345_600 },
          rateLimitReachedType: null,
        },
      }),
      close,
    }));

    expect(result.status).toBe("ready");
    expect(result.email).toBe("me@example.com");
    expect(result.planType).toBe("plus");
    expect(result.windows.map((window) => window.remainingPercent)).toEqual([72, 41]);
    expect(close).toHaveBeenCalledOnce();
  });

  it("marks an account as signed out when Codex has no ChatGPT session", async () => {
    const close = vi.fn();
    const result = await loadAccountUsage(storedAccount, async () => ({
      readAccount: async () => ({ account: null, requiresOpenaiAuth: true }),
      readRateLimits: async () => ({ rateLimits: null }),
      close,
    }));

    expect(result.status).toBe("signed-out");
    expect(result.windows).toEqual([]);
    expect(close).toHaveBeenCalledOnce();
  });

  it("returns an unavailable state when the local Codex service fails", async () => {
    const result = await loadAccountUsage(storedAccount, async () => {
      throw new Error("spawn failed with secret path");
    });

    expect(result.status).toBe("unavailable");
    expect(result.error).toBe("Codex App Serverに接続できません");
  });
});
