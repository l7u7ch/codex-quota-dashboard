import { access, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AccountStore } from "@/lib/accounts/account-store";

describe("AccountStore", () => {
  it("keeps a new account out of the dashboard until it is persisted after login", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codex-dashboard-"));
    const store = new AccountStore(root);

    const pending = await store.createPending();

    expect(pending.codexHome).toBe(path.join(root, "profiles", pending.id));
    await expect(store.list()).resolves.toEqual([]);

    await store.persist(pending);

    await expect(store.list()).resolves.toEqual([pending]);
  });

  it("removes an abandoned account and its isolated Codex home", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codex-dashboard-"));
    const store = new AccountStore(root);
    const account = await store.createPending();

    await store.discardPending(account);

    await expect(store.list()).resolves.toEqual([]);
    await expect(access(account.codexHome)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
