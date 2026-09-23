import { Dashboard } from "@/components/dashboard";
import { getAccountStore } from "@/lib/accounts/account-store";
import { loadAccountUsage } from "@/lib/accounts/account-usage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const storedAccounts = await getAccountStore().list();
  const accounts = await Promise.all(storedAccounts.map((account) => loadAccountUsage(account)));

  return <Dashboard initialAccounts={accounts} />;
}
