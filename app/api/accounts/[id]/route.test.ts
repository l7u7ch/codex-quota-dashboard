import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAccountStoreMock, getAuthStoreMock, isValidSessionMock, cancelAccountMock } =
  vi.hoisted(() => ({
    getAccountStoreMock: vi.fn(),
    getAuthStoreMock: vi.fn(),
    isValidSessionMock: vi.fn(),
    cancelAccountMock: vi.fn(),
  }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session" }) }),
}));
vi.mock("@/lib/accounts/account-store", () => ({ getAccountStore: getAccountStoreMock }));
vi.mock("@/lib/accounts/login-manager", () => ({
  loginManager: { cancelAccount: cancelAccountMock },
}));
vi.mock("@/lib/auth/auth-store", () => ({ getAuthStore: getAuthStoreMock }));
vi.mock("@/lib/auth/session", () => ({
  isValidSession: isValidSessionMock,
  SESSION_COOKIE_NAME: "dashboard_session",
}));

import { DELETE, PATCH } from "@/app/api/accounts/[id]/route";

const account = {
  id: "account-1",
  codexHome: "/profiles/account-1",
  createdAt: "2026-09-23T00:00:00.000Z",
};

function context() {
  return { params: Promise.resolve({ id: account.id }) };
}

describe("/api/accounts/[id]", () => {
  const store = {
    get: vi.fn(),
    updateDisplayName: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getAuthStoreMock.mockReturnValue({ read: vi.fn().mockResolvedValue({}) });
    isValidSessionMock.mockReturnValue(true);
    getAccountStoreMock.mockReturnValue(store);
    store.get.mockResolvedValue(account);
    store.updateDisplayName.mockImplementation(async (_id, displayName) => ({
      ...account,
      ...(displayName ? { displayName } : {}),
    }));
    store.remove.mockResolvedValue(true);
  });

  it("trims and saves a display name", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/accounts/account-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "  Work account  " }),
      }),
      context(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ displayName: "Work account" });
    expect(store.updateDisplayName).toHaveBeenCalledWith("account-1", "Work account");
  });

  it("rejects display names longer than 50 characters", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/accounts/account-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "x".repeat(51) }),
      }),
      context(),
    );

    expect(response.status).toBe(400);
    expect(store.updateDisplayName).not.toHaveBeenCalled();
  });

  it("cancels pending authentication and deletes a registered account", async () => {
    const response = await DELETE(new Request("http://localhost/api/accounts/account-1"), context());

    expect(response.status).toBe(204);
    expect(cancelAccountMock).toHaveBeenCalledWith("account-1");
    expect(store.remove).toHaveBeenCalledWith("account-1");
  });
});
