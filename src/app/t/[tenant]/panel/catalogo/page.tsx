import { CatalogManager } from "@/components/panel/CatalogManager";

export default async function CatalogoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantId } = await params;
  return <CatalogManager tenantId={tenantId} />;
}
