import type { StoredAccount } from "@/lib/accounts/account-store";
import {
  CodexAppServerClient,
  type ChatGptAccount,
  type RateLimitsResponse,
} from "@/lib/codex/app-server-client";
import { toUsageWindows, type UsageWindow } from "@/lib/codex/rate-limits";

export type AccountUsage = {
  id: string;
  email: string | null;
  planType: string | null;
  status: "ready" | "signed-out" | "unavailable";
  windows: UsageWindow[];
  error?: string;
};

type UsageClient = {
  readAccount(): Promise<{
    account: ChatGptAccount | null;
    requiresOpenaiAuth: boolean;
  }>;
  readRateLimits(): Promise<RateLimitsResponse>;
  close(): void;
};

type ClientFactory = (codexHome: string) => Promise<UsageClient>;

export async function loadAccountUsage(
  account: StoredAccount,
  startClient: ClientFactory = CodexAppServerClient.start,
): Promise<AccountUsage> {
  let client: UsageClient | null = null;
  try {
    client = await startClient(account.codexHome);
    const auth = await client.readAccount();
    if (!auth.account || auth.account.type !== "chatgpt") {
      return {
        id: account.id,
        email: null,
        planType: null,
        status: "signed-out",
        windows: [],
      };
    }

    const response = await client.readRateLimits();
    const snapshot = response.rateLimitsByLimitId?.codex ?? response.rateLimits;
    return {
      id: account.id,
      email: auth.account.email,
      planType: auth.account.planType,
      status: "ready",
      windows: snapshot ? toUsageWindows(snapshot) : [],
    };
  } catch {
    return {
      id: account.id,
      email: null,
      planType: null,
      status: "unavailable",
      windows: [],
      error: "Codex App Serverに接続できません",
    };
  } finally {
    client?.close();
  }
}
