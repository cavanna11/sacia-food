"use client";

import { useEffect, useState } from "react";
import { IconMenu, IconUtensils, IconX } from "@/components/ui/icons";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui";

const LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#funciones", label: "Funciones" },
  { href: "#precios", label: "Precios" },
  { href: "#preguntas", label: "Preguntas" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        scrolled
          ? "border-b border-border-soft bg-bg/80 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="/" className="flex items-center gap-2 font-black tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
            <IconUtensils size={18} />
          </span>
          <span className="text-lg">{BRAND.name}</span>
        </a>

        {/* Links desktop */}
        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-control px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-strong"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTAs desktop */}
        <div className="hidden items-center gap-2 lg:flex">
          <a href="http://resto-a.localhost:3000" target="_blank" rel="noreferrer">
            <Button variant="ghost">Ver demo</Button>
          </a>
          <a href="/alta">
            <Button>Crear mi tienda</Button>
          </a>
        </div>

        {/* Toggle mobile */}
        <button
          type="button"
          className="rounded-control p-2 text-strong lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          {open ? <IconX size={22} /> : <IconMenu size={22} />}
        </button>
      </nav>

      {/* Menú mobile desplegable */}
      {open && (
        <div className="border-t border-border-soft bg-bg px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-control px-3 py-2.5 text-sm font-medium text-strong hover:bg-border-soft/50"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <a href="http://resto-a.localhost:3000" target="_blank" rel="noreferrer">
              <Button variant="secondary" className="w-full">
                Ver demo
              </Button>
            </a>
            <a href="/alta">
              <Button className="w-full">Crear mi tienda</Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
