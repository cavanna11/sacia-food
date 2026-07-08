"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { formatARS } from "@/lib/format";
import type { ProductDoc } from "@/lib/types";
import { Button, Card } from "@/components/ui";
import { useCart } from "./CartProvider";

type Product = ProductDoc & { id: string };

/**
 * Menú público del storefront, en tiempo real: si el comercio pausa un
 * producto desde el panel, desaparece de acá al instante.
 * Lectura anónima permitida por las Security Rules (el menú es público).
 */
export function Menu({ tenantId }: { tenantId: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const cart = useCart();

  useEffect(() => {
    const q = query(
      collection(clientDb, `tenants/${tenantId}/products`),
      orderBy("category"),
    );
    return onSnapshot(q, (snap) => {
      setProducts(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as ProductDoc) }))
          .filter((p) => p.available),
      );
    });
  }, [tenantId]);

  const byCategory = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const p of products ?? []) {
      const list = groups.get(p.category) ?? [];
      list.push(p);
      groups.set(p.category, list);
    }
    return groups;
  }, [products]);

  if (products === null) {
    return <p className="py-16 text-center text-muted">Cargando menú…</p>;
  }

  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Muy pronto</h2>
        <p className="mt-2 text-muted">
          Estamos preparando el menú. ¡Volvé en un ratito!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 py-8">
      {[...byCategory.entries()].map(([category, items]) => (
        <section key={category}>
          <h2 className="text-xl font-bold tracking-tight">{category}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {items.map((p) => (
              <Card key={p.id} className="flex items-start justify-between gap-4 !p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{p.name}</p>
                  {p.description && (
                    <p className="mt-0.5 text-sm text-muted">{p.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="font-semibold text-primary">{formatARS(p.price)}</span>
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    onClick={() =>
                      cart.add({ productId: p.id, name: p.name, price: p.price })
                    }
                  >
                    Agregar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
