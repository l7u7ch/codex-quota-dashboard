import { describe, expect, it, vi } from "vitest";

const { readMock, isValidSessionMock, redirectMock } = vi.hoisted(() => ({
  readMock: vi.fn(),
  isValidSessionMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock("@/lib/auth/auth-store", () => ({ getAuthStore: () => ({ read: readMock }) }));
vi.mock("@/lib/auth/session", () => ({
  isValidSession: isValidSessionMock,
  SESSION_COOKIE_NAME: "dashboard_session",
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "session" }) }) }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { UsageDashboard } from "@/components/usage-dashboard";
import UsagePage from "@/app/usage/page";

describe("usage forecast page", () => {
  it("requires setup before an auth configuration exists", async () => {
    readMock.mockResolvedValue(null);

    await expect(UsagePage()).rejects.toThrow("redirect:/setup");
  });

  it("requires a valid session and renders the standalone forecast page", async () => {
    readMock.mockResolvedValue({ loginId: "owner" });
    isValidSessionMock.mockReturnValue(true);

    const page = await UsagePage();

    expect(page.type).toBe(UsageDashboard);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
