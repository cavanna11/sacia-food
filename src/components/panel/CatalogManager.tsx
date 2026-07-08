"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { formatARS } from "@/lib/format";
import type { ProductDoc } from "@/lib/types";
import { Badge, Button, Card, CardTitle, Input } from "@/components/ui";

type Product = ProductDoc & { id: string };

/**
 * Gestión del catálogo del tenant. Escribe directo a Firestore: las
 * Security Rules permiten estas escrituras solo al staff del propio tenant.
 * Todo en tiempo real: lo que se guarda acá aparece al instante en la tienda.
 */
export function CatalogManager({ tenantId }: { tenantId: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(clientDb, `tenants/${tenantId}/products`),
      orderBy("category"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ProductDoc) })));
      },
      (err) => setError(err.message),
    );
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

  async function toggleAvailable(p: Product) {
    await updateDoc(doc(clientDb, `tenants/${tenantId}/products/${p.id}`), {
      available: !p.available,
      updatedAt: Date.now(),
    });
  }

  async function remove(p: Product) {
    if (!confirm(`¿Eliminar "${p.name}" del catálogo?`)) return;
    await deleteDoc(doc(clientDb, `tenants/${tenantId}/products/${p.id}`));
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
        <Button onClick={() => setEditing("new")}>+ Producto</Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {editing && (
        <ProductForm
          tenantId={tenantId}
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {products === null ? (
        <p className="mt-8 text-muted">Cargando catálogo…</p>
      ) : products.length === 0 ? (
        <Card className="mt-8 text-center">
          <CardTitle>Tu catálogo está vacío</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Cargá tu primer producto y aparece al instante en tu tienda.
          </p>
        </Card>
      ) : (
        [...byCategory.entries()].map(([category, items]) => (
          <section key={category} className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {category}
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {items.map((p) => (
                <Card key={p.id} className="flex items-center gap-4 !p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {p.name}{" "}
                      {!p.available && <Badge tone="neutral">sin stock</Badge>}
                    </p>
                    {p.description && (
                      <p className="truncate text-sm text-muted">{p.description}</p>
                    )}
                  </div>
                  <span className="font-semibold">{formatARS(p.price)}</span>
                  <div className="flex gap-1">
                    <Button variant="secondary" onClick={() => toggleAvailable(p)}>
                      {p.available ? "Pausar" : "Activar"}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(p)}>
                      Editar
                    </Button>
                    <Button variant="ghost" onClick={() => remove(p)}>
                      Eliminar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}

function ProductForm({
  tenantId,
  product,
  onClose,
}: {
  tenantId: string;
  product: (ProductDoc & { id: string }) | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const price = Number(form.get("price"));
    if (!Number.isFinite(price) || price <= 0) {
      setError("El precio tiene que ser un número mayor a cero.");
      return;
    }
    const data = {
      name: String(form.get("name")).trim(),
      description: String(form.get("description")).trim(),
      category: String(form.get("category")).trim() || "General",
      price,
      updatedAt: Date.now(),
    };
    setBusy(true);
    setError(null);
    try {
      if (product) {
        await updateDoc(doc(clientDb, `tenants/${tenantId}/products/${product.id}`), data);
      } else {
        await addDoc(collection(clientDb, `tenants/${tenantId}/products`), {
          ...data,
          available: true,
          createdAt: Date.now(),
        });
      }
      onClose();
    } catch {
      setError("No se pudo guardar. Probá de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardTitle>{product ? `Editar: ${product.name}` : "Nuevo producto"}</CardTitle>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" name="name" required defaultValue={product?.name} />
        <Input
          label="Precio (ARS)"
          name="price"
          type="number"
          min="1"
          step="1"
          required
          defaultValue={product?.price}
        />
        <Input
          label="Categoría"
          name="category"
          placeholder="Ej: Hamburguesas"
          defaultValue={product?.category}
        />
        <Input
          label="Descripción (opcional)"
          name="description"
          defaultValue={product?.description}
        />
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
