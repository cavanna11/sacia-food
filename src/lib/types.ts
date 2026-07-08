/** Tipos base del dominio multi-tenant (Fase 0: solo esqueleto). */

export type TenantPlan = "presencia" | "gestion" | "pro";
export type TenantStatus = "active" | "suspended" | "trial";

/** Roles dentro de un tenant. `superadmin` es de plataforma (nosotros). */
export type UserRole = "owner" | "staff" | "kitchen" | "rider" | "superadmin";

export interface TenantBranding {
  /** Nombre visible del comercio. */
  name: string;
  /** Logo (URL o data URI). Opcional: hay fallback con inicial. */
  logoUrl?: string;
  coverUrl?: string;
  colors: {
    /** Color de marca principal (hex). */
    primary: string;
    /** Color de acento (hex). */
    accent: string;
    /** Modo base del storefront. */
    mode: "light" | "dark";
  };
  /** Clave de tipografía dentro del set curado (Fase 0: solo "sans"). */
  font?: string;
}

/** Zona de reparto con su costo de envío (sin geocerca todavía). */
export interface DeliveryZone {
  id: string;
  name: string;
  /** Costo de envío en ARS, entero (0 = envío gratis en la zona). */
  fee: number;
}

/** Configuración operativa del tenant (editable por el dueño desde el panel). */
export interface TenantConfig {
  /** Interruptor manual: pausar pedidos ya (independiente del horario). */
  acceptingOrders: boolean;
  /** Ventana diaria de apertura, formato "HH:MM" (24 hs). */
  hours?: { open: string; close: string };
  /** IANA timezone; default America/Argentina/Buenos_Aires. */
  timezone?: string;
  /** Zonas de reparto. Si hay al menos una, el delivery exige elegir zona. */
  deliveryZones?: DeliveryZone[];
}

export interface TenantDoc {
  subdomain: string;
  plan: TenantPlan;
  status: TenantStatus;
  branding: TenantBranding;
  config?: TenantConfig;
  createdAt: number;
}

/** Custom claims que viajan en el token de Firebase Auth. */
export interface TenantClaims {
  tenantId?: string;
  role?: UserRole;
}

/**
 * Estados del pedido (referencia de dominio: AB Burgers).
 * `por_confirmar`: no dispara a cocina hasta que el comercio acepta
 * (anti-fraude capa 3 — efectivo y clientes nuevos).
 */
export type OrderStatus =
  | "por_confirmar"
  | "recibido"
  | "en_preparacion"
  | "listo"
  | "en_camino"
  | "entregado"
  | "rechazado";

export type OrderChannel = "takeaway" | "delivery";
export type PaymentMethod = "cash"; // mercadopago llega en la entrega 3
export type PaymentStatus = "pending" | "paid";

export interface OrderItem {
  productId: string;
  /** Nombre y precio congelados al momento del pedido (server-side). */
  name: string;
  price: number;
  qty: number;
  subtotal: number;
}

/** Pedido (tenants/{id}/orders/{orderId}). Se crea SOLO via Cloud Function. */
export interface OrderDoc {
  /** Número secuencial por tenant, para cantar en cocina ("¡el 42!"). */
  number: number;
  items: OrderItem[];
  /** Total final: items + envío. Siempre calculado server-side. */
  total: number;
  /** Costo de envío aplicado (solo delivery con zonas configuradas). */
  deliveryFee?: number;
  /** Nombre de la zona elegida (congelado al momento del pedido). */
  zoneName?: string;
  customer: { name: string; phone: string };
  channel: OrderChannel;
  address?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

/**
 * Estado público del pedido (tenants/{id}/tracking/{orderId}).
 * Lo publica un trigger server-side SIN datos personales: el cliente final
 * lo sigue desde /pedido/{orderId} sin cuenta (el ID es inadivinable).
 */
export interface TrackingDoc {
  number: number;
  status: OrderStatus;
  channel: OrderChannel;
  total: number;
  createdAt: number;
  updatedAt: number;
}

/** Payload que el storefront manda a la Cloud Function createOrder. */
export interface CreateOrderInput {
  tenantId: string;
  items: { productId: string; qty: number }[];
  customer: { name: string; phone: string };
  channel: OrderChannel;
  address?: string;
  /** Requerido si el tenant tiene zonas configuradas y el canal es delivery. */
  zoneId?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
}

/** Producto del catálogo (tenants/{id}/products/{productId}). */
export interface ProductDoc {
  name: string;
  description?: string;
  /** Precio en pesos argentinos, entero. */
  price: number;
  category: string;
  available: boolean;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}
