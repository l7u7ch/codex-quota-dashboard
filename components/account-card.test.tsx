import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountCard } from "@/components/account-card";

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

  it("prompts for login when the account is signed out", () => {
    render(
      <AccountCard
        account={{ ...account, status: "signed-out", email: null, planType: null, windows: [] }}
      />,
    );

    expect(screen.getByText("ログインが必要です")).toBeInTheDocument();
  });
});
