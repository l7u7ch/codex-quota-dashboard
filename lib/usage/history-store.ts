import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { UsageSample } from "@/lib/usage/forecast";

export const SAMPLE_INTERVAL_MS = 5 * 60 * 1_000;
export const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

export type UsageWindowSnapshot = {
  id: string;
  remainingPercent: number;
  resetsAt: number;
};

export type AccountUsageSnapshot = {
  id: string;
  windows: UsageWindowSnapshot[];
};

export type UsageHistory = Record<string, Record<string, UsageSample[]>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUsageSample(value: unknown): value is UsageSample {
  return (
    isRecord(value) &&
    typeof value.sampledAt === "number" &&
    Number.isFinite(value.sampledAt) &&
    typeof value.usedPercent === "number" &&
    Number.isFinite(value.usedPercent) &&
    typeof value.resetsAt === "number" &&
    Number.isFinite(value.resetsAt)
  );
}

function isUsageHistory(value: unknown): value is UsageHistory {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (accountHistory) =>
        isRecord(accountHistory) &&
        Object.values(accountHistory).every(
          (samples) => Array.isArray(samples) && samples.every(isUsageSample),
        ),
    )
  );
}

export class UsageHistoryStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async recordSnapshots(
    accounts: AccountUsageSnapshot[],
    sampledAt: number,
  ): Promise<UsageHistory> {
    let result: UsageHistory = {};
    const operation = this.queue.then(async () => {
      const history = await this.readHistory();
      const registeredAccountIds = new Set(accounts.map((account) => account.id));
      let changed = false;

      for (const accountId of Object.keys(history)) {
        if (!registeredAccountIds.has(accountId)) {
          delete history[accountId];
          changed = true;
        }
      }

      const retentionCutoff = sampledAt - HISTORY_RETENTION_MS;
      for (const account of accounts) {
        const accountHistory = (history[account.id] ??= {});
        for (const window of account.windows) {
          const samples = (accountHistory[window.id] ??= []).filter(
            (sample) => sample.sampledAt >= retentionCutoff,
          );
          accountHistory[window.id] = samples;

          const latest = samples[samples.length - 1];
          const resetChanged = latest && latest.resetsAt !== window.resetsAt;
          const intervalElapsed =
            !latest || sampledAt - latest.sampledAt >= SAMPLE_INTERVAL_MS;
          if (
            sampledAt > (latest?.sampledAt ?? Number.NEGATIVE_INFINITY) &&
            (resetChanged || intervalElapsed)
          ) {
            samples.push({
              sampledAt,
              usedPercent: Math.max(0, Math.min(100, 100 - window.remainingPercent)),
              resetsAt: window.resetsAt,
            });
            changed = true;
          }
        }

        for (const windowId of Object.keys(accountHistory)) {
          const samples = accountHistory[windowId];
          const retainedSamples = samples.filter(
            (sample) => sample.sampledAt >= retentionCutoff,
          );
          if (retainedSamples.length !== samples.length) changed = true;
          accountHistory[windowId] = retainedSamples;
          if (retainedSamples.length === 0) delete accountHistory[windowId];
        }
        if (Object.keys(accountHistory).length === 0) delete history[account.id];
      }

      if (changed) await this.writeHistory(history);
      result = history;
    });
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    await operation;
    return result;
  }

  private async readHistory(): Promise<UsageHistory> {
    let contents: string;
    try {
      contents = await readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }

    const parsed: unknown = JSON.parse(contents);
    if (!isUsageHistory(parsed)) throw new Error("Usage history file is invalid");
    return parsed;
  }

  private async writeHistory(history: UsageHistory) {
    await mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const temporaryFile = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryFile, `${JSON.stringify(history, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
      await rename(temporaryFile, this.filePath);
    } finally {
      await rm(temporaryFile, { force: true }).catch(() => undefined);
    }
  }
}

let usageHistoryStore: UsageHistoryStore | null = null;

export function getUsageHistoryStore() {
  usageHistoryStore ??= new UsageHistoryStore(
    path.join(process.cwd(), "data", "usage-history.json"),
  );
  return usageHistoryStore;
}
