import { access, mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AuthStore, isValidPassword } from "@/lib/auth/auth-store";

describe("AuthStore", () => {
  it("creates persistent initial credentials and a session signing secret", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codex-dashboard-auth-"));
    const store = new AuthStore(root);

    const auth = await store.read();

    expect(auth.loginId).toBe("admin");
    expect(auth.passwordHash).not.toBe("admin");
    expect(isValidPassword("admin", auth.passwordHash)).toBe(true);
    expect(isValidPassword("incorrect", auth.passwordHash)).toBe(false);
    expect(auth.sessionSigningSecret).toMatch(/^.{32,}$/);
    await expect(access(path.join(root, "auth.json"))).resolves.toBeUndefined();
    expect((await stat(path.join(root, "auth.json"))).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(path.join(root, "auth.json"), "utf8"))).toEqual(auth);
  });

  it("reuses the stored credentials across AuthStore instances", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codex-dashboard-auth-"));
    const first = await new AuthStore(root).read();

    const second = await new AuthStore(root).read();

    expect(second).toEqual(first);
  });
});
