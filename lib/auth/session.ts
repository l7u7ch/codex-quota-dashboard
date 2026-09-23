import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1_000;
const SESSION_SIGNING_SECRET = "codex-quota-dashboard-initial-session-secret";

export const SESSION_COOKIE_NAME = "codex-quota-session";

export function isValidCredential(id: string, password: string) {
  return id === "admin" && password === "admin";
}

export function createSession() {
  const expiresAt = Date.now() + SESSION_LIFETIME_MS;
  const signature = createHmac("sha256", SESSION_SIGNING_SECRET)
    .update(String(expiresAt))
    .digest("base64url");
  return `${expiresAt}.${signature}`;
}

export function isValidSession(token: string | undefined) {
  if (!token) return false;

  const [expiresAtText, signature] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || !signature || expiresAt <= Date.now()) return false;

  const expectedSignature = createHmac("sha256", SESSION_SIGNING_SECRET)
    .update(expiresAtText)
    .digest("base64url");
  if (signature.length !== expectedSignature.length) return false;

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
