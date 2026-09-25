import type { AccountUsage } from "@/lib/accounts/account-usage";
import type { UsageForecast, UsageSample } from "@/lib/usage/forecast";

export type UsageForecastWindow = AccountUsage["windows"][number] & {
  samples: UsageSample[];
  forecast: UsageForecast;
};

export type UsageForecastAccount = Omit<AccountUsage, "windows"> & {
  windows: UsageForecastWindow[];
};

export type UsageForecastResponse = {
  sampledAt: number;
  refreshIntervalMs: number;
  accounts: UsageForecastAccount[];
};
