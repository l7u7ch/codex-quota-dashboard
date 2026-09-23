import type { EventEmitter } from "node:events";

import type { StoredAccount } from "@/lib/accounts/account-store";
import {
  CodexAppServerClient,
  type DeviceLogin,
} from "@/lib/codex/app-server-client";

type LoginClient = {
  connection: EventEmitter;
  startDeviceLogin(): Promise<DeviceLogin>;
  close(): void;
};

type LoginClientFactory = (codexHome: string) => Promise<LoginClient>;

type LoginState = {
  loginId: string;
  status: "pending" | "complete" | "failed";
  error?: string;
};

type LoginSession = {
  state: LoginState;
  close(): void;
  timeout: ReturnType<typeof setTimeout>;
};

export class LoginManager {
  private readonly logins = new Map<string, LoginSession>();

  constructor(
    private readonly startClient: LoginClientFactory = CodexAppServerClient.start,
  ) {}

  async begin(account: StoredAccount): Promise<DeviceLogin> {
    const client = await this.startClient(account.codexHome);
    try {
      const login = await client.startDeviceLogin();
      const key = this.key(account.id, login.loginId);
      const timeout = setTimeout(() => {
        const current = this.logins.get(key);
        if (current?.state.status === "pending") {
          this.fail(key, "ログインの有効期限が切れました");
        }
      }, 10 * 60 * 1000);
      timeout.unref();
      this.logins.set(key, {
        state: { loginId: login.loginId, status: "pending" },
        close: client.close,
        timeout,
      });

      client.connection.once("account/login/completed", (payload: unknown) => {
        const result = payload as {
          loginId?: string;
          success?: boolean;
        };
        if (result.loginId !== login.loginId) return;
        if (result.success) this.complete(key);
        else this.fail(key, "ChatGPTへのログインに失敗しました");
      });

      return login;
    } catch (error) {
      client.close();
      throw error;
    }
  }

  status(accountId: string, loginId: string) {
    const session = this.logins.get(this.key(accountId, loginId));
    if (!session) return null;
    const { state } = session;
    const { status, error } = state;
    return error ? { status, error } : { status };
  }

  discard(accountId: string, loginId: string) {
    const key = this.key(accountId, loginId);
    const session = this.logins.get(key);
    if (!session) return "missing" as const;
    if (session.state.status === "complete") return "complete" as const;

    clearTimeout(session.timeout);
    session.close();
    this.logins.delete(key);
    return "discarded" as const;
  }

  private complete(key: string) {
    const session = this.logins.get(key);
    if (!session || session.state.status !== "pending") return;
    clearTimeout(session.timeout);
    session.state = { loginId: session.state.loginId, status: "complete" };
    session.close();
  }

  private fail(key: string, error: string) {
    const session = this.logins.get(key);
    if (!session || session.state.status !== "pending") return;
    clearTimeout(session.timeout);
    session.state = { loginId: session.state.loginId, status: "failed", error };
    session.close();
  }

  private key(accountId: string, loginId: string) {
    return `${accountId}:${loginId}`;
  }
}

const globalForLogin = globalThis as typeof globalThis & {
  codexLoginManager?: LoginManager;
};

export const loginManager =
  globalForLogin.codexLoginManager ?? new LoginManager();

if (process.env.NODE_ENV !== "production") {
  globalForLogin.codexLoginManager = loginManager;
}
