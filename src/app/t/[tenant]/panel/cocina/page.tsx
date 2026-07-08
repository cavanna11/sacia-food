import { KitchenDisplay } from "@/components/panel/KitchenDisplay";

export default async function CocinaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantId } = await params;
  return <KitchenDisplay tenantId={tenantId} />;
}
