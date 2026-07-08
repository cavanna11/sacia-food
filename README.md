# Gestión de Pedidos — SaaS multi-tenant

Plataforma SaaS de pedidos y gestión para comercios gastronómicos (Argentina).
Cada comercio tiene su tienda con marca propia en un subdominio, gestión de
pedidos en tiempo real y cobros sin comisión por pedido.

**Estado: Fase 0 + Fase 1 entregas 1, 2 y 3 (parte local)** — fundaciones
multi-tenant, catálogo en tiempo real, ciclo completo de pedidos (carrito →
`createOrder` → cola en vivo), KDS con timers, alerta sonora, estadísticas
del día, horarios de apertura/pausa, rate limit por teléfono y tracking
público del pedido para el cliente. Falta de la Entrega 3: MercadoPago,
OTP y Turnstile (requieren cuentas externas).

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind v4
- **Firebase**: Firestore, Auth, Cloud Functions (esqueleto)
- **Local**: Firebase Emulator Suite (no hace falta proyecto real ni credenciales)
- **Deploy previsto**: Vercel (front, wildcard domain) + Firebase (infra)

## Levantar en local

Requisitos: Node 20+, Java 17+ (lo usan los emuladores de Firebase).

```bash
npm install

# 1. Emuladores de Firebase (Auth + Firestore + UI en http://localhost:4000)
npm run emulators

# 2. En otra terminal: crear los tenants semilla y sus usuarios
npm run seed

# 3. En otra terminal: la app
npm run dev
```

Después abrí:

| URL | Qué es |
| --- | --- |
| `http://localhost:3000` | Sitio raíz (placeholder de la landing, Fase 2) |
| `http://resto-a.localhost:3000` | Storefront de Resto A (rojo, modo claro) |
| `http://resto-b.localhost:3000` | Storefront de Resto B (verde, modo oscuro) |
| `http://resto-a.localhost:3000/panel` | Panel de Resto A (requiere login) |

Usuarios semilla: `dueno@resto-a.test` / `secret123` y `dueno@resto-b.test` / `secret123`.

> Los subdominios `*.localhost` resuelven solos en Chrome/Edge/Firefox — no
> hace falta tocar el archivo hosts.

## Test de aislamiento (definition of done de la Fase 0)

```bash
npm run test:rules
```

Levanta el emulador de Firestore, carga `firestore.rules` y verifica, entre
otros, que **un usuario de Resto A que intenta leer un pedido de Resto B por
ID recibe `PERMISSION_DENIED`** desde las Security Rules (no desde el
frontend). También cubre: listado de tenants prohibido, pedidos ilegibles sin
login, y escrituras sensibles (crear pedidos, cambiar plan) bloqueadas al
cliente.

## Cómo funciona el multi-tenancy

1. **Routing por subdominio** — [src/proxy.ts](src/proxy.ts) resuelve el
   `tenantId` desde el hostname y reescribe internamente a `/t/{tenantId}/...`.
   El acceso directo por path a `/t/...` devuelve 404: el tenant lo determina
   solo el hostname.
2. **Datos por subcolección** — todo vive bajo `tenants/{tenantId}/...`
   (`products`, `orders`, `customers`, `members`, `private`). No existe forma
   de consultar datos "en general".
3. **Security Rules** — [firestore.rules](firestore.rules) exige que el custom
   claim `tenantId` del usuario coincida con el tenant del documento. Lo
   sensible (pedidos, pagos, provisioning) solo entra por Cloud Functions.
4. **Usuarios atados a su tenant** — custom claims `{ tenantId, role }`
   estampados server-side (ver [scripts/seed.ts](scripts/seed.ts)).

## Personalización visual (design tokens)

El branding de cada tenant (`tenants/{id}.branding`) se inyecta como variables
CSS (`--tenant-primary`, `--tenant-accent`, modo claro/oscuro) en
`src/app/t/[tenant]/layout.tsx`. Los componentes del design system
([src/components/ui](src/components/ui)) solo consumen tokens — ningún color
hardcodeado. El color de texto sobre la marca se calcula por contraste
(guardarraíl de legibilidad).

## Estructura

```
src/
  proxy.ts                  # routing por subdominio (middleware de Next 16)
  lib/
    tenant-host.ts          # hostname -> tenantId (puro, testeable)
    tenants.ts              # lectura server-side de tenants (Admin SDK)
    firebase/client.ts      # SDK navegador + conexión a emuladores
    firebase/admin.ts       # SDK admin (solo server)
    types.ts                # tipos del dominio
    color.ts                # contraste para tokens
  app/
    page.tsx                # sitio raíz (landing en Fase 2)
    t/[tenant]/             # rutas internas por tenant (reescritas por proxy)
      layout.tsx            # inyecta design tokens del branding
      page.tsx              # storefront (vacío en Fase 0)
      panel/page.tsx        # dashboard (vacío, protegido por auth)
  components/
    ui/                     # design system base (Button, Card, Input, Badge)
    tenant/ panel/          # componentes de storefront y panel
functions/                  # Cloud Functions (esqueleto; lógica sensible)
scripts/seed.ts             # tenants semilla + usuarios con claims
tests/rules/                # test de aislamiento de Security Rules
firestore.rules             # la cerradura dura del aislamiento
```

## Producción (cuando toque)

1. Crear el proyecto Firebase real y reemplazar los valores de `.env.local`
   (ver [.env.example](.env.example)); en Vercel cargar además
   `FIREBASE_SERVICE_ACCOUNT` (JSON del service account).
2. Apuntar el wildcard `*.midominio.com` al proyecto de Vercel y setear
   `NEXT_PUBLIC_ROOT_DOMAIN=midominio.com`.
3. `firebase deploy --only firestore:rules,functions`.

## Roadmap

- **Fase 1 (MVP vendible)**:
  - ✅ Entrega 1: catálogo (CRUD en panel + menú público en tiempo real).
  - ✅ Entrega 2: carrito + `createOrder` en Cloud Functions (precios del
    server, número secuencial, nace "por confirmar") + cola de pedidos en
    vivo con aceptar/rechazar, avance de estados y marcar cobrado.
  - ✅ Entrega 3 (parte local): KDS con timers y colores por antigüedad
    (`/panel/cocina`), alerta sonora de pedido nuevo, estadísticas del día
    (`/panel`), horarios de apertura + pausa manual (`/panel/config`,
    enforcement server-side), rate limit por teléfono (3 pedidos/30 min) y
    tracking público sin PII (`/pedido/{id}`, trigger `syncTracking`).
  - ⏭ Entrega 3 (requiere cuentas externas): MercadoPago Checkout Pro
    (OAuth por tenant + webhook `confirmPayment`), OTP por WhatsApp/SMS,
    Cloudflare Turnstile, notificaciones de estado al cliente.
- **Fase 2**: landing comercial + alta self-service con provisioning.
- **Fase 3+**: Plan Presencia, Plan Pro (loyalty, BI, tracking GPS), add-ons.
