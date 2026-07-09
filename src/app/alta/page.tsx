import { Suspense } from "react";
import { SignupForm } from "@/components/landing/SignupForm";

/**
 * Alta self-service (Fase 2). Por ahora el tenant nace en estado "trial";
 * el cobro del primer mes se enchufa con MercadoPago.
 */
export default function AltaPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-center text-3xl font-bold tracking-tight">
        Creá tu tienda
      </h1>
      <p className="mt-2 text-center text-muted">
        En un minuto tenés tu tienda con tu marca, andando.
      </p>
      <div className="mt-8">
        <Suspense>
          <SignupForm />
        </Suspense>
      </div>
    </main>
  );
}
