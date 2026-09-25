import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStore } from "@/lib/auth/auth-store";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const { getAuthStoreMock } = vi.hoisted(() => ({ getAuthStoreMock: vi.fn() }));
vi.mock("@/lib/auth/auth-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/auth-store")>();
  return { ...actual, getAuthStore: getAuthStoreMock };
});

import { POST } from "@/app/api/setup/route";

function request(body: unknown) {
  return new Request("http://localhost/api/setup", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/setup", () => {
  beforeEach(async () => {
    getAuthStoreMock.mockReturnValue(new AuthStore(await mkdtemp(path.join(tmpdir(), "codex-setup-"))));
  });

  it("rejects invalid credentials without creating an account", async () => {
    expect((await POST(request({ id: "owner", password: "" }))).status).toBe(400);
    expect(await getAuthStoreMock().read()).toBeNull();
  });

  it("allows a password shorter than 12 characters", async () => {
    const response = await POST(request({ id: "owner", password: "short" }));
    expect(response.status).toBe(200);
    expect((await getAuthStoreMock().read())?.loginId).toBe("owner");
  });

  it("creates the first account and signs in", async () => {
    const response = await POST(request({ id: "owner", password: "strong-secret-password" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(`${SESSION_COOKIE_NAME}=`);
    expect((await getAuthStoreMock().read())?.loginId).toBe("owner");
  });

  it("does not replace an existing account", async () => {
    await POST(request({ id: "owner", password: "strong-secret-password" }));
    const response = await POST(request({ id: "attacker", password: "another-secret-password" }));
    expect(response.status).toBe(409);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect((await getAuthStoreMock().read())?.loginId).toBe("owner");
  });

  it("rejects cross-origin setup", async () => {
    const crossOrigin = new Request("http://localhost/api/setup", {
      method: "POST", headers: { origin: "http://other.example" },
      body: JSON.stringify({ id: "owner", password: "strong-secret-password" }),
    });
    expect((await POST(crossOrigin)).status).toBe(403);
    expect(await getAuthStoreMock().read()).toBeNull();
  });

  it("accepts the public origin behind a TLS-terminating proxy", async () => {
    const proxied = new Request("http://localhost:3000/api/setup", {
      method: "POST",
      headers: {
        origin: "https://dashboard.example",
        host: "dashboard.example",
        "x-forwarded-proto": "https",
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: "owner", password: "short" }),
    });
    expect((await POST(proxied)).status).toBe(200);
    expect((await getAuthStoreMock().read())?.loginId).toBe("owner");
  });

  it("rejects a different origin behind the proxy", async () => {
    const proxied = new Request("http://localhost:3000/api/setup", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        host: "dashboard.example",
        "x-forwarded-proto": "https",
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: "owner", password: "short" }),
    });
    expect((await POST(proxied)).status).toBe(403);
    expect(await getAuthStoreMock().read()).toBeNull();
  });
});