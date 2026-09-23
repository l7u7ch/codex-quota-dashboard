import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AccountStore } from "@/lib/accounts/account-store";

describe("AccountStore", () => {
  it("persists accounts and gives each account an isolated Codex home", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codex-dashboard-"));
    const store = new AccountStore(root);

    const first = await store.create("個人 Plus");
    const second = await store.create("研究用");

    expect(first.id).not.toBe(second.id);
    expect(first.codexHome).toBe(path.join(root, "profiles", first.id));
    expect(second.codexHome).toBe(path.join(root, "profiles", second.id));
    await expect(store.list()).resolves.toEqual([first, second]);
  });

  it("rejects blank account labels", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codex-dashboard-"));
    const store = new AccountStore(root);

    await expect(store.create("   ")).rejects.toThrow("アカウント名を入力してください");
  });
});
