import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { UsageHistoryStore, SAMPLE_INTERVAL_MS } from "@/lib/usage/history-store";

let directory: string | undefined;

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = undefined;
});

describe("UsageHistoryStore", () => {
  it("records at most one sample per interval and starts a new series when reset time changes", async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "codex-usage-history-"));
    const store = new UsageHistoryStore(path.join(directory, "usage-history.json"));
    const account = {
      id: "account-1",
      windows: [
        {
          id: "codex-primary",
          remainingPercent: 90,
          resetsAt: 1_800_000_000,
        },
      ],
    };

    await store.recordSnapshots([account], 1_700_000_000_000);
    await store.recordSnapshots(
      [{ ...account, windows: [{ ...account.windows[0], remainingPercent: 80 }] }],
      1_700_000_000_000 + SAMPLE_INTERVAL_MS - 1,
    );
    const afterTooSoon = await store.recordSnapshots(
      [{ ...account, windows: [{ ...account.windows[0], remainingPercent: 70 }] }],
      1_700_000_000_000 + SAMPLE_INTERVAL_MS,
    );

    expect(afterTooSoon["account-1"]["codex-primary"]).toEqual([
      {
        sampledAt: 1_700_000_000_000,
        usedPercent: 10,
        resetsAt: 1_800_000_000,
      },
      {
        sampledAt: 1_700_000_000_000 + SAMPLE_INTERVAL_MS,
        usedPercent: 30,
        resetsAt: 1_800_000_000,
      },
    ]);

    const afterReset = await store.recordSnapshots(
      [{ ...account, windows: [{ ...account.windows[0], resetsAt: 1_800_000_300, remainingPercent: 95 }] }],
      1_700_000_000_000 + SAMPLE_INTERVAL_MS + 1,
    );
    expect(afterReset["account-1"]["codex-primary"]).toHaveLength(3);
    expect(afterReset["account-1"]["codex-primary"][2]).toEqual({
      sampledAt: 1_700_000_000_000 + SAMPLE_INTERVAL_MS + 1,
      usedPercent: 5,
      resetsAt: 1_800_000_300,
    });
  });

  it("drops samples belonging to accounts that are no longer registered", async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "codex-usage-history-"));
    const store = new UsageHistoryStore(path.join(directory, "usage-history.json"));
    await store.recordSnapshots(
      [
        { id: "removed-account", windows: [{ id: "codex-primary", remainingPercent: 80, resetsAt: 1_800_000_000 }] },
        { id: "current-account", windows: [{ id: "codex-primary", remainingPercent: 80, resetsAt: 1_800_000_000 }] },
      ],
      1_700_000_000_000,
    );

    const current = await store.recordSnapshots(
      [{ id: "current-account", windows: [{ id: "codex-primary", remainingPercent: 75, resetsAt: 1_800_000_000 }] }],
      1_700_000_000_000 + SAMPLE_INTERVAL_MS,
    );

    expect(current).not.toHaveProperty("removed-account");
    expect(current).toHaveProperty("current-account");
  });
});
