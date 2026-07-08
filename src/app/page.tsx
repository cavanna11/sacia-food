import { Card, CardDescription, CardTitle } from "@/components/ui";

/**
 * Sitio raíz (dominio sin subdominio). En Fase 2 acá vive la landing
 * comercial con planes, demo y alta self-service. Por ahora, placeholder
 * con accesos a los tenants semilla para desarrollo.
 */
export default function Home() {
  const demos = [
    { id: "resto-a", label: "Resto A (demo)" },
    { id: "resto-b", label: "Resto B (demo)" },
  ];

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Plataforma de pedidos
        </h1>
        <p className="mt-2 text-muted">
          Fase 0 — fundaciones multi-tenant. La landing comercial llega en Fase 2.
        </p>
      </div>
      <div className="grid w-full max-w-lg gap-4 sm:grid-cols-2">
        {demos.map((d) => (
          <a key={d.id} href={`http://${d.id}.localhost:3000`}>
            <Card className="transition-colors hover:border-primary">
              <CardTitle>{d.label}</CardTitle>
              <CardDescription>{d.id}.localhost:3000</CardDescription>
            </Card>
          </a>
        ))}
      </div>
    </main>
  );
}
