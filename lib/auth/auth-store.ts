import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type AuthConfig = {
  loginId: string;
  passwordHash: string;
  sessionSigningSecret: string;
};

export class AuthStore {
  private readonly authFile: string;

  constructor(private readonly root: string) {
    // Deliberately ignore legacy auth.json (including the old admin/admin account).
    this.authFile = path.join(root, "auth-v2.json");
  }

  async read(): Promise<AuthConfig | null> {
    try {
      return JSON.parse(await readFile(this.authFile, "utf8")) as AuthConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return null;
    }
  }

  async create(loginId: string, password: string): Promise<AuthConfig> {
    const auth: AuthConfig = {
      loginId,
      passwordHash: hashPassword(password),
      sessionSigningSecret: randomBytes(32).toString("base64url"),
    };
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const temporaryFile = `${this.authFile}.${randomBytes(8).toString("hex")}.tmp`;
    try {
      await writeFile(temporaryFile, `${JSON.stringify(auth, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
        flag: "wx",
      });
      await link(temporaryFile, this.authFile);
    } finally {
      await unlink(temporaryFile).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    return auth;
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


export function hashPassword(password: string, salt = randomBytes(16).toString("base64url")) {
  return `${salt}.${scryptSync(password, salt, 64).toString("base64url")}`;
}
