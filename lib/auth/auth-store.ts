import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type AuthConfig = {
  loginId: string;
  passwordHash: string;
  sessionSigningSecret: string;
};

export class AuthStore {
  private readonly authFile: string;

  constructor(private readonly root: string) {
    this.authFile = path.join(root, "auth.json");
  }

  async read(): Promise<AuthConfig> {
    try {
      return JSON.parse(await readFile(this.authFile, "utf8")) as AuthConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const auth = createInitialAuthConfig();
      await this.write(auth);
      return auth;
    }
  }

  private async write(auth: AuthConfig) {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const temporaryFile = `${this.authFile}.${randomBytes(8).toString("hex")}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(auth, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryFile, this.authFile);
  }
}

export function getAuthStore() {
  return new AuthStore(path.join(process.cwd(), "data"));
}

export function isValidPassword(password: string, passwordHash: string) {
  const [salt, expected] = passwordHash.split(".");
  if (!salt || !expected) return false;
  const candidate = scryptSync(password, salt, 64).toString("base64url");
  return candidate.length === expected.length && timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

function createInitialAuthConfig(): AuthConfig {
  return {
    loginId: "admin",
    passwordHash: hashPassword("admin"),
    sessionSigningSecret: randomBytes(32).toString("base64url"),
  };
}

export function hashPassword(password: string, salt = randomBytes(16).toString("base64url")) {
  return `${salt}.${scryptSync(password, salt, 64).toString("base64url")}`;
}
