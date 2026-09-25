import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import { LoginManager } from "@/lib/accounts/login-manager";
import type { StoredAccount } from "@/lib/accounts/account-store";

const account: StoredAccount = {
  id: "account-1",
  codexHome: "/profiles/account-1",
  createdAt: "2026-09-23T00:00:00.000Z",
};

describe("LoginManager", () => {
  it("starts device-code login and records successful completion", async () => {
    const connection = new EventEmitter();
    const close = vi.fn();
    const manager = new LoginManager(async () => ({
      connection,
      startDeviceLogin: async () => ({
        type: "chatgptDeviceCode" as const,
        loginId: "login-1",
        verificationUrl: "https://auth.openai.com/codex/device",
        userCode: "ABCD-1234",
      }),
      close,
    }));

    const started = await manager.begin(account);
    expect(started.userCode).toBe("ABCD-1234");
    expect(manager.status(account.id, "login-1")).toEqual({ status: "pending" });

    connection.emit("account/login/completed", {
      loginId: "login-1",
      success: true,
      error: null,
    });

    expect(manager.status(account.id, "login-1")).toEqual({ status: "complete" });
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not expose provider login errors", async () => {
    const connection = new EventEmitter();
    const manager = new LoginManager(async () => ({
      connection,
      startDeviceLogin: async () => ({
        type: "chatgptDeviceCode" as const,
        loginId: "login-2",
        verificationUrl: "https://auth.openai.com/codex/device",
        userCode: "WXYZ-9876",
      }),
      close: vi.fn(),
    }));

    await manager.begin(account);
    connection.emit("account/login/completed", {
      loginId: "login-2",
      success: false,
      error: "secret provider detail",
    });

    expect(manager.status(account.id, "login-2")).toEqual({
      status: "failed",
      error: "ChatGPTへのログインに失敗しました",
    });
  });

  it("cancels a pending device login and closes its client", async () => {
    const connection = new EventEmitter();
    const close = vi.fn();
    const manager = new LoginManager(async () => ({
      connection,
      startDeviceLogin: async () => ({
        type: "chatgptDeviceCode" as const,
        loginId: "login-3",
        verificationUrl: "https://auth.openai.com/codex/device",
        userCode: "CANCEL-01",
      }),
      close,
    }));

    await manager.begin(account);

    expect(manager.discard(account.id, "login-3")).toBe("discarded");
    expect(manager.status(account.id, "login-3")).toBeNull();
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not mark reauthentication as a new account and cancels its session", async () => {
    const connection = new EventEmitter();
    const close = vi.fn();
    const manager = new LoginManager(async () => ({
      connection,
      startDeviceLogin: async () => ({
        type: "chatgptDeviceCode" as const,
        loginId: "reauth-1",
        verificationUrl: "https://auth.openai.com/codex/device",
        userCode: "REAUTH-12",
      }),
      close,
    }));

    await manager.begin(account, { persistOnComplete: false });

    expect(manager.shouldPersist(account.id, "reauth-1")).toBe(false);
    manager.cancelAccount(account.id);
    expect(manager.status(account.id, "reauth-1")).toBeNull();
    expect(close).toHaveBeenCalledOnce();
  });
});
