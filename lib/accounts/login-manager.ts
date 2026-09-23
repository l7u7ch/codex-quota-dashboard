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

export class LoginManager {
  private readonly logins = new Map<string, LoginState>();

  constructor(
    private readonly startClient: LoginClientFactory = CodexAppServerClient.start,
  ) {}

  async begin(account: StoredAccount): Promise<DeviceLogin> {
    const client = await this.startClient(account.codexHome);
    try {
      const login = await client.startDeviceLogin();
      const key = this.key(account.id, login.loginId);
      this.logins.set(key, { loginId: login.loginId, status: "pending" });

      client.connection.once("account/login/completed", (payload: unknown) => {
        const result = payload as {
          loginId?: string;
          success?: boolean;
        };
        if (result.loginId !== login.loginId) return;
        this.logins.set(
          key,
          result.success
            ? { loginId: login.loginId, status: "complete" }
            : {
                loginId: login.loginId,
                status: "failed",
                error: "ChatGPTへのログインに失敗しました",
              },
        );
        client.close();
      });

      const timeout = setTimeout(() => {
        const current = this.logins.get(key);
        if (current?.status === "pending") {
          this.logins.set(key, {
            loginId: login.loginId,
            status: "failed",
            error: "ログインの有効期限が切れました",
          });
          client.close();
        }
      }, 10 * 60 * 1000);
      timeout.unref();

      return login;
    } catch (error) {
      client.close();
      throw error;
    }
  }

  status(accountId: string, loginId: string) {
    const state = this.logins.get(this.key(accountId, loginId));
    if (!state) return null;
    const { status, error } = state;
    return error ? { status, error } : { status };
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
