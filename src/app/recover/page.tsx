import { listShopsWithConfirmedGraph } from "@/lib/db/repositories/shops.repo";
import { RecoverWizard } from "@/components/recovery/recover-wizard";

export const dynamic = "force-dynamic";

export default async function RecoverPage() {
  let shops: Array<{ id: string; name: string; address: string }> = [];
  try {
    shops = await listShopsWithConfirmedGraph();
  } catch {
    // DB down: the wizard renders its guided empty state.
  }
  return <RecoverWizard shops={shops} />;
}
