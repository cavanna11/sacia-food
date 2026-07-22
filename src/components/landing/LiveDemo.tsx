"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

/**
 * Demo en vivo embebida: la tienda demo REAL (resto-a) corriendo dentro de
 * un marco de teléfono. "Probá antes de comprar" — el visitante usa el
 * producto ahí mismo. El iframe se carga recién cuando la sección entra en
 * viewport, para no penalizar el paint inicial de la landing.
 */
export function LiveDemo() {
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [load, setLoad] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // La landing corre en el host raíz; la demo vive en el subdominio resto-a.
    const { protocol, host } = window.location;
    setDemoUrl(`${protocol}//resto-a.${host}`);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-6">
      {/* Marco de teléfono */}
      <div className="relative w-[300px] max-w-full rounded-[2.5rem] border-[10px] border-strong bg-strong shadow-2xl">
        {/* Notch */}
        <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-strong" />
        <div className="h-[560px] overflow-hidden rounded-[1.7rem] bg-bg">
          {load && demoUrl ? (
            <iframe
              src={demoUrl}
              title="Tienda demo en vivo"
              className="h-full w-full border-0"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Cargando tienda demo…
            </div>
          )}
        </div>
      </div>

      {demoUrl && (
        <a href={demoUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary">Abrir la demo en pantalla completa ↗</Button>
        </a>
      )}
    </div>
  );
}
