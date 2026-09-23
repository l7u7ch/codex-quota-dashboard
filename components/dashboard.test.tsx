import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dashboard } from "@/components/dashboard";

const accounts = [
  {
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
    ],
  },
];

describe("Dashboard", () => {
  it("shows all registered accounts and account controls", () => {
    render(<Dashboard initialAccounts={accounts} />);

    expect(screen.getByRole("button", { name: "アカウントを追加" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更新" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "5時間枠" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "週間枠" })).toBeInTheDocument();
    expect(screen.getByText("me@example.com")).toBeInTheDocument();
    expect(screen.getByText("1 accounts")).toBeInTheDocument();
  });
});
