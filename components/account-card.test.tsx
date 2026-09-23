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

  it.each([
    [80, "bg-green-500"],
    [60, "bg-green-500"],
    [40, "bg-yellow-500"],
    [20, "bg-orange-500"],
    [19, "bg-red-500"],
  ])("uses the expected indicator color at %i%% remaining", (remainingPercent, colorClass) => {
    const { container } = renderAccount({
      ...account,
      windows: [{ ...account.windows[0], remainingPercent }],
    });

    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveClass(colorClass);
  });

  it("right-aligns the percentage and time remaining", () => {
    const { container } = renderAccount();
    const quota = container.querySelector('[aria-label="5時間の使用制限 72% 残り"]');
    const timeRemaining = Array.from(container.querySelectorAll("p")).find((element) =>
      element.textContent?.startsWith("あと"),
    );
    const percentage = Array.from(container.querySelectorAll("p")).find((element) =>
      element.textContent === "72%",
    );

    expect(quota).not.toBeNull();
    expect(timeRemaining).not.toBeUndefined();
    expect(quota!.compareDocumentPosition(timeRemaining!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(percentage?.parentElement).toHaveClass("justify-end");
    expect(timeRemaining?.parentElement).toHaveClass("justify-between");
  });

  it("uses a restrained hierarchy for quota details", () => {
    const { container } = renderAccount();
    const percentage = Array.from(container.querySelectorAll("p")).find((element) =>
      element.textContent === "72%",
    );
    const reset = screen.getAllByText(/^リセット/)[0];
    const resetTime = reset.querySelector("span");
    const timeRemaining = Array.from(container.querySelectorAll("p")).find((element) =>
      element.textContent?.startsWith("あと"),
    );

    expect(percentage?.querySelector("span")).toHaveClass("text-foreground/70");
    expect(reset).toHaveClass("text-[13px]", "text-muted-foreground");
    expect(resetTime).toHaveClass("text-foreground/80");
    expect(timeRemaining).toHaveClass("text-[13px]", "text-foreground/80");
  });

  it("prompts for login when the account is signed out", () => {
    renderAccount({ ...account, status: "signed-out", email: null, planType: null, windows: [] });

    expect(screen.getByText("ログインが必要です")).toBeInTheDocument();
  });

  it("shows the time remaining until a usage window resets", () => {
    expect(formatTimeUntilReset(1_800_000_000, 1_799_999_700_000)).toBe("あと5分");
  });
});
