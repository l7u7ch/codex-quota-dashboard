import { LoginForm } from "@/components/login-form";
import { isValidSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "ログイン | Codex Quota Dashboard",
};

export default async function LoginPage() {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (isValidSession(sessionToken)) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <LoginForm />
      </section>
    </main>
  );
}
