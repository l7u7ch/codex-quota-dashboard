import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type StoredAccount = {
  id: string;
  codexHome: string;
  createdAt: string;
};

export class AccountStore {
  private readonly accountsFile: string;
  private readonly profilesRoot: string;

  constructor(private readonly root: string) {
    this.accountsFile = path.join(root, "accounts.json");
    this.profilesRoot = path.join(root, "profiles");
  }

  async list(): Promise<StoredAccount[]> {
    try {
      const contents = await readFile(this.accountsFile, "utf8");
      return JSON.parse(contents) as StoredAccount[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async createPending(): Promise<StoredAccount> {
    const id = randomUUID();
    const codexHome = path.join(this.profilesRoot, id);
    const account: StoredAccount = {
      id,
      codexHome,
      createdAt: new Date().toISOString(),
    };

    await mkdir(codexHome, { recursive: true, mode: 0o700 });
    return account;
  }

  async persist(account: StoredAccount): Promise<void> {
    const accounts = await this.list();
    if (accounts.some((candidate) => candidate.id === account.id)) return;
    await this.writeAccounts([...accounts, account]);
  }

  async get(id: string): Promise<StoredAccount | null> {
    return (await this.list()).find((account) => account.id === id) ?? null;
  }

  async remove(id: string): Promise<boolean> {
    const accounts = await this.list();
    const account = accounts.find((candidate) => candidate.id === id);
    if (!account) return false;

    await rm(account.codexHome, { recursive: true, force: true });
    await this.writeAccounts(accounts.filter((candidate) => candidate.id !== id));
    return true;
  }

  async discardPending(account: StoredAccount): Promise<void> {
    await rm(account.codexHome, { recursive: true, force: true });
  }

  private async writeAccounts(accounts: StoredAccount[]) {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const temporaryFile = `${this.accountsFile}.${randomUUID()}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(accounts, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryFile, this.accountsFile);
  }
}

export function getAccountStore() {
  const root = process.env.CODEX_USAGE_DATA_DIR ?? path.join(process.cwd(), ".codex-profiles");
  return new AccountStore(root);
}
