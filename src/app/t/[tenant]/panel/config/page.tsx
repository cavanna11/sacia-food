import { ConfigForm } from "@/components/panel/ConfigForm";

export default async function ConfigPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantId } = await params;
  return <ConfigForm tenantId={tenantId} />;
}
