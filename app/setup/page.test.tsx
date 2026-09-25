import { describe, expect, it, vi } from "vitest";

const { readMock, redirectMock } = vi.hoisted(() => ({ readMock: vi.fn(), redirectMock: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }) }));
vi.mock("@/lib/auth/auth-store", () => ({ getAuthStore: () => ({ read: readMock }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import Home from "@/app/page";
import LoginPage from "@/app/login/page";
import SetupPage from "@/app/setup/page";

describe("first-run navigation", () => {
  it("sends unauthenticated users to setup when no account exists", async () => {
    readMock.mockResolvedValue(null);
    await expect(Home()).rejects.toThrow("redirect:/setup");
    await expect(LoginPage()).rejects.toThrow("redirect:/setup");
    expect((await SetupPage()).type).toBe("main");
  });

  it("does not reopen setup after an account exists", async () => {
    readMock.mockResolvedValue({ loginId: "owner", passwordHash: "hash", sessionSigningSecret: "secret" });
    await expect(SetupPage()).rejects.toThrow("redirect:/login");
  });
});