import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountCard, formatTimeUntilReset } from "@/components/account-card";

const account = {
  id: "account-1",
  email: "me@example.com",
  planType: "plus",
  status: "ready" as const,
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

describe("AccountCard", () => {
  it("renders the official-style remaining quota for one account", () => {
    render(<AccountCard account={account} />);

    expect(screen.getByText("me@example.com")).toBeInTheDocument();
    expect(screen.getByText("5時間の使用制限")).toBeInTheDocument();
    expect(screen.getByText("週間利用上限")).toBeInTheDocument();
    expect(screen.getByText("72% 残り")).toBeInTheDocument();
    expect(screen.getByText("41% 残り")).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  it("uses a blue progress indicator when 80% or more quota remains", () => {
    const { container } = render(
      <AccountCard
        account={{
          ...account,
          windows: [{ ...account.windows[0], remainingPercent: 80 }],
        }}
      />,
    );

    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveClass("bg-blue-500");
  });

  it.each([
    [60, "bg-green-500"],
    [40, "bg-yellow-500"],
    [20, "bg-orange-500"],
    [19, "bg-red-500"],
  ])("uses the expected indicator color at %i%% remaining", (remainingPercent, colorClass) => {
    const { container } = render(
      <AccountCard
        account={{
          ...account,
          windows: [{ ...account.windows[0], remainingPercent }],
        }}
      />,
    );

    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveClass(colorClass);
  });

  it("prompts for login when the account is signed out", () => {
    render(
      <AccountCard
        account={{ ...account, status: "signed-out", email: null, planType: null, windows: [] }}
      />,
    );

    expect(screen.getByText("ログインが必要です")).toBeInTheDocument();
  });

  it("shows the time remaining until a usage window resets", () => {
    expect(formatTimeUntilReset(1_800_000_000, 1_799_999_700_000)).toBe("あと5分");
  });
});
