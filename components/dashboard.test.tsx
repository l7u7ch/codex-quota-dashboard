import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dashboard } from "@/components/dashboard";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

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
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    replaceMock.mockReset();
  });

  it("shows all registered accounts and account controls without a summary footer", () => {
    render(<Dashboard initialAccounts={accounts} />);

    expect(screen.getByRole("button", { name: "アカウントを追加" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更新" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "5時間枠" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "週間枠" })).toBeInTheDocument();
    expect(screen.getByText("me@example.com")).toBeInTheDocument();
    expect(screen.getByRole("table").parentElement?.parentElement).toHaveClass("rounded-md");
    expect(screen.queryByText(/accounts$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/low capacity/i)).not.toBeInTheDocument();
  });

  it("logs out from the header and returns to the login page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<Dashboard initialAccounts={accounts} />);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/logout", { method: "POST" });
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });

  it("starts login directly when adding an account", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accountId: "account-2",
        loginId: "login-2",
        verificationUrl: "https://auth.openai.com/device",
        userCode: "ABCD-1234",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Dashboard initialAccounts={accounts} />);
    fireEvent.click(screen.getByRole("button", { name: "アカウントを追加" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
    });

    expect(await screen.findByText("認証コード")).toBeInTheDocument();
    expect(screen.getByText("ABCD-1234")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ログインを開始" }),
    ).not.toBeInTheDocument();
  });

  it("discards the pending account when the login dialog is closed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accountId: "account-2",
          loginId: "login-2",
          verificationUrl: "https://auth.openai.com/device",
          userCode: "ABCD-1234",
        }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<Dashboard initialAccounts={accounts} />);
    fireEvent.click(screen.getByRole("button", { name: "アカウントを追加" }));
    await screen.findByText("認証コード");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/accounts/account-2/login/login-2",
        { method: "DELETE" },
      );
    });
  });

  it("discards the pending account when login fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accountId: "account-2",
          loginId: "login-2",
          verificationUrl: "https://auth.openai.com/device",
          userCode: "ABCD-1234",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "failed", error: "ログインに失敗しました" }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<Dashboard initialAccounts={accounts} />);
    fireEvent.click(screen.getByRole("button", { name: "アカウントを追加" }));
    await screen.findByText("認証コード");
    await new Promise((resolve) => window.setTimeout(resolve, 1_600));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/accounts/account-2/login/login-2",
      { method: "DELETE" },
    );
  });
});
