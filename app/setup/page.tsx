import { SetupForm } from "@/components/setup-form";
import { getAuthStore } from "@/lib/auth/auth-store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
// export const metadata = { title: "初期アカウント作成 | AI Usage Monitor" };

export default async function SetupPage() {
  if (await getAuthStore().read()) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <SetupForm />
      </section>
    </main>
  );
}
