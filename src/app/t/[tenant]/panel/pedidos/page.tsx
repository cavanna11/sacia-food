import { OrdersBoard } from "@/components/panel/OrdersBoard";

export default async function PedidosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantId } = await params;
  return <OrdersBoard tenantId={tenantId} />;
}
