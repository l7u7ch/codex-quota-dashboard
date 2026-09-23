import { describe, expect, it, vi } from "vitest";

import {
  createSession,
  isValidCredential,
  isValidSession,
} from "@/lib/auth/session";

describe("session authentication", () => {
  it("accepts only the configured initial administrator credentials", () => {
    expect(isValidCredential("admin", "admin")).toBe(true);
    expect(isValidCredential("admin", "wrong-password")).toBe(false);
    expect(isValidCredential("other-user", "admin")).toBe(false);
  });

  it("creates a session that can be validated", () => {
    const token = createSession();

    expect(isValidSession(token)).toBe(true);
    expect(isValidSession(`${token}tampered`)).toBe(false);
  });

  it("validates a session in a fresh server module context", async () => {
    const { createSession: createSessionInLoginRoute } = await import("@/lib/auth/session");
    const token = createSessionInLoginRoute();

    vi.resetModules();
    const { isValidSession: validateSessionInPageRoute } = await import("@/lib/auth/session");

    expect(validateSessionInPageRoute(token)).toBe(true);
  });

  it("expires sessions after the configured lifetime", () => {
    vi.useFakeTimers();
    const token = createSession();

    vi.advanceTimersByTime(8 * 60 * 60 * 1_000 + 1);
    expect(isValidSession(token)).toBe(false);

    vi.useRealTimers();
  });
});
