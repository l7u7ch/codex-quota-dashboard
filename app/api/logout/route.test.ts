import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/logout/route";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

describe("POST /api/logout", () => {
  it("clears the dashboard session cookie", async () => {
    const response = await POST();
    const cookie = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
  });
});
