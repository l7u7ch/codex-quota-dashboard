import { access, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AccountStore } from "@/lib/accounts/account-store";

describe("AccountStore", () => {
  it("persists accounts and gives each account an isolated Codex home", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codex-dashboard-"));
    const store = new AccountStore(root);

    const first = await store.create();
    const second = await store.create();

    expect(first.id).not.toBe(second.id);
    expect(first.codexHome).toBe(path.join(root, "profiles", first.id));
    expect(second.codexHome).toBe(path.join(root, "profiles", second.id));
    await expect(store.list()).resolves.toEqual([first, second]);
  });

  it("removes an abandoned account and its isolated Codex home", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codex-dashboard-"));
    const store = new AccountStore(root);
    const account = await store.create();

    await store.remove(account.id);

    await expect(store.list()).resolves.toEqual([]);
    await expect(access(account.codexHome)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
