import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountCard, formatTimeUntilReset } from "@/components/account-card";
import type { AccountUsage } from "@/lib/accounts/account-usage";

const account: AccountUsage = {
  id: "account-1",
  email: "me@example.com",
  planType: "plus",
  status: "ready",
  windows: [
    {
      id: "codex-primary",
      label: "5時間の使用制限",
      remainingPercent: 72,
      resetsAt: 1_800_000_000,
      windowDurationMins: 300,
    },
    {
      id: "codex-secondary",
      label: "週間利用上限",
      remainingPercent: 41,
      resetsAt: 1_800_345_600,
      windowDurationMins: 10_080,
    },
  ],
};

function renderAccount(accountOverride: AccountUsage = account) {
  return render(<table><tbody><AccountCard account={accountOverride} /></tbody></table>);
}

describe("AccountCard", () => {
  it("renders one account as a quota matrix row", () => {
    renderAccount();

    expect(screen.getByText("me@example.com")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "5時間の使用制限 72% 残り" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "週間利用上限 41% 残り" })).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("41")).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  it("uses a neutral progress indicator for healthy quota", () => {
    const { container } = renderAccount({
      ...account,
      windows: [{ ...account.windows[0], remainingPercent: 80 }],
    });

    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveClass("bg-foreground/75");
  });

  it.each([
    [40, "bg-foreground/75"],
    [39, "bg-amber-400"],
    [20, "bg-amber-400"],
    [19, "bg-red-500"],
  ])("uses the expected indicator color at %i%% remaining", (remainingPercent, colorClass) => {
    const { container } = renderAccount({
      ...account,
      windows: [{ ...account.windows[0], remainingPercent }],
    });

    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveClass(colorClass);
  });

  it("prompts for login when the account is signed out", () => {
    renderAccount({ ...account, status: "signed-out", email: null, planType: null, windows: [] });

    expect(screen.getByText("ログインが必要です")).toBeInTheDocument();
  });

  it("shows the time remaining until a usage window resets", () => {
    expect(formatTimeUntilReset(1_800_000_000, 1_799_999_700_000)).toBe("あと5分");
  });
});
