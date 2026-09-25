import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAccountStoreMock, getAuthStoreMock, isValidSessionMock, beginMock } =
  vi.hoisted(() => ({
    getAccountStoreMock: vi.fn(),
    getAuthStoreMock: vi.fn(),
    isValidSessionMock: vi.fn(),
    beginMock: vi.fn(),
  }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session" }) }),
}));
vi.mock("@/lib/accounts/account-store", () => ({ getAccountStore: getAccountStoreMock }));
vi.mock("@/lib/accounts/login-manager", () => ({ loginManager: { begin: beginMock } }));
vi.mock("@/lib/auth/auth-store", () => ({ getAuthStore: getAuthStoreMock }));
vi.mock("@/lib/auth/session", () => ({
  isValidSession: isValidSessionMock,
  SESSION_COOKIE_NAME: "dashboard_session",
}));

import { POST } from "@/app/api/accounts/[id]/login/route";

const account = {
  id: "account-1",
  codexHome: "/profiles/account-1",
  createdAt: "2026-09-23T00:00:00.000Z",
};

function context() {
  return { params: Promise.resolve({ id: account.id }) };
}

describe("POST /api/accounts/[id]/login", () => {
  const store = { get: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    getAuthStoreMock.mockReturnValue({ read: vi.fn().mockResolvedValue({}) });
    isValidSessionMock.mockReturnValue(true);
    getAccountStoreMock.mockReturnValue(store);
    store.get.mockResolvedValue(account);
    beginMock.mockResolvedValue({
      type: "chatgptDeviceCode",
      loginId: "reauth-1",
      verificationUrl: "https://auth.openai.com/device",
      userCode: "REAUTH-12",
    });
  });

  it("starts device login in the existing account profile without creating a new account", async () => {
    const response = await POST(
      new Request("http://localhost/api/accounts/account-1/login", { method: "POST" }),
      context(),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ accountId: "account-1", loginId: "reauth-1" });
    expect(beginMock).toHaveBeenCalledWith(account, { persistOnComplete: false });
  });

  it("returns 404 for an account that is no longer registered", async () => {
    store.get.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/accounts/missing/login", { method: "POST" }),
      context(),
    );

    expect(response.status).toBe(404);
    expect(beginMock).not.toHaveBeenCalled();
  });
});
