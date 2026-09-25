import { describe, expect, it, vi } from "vitest";

const {
  getAccountStoreMock,
  getAuthStoreMock,
  isValidSessionMock,
  loadAccountUsageMock,
} = vi.hoisted(() => ({
  getAccountStoreMock: vi.fn(),
  getAuthStoreMock: vi.fn(),
  isValidSessionMock: vi.fn(),
  loadAccountUsageMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session" }) }),
}));
vi.mock("@/lib/accounts/account-store", () => ({ getAccountStore: getAccountStoreMock }));
vi.mock("@/lib/accounts/account-usage", () => ({ loadAccountUsage: loadAccountUsageMock }));
vi.mock("@/lib/accounts/login-manager", () => ({ loginManager: { begin: vi.fn() } }));
vi.mock("@/lib/auth/auth-store", () => ({ getAuthStore: getAuthStoreMock }));
vi.mock("@/lib/auth/session", () => ({
  isValidSession: isValidSessionMock,
  SESSION_COOKIE_NAME: "dashboard_session",
}));

import { GET } from "@/app/api/accounts/route";

describe("GET /api/accounts", () => {
  it("keeps signed-out accounts available for reauthentication", async () => {
    const storedAccount = {
      id: "account-1",
      codexHome: "/profiles/account-1",
      createdAt: "2026-09-23T00:00:00.000Z",
    };
    const usage = {
      id: "account-1",
      displayName: null,
      email: null,
      planType: null,
      status: "signed-out",
      windows: [],
    };
    const store = { list: vi.fn().mockResolvedValue([storedAccount]), remove: vi.fn() };
    getAccountStoreMock.mockReturnValue(store);
    getAuthStoreMock.mockReturnValue({ read: vi.fn().mockResolvedValue({}) });
    isValidSessionMock.mockReturnValue(true);
    loadAccountUsageMock.mockResolvedValue(usage);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accounts: [usage] });
    expect(store.remove).not.toHaveBeenCalled();
  });
});
