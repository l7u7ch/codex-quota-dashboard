import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getAccountStore } from "@/lib/accounts/account-store";
import { loadAccountUsage } from "@/lib/accounts/account-usage";
import { getAuthStore } from "@/lib/auth/auth-store";
import { isValidSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { calculateUsageForecast, SAMPLE_WINDOW_MS } from "@/lib/usage/forecast";
import { getUsageHistoryStore, SAMPLE_INTERVAL_MS } from "@/lib/usage/history-store";
import type { UsageForecastResponse } from "@/lib/usage/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!isValidSession(sessionToken, await getAuthStore().read())) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const storedAccounts = await getAccountStore().list();
  const accounts = await Promise.all(
    storedAccounts.map((account) => loadAccountUsage(account)),
  );
  const sampledAt = Date.now();
  const history = await getUsageHistoryStore().recordSnapshots(
    accounts.map((account) => ({
      id: account.id,
      windows: account.windows.map((window) => ({
        id: window.id,
        remainingPercent: window.remainingPercent,
        resetsAt: window.resetsAt,
      })),
    })),
    sampledAt,
  );

  const response: UsageForecastResponse = {
    sampledAt,
    refreshIntervalMs: SAMPLE_INTERVAL_MS,
    accounts: accounts.map((account) => ({
      ...account,
      windows: account.windows.map((window) => {
        const storedSamples = (history[account.id]?.[window.id] ?? []).filter(
          (sample) =>
            sample.resetsAt === window.resetsAt &&
            sample.sampledAt >= sampledAt - SAMPLE_WINDOW_MS &&
            sample.sampledAt <= sampledAt,
        );
        const currentSample = {
          sampledAt,
          usedPercent: 100 - window.remainingPercent,
          resetsAt: window.resetsAt,
        };
        const samples = [
          ...storedSamples.filter((sample) => sample.sampledAt !== sampledAt),
          currentSample,
        ].sort((left, right) => left.sampledAt - right.sampledAt);

        return {
          ...window,
          samples,
          forecast: calculateUsageForecast({
            now: sampledAt,
            remainingPercent: window.remainingPercent,
            resetsAt: window.resetsAt,
            samples,
          }),
        };
      }),
    })),
  };

  return NextResponse.json(response);
}
