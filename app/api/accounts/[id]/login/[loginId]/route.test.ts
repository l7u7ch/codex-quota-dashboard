import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAccountStoreMock,
  getAuthStoreMock,
  isValidSessionMock,
  statusMock,
  getAccountMock,
  shouldPersistMock,
  discardMock,
} = vi.hoisted(() => ({
  getAccountStoreMock: vi.fn(),
  getAuthStoreMock: vi.fn(),
  isValidSessionMock: vi.fn(),
  statusMock: vi.fn(),
  getAccountMock: vi.fn(),
  shouldPersistMock: vi.fn(),
  discardMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session" }) }),
}));
vi.mock("@/lib/accounts/account-store", () => ({ getAccountStore: getAccountStoreMock }));
vi.mock("@/lib/accounts/login-manager", () => ({
  loginManager: {
    status: statusMock,
    getAccount: getAccountMock,
    shouldPersist: shouldPersistMock,
    discard: discardMock,
  },
}));
vi.mock("@/lib/auth/auth-store", () => ({ getAuthStore: getAuthStoreMock }));
vi.mock("@/lib/auth/session", () => ({
  isValidSession: isValidSessionMock,
  SESSION_COOKIE_NAME: "dashboard_session",
}));

import { DELETE, GET } from "@/app/api/accounts/[id]/login/[loginId]/route";

const account = {
  id: "account-1",
  codexHome: "/profiles/account-1",
  createdAt: "2026-09-23T00:00:00.000Z",
};
const context = { params: Promise.resolve({ id: account.id, loginId: "login-1" }) };
const store = {
  get: vi.fn(),
  persist: vi.fn(),
  discardPending: vi.fn(),
};

describe("/api/accounts/[id]/login/[loginId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthStoreMock.mockReturnValue({ read: vi.fn().mockResolvedValue({}) });
    isValidSessionMock.mockReturnValue(true);
    getAccountStoreMock.mockReturnValue(store);
    store.get.mockResolvedValue(account);
    store.persist.mockResolvedValue(undefined);
    store.discardPending.mockResolvedValue(undefined);
    getAccountMock.mockReturnValue(account);
    statusMock.mockReturnValue({ status: "pending" });
    shouldPersistMock.mockReturnValue(false);
    discardMock.mockReturnValue("discarded");
  });

  it("cancels reauthentication without removing a registered account's profile", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/accounts/account-1/login/login-1", { method: "DELETE" }),
      context,
    );

    expect(response.status).toBe(204);
    expect(store.get).toHaveBeenCalledWith("account-1");
    expect(store.discardPending).not.toHaveBeenCalled();
  });

  it("removes the profile when cancelling an unregistered pending account", async () => {
    store.get.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/accounts/account-1/login/login-1", { method: "DELETE" }),
      context,
    );

    expect(response.status).toBe(204);
    expect(store.discardPending).toHaveBeenCalledWith(account);
  });

  it("does not persist an account again when reauthentication completes", async () => {
    statusMock.mockReturnValue({ status: "complete" });

    const response = await GET(
      new Request("http://localhost/api/accounts/account-1/login/login-1"),
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "complete" });
    expect(shouldPersistMock).toHaveBeenCalledWith("account-1", "login-1");
    expect(store.persist).not.toHaveBeenCalled();
  });
});
