// ─── Capa de seguridad frontend (OWASP ASVS) ─────────────────

// ─── 1. Sanitización de inputs ────────────────────────────────
// Previene XSS básico al escapar caracteres peligrosos.
// NO usar innerHTML con estos valores — usar textContent o React que ya escapa.
export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, (c) => {
      const map: Record<string, string> = {
        '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '&': '&amp;',
      };
      return map[c] ?? c;
    })
    .trim();
}

// Sanitizar solo números y punto decimal
export function sanitizeNumber(input: string): string {
  return input.replace(/[^0-9.]/g, '');
}

// Sanitizar código de barras (solo alfanumérico + guión)
export function sanitizeBarcode(input: string): string {
  return input.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 30);
}

// Sanitizar búsqueda (previene SQL injection en nivel app)
export function sanitizeSearch(input: string): string {
  // Supabase usa prepared statements, pero limitamos caracteres peligrosos
  return input.replace(/['";\-\-\/\*]/g, '').slice(0, 100).trim();
}

// ─── 2. Rate Limiting en UI (Token Bucket) ───────────────────
// Previene spam de formularios, fuerza bruta en búsquedas, etc.
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,   // tokens máximos
    private readonly refillRate: number, // tokens por segundo
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(cost = 1): boolean {
    this.refill();
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1_000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Buckets por operación
const buckets: Map<string, TokenBucket> = new Map();

export function checkRateLimit(
  operation: string,
  capacity = 10,
  refillPerSecond = 2,
): boolean {
  if (!buckets.has(operation)) {
    buckets.set(operation, new TokenBucket(capacity, refillPerSecond));
  }
  return buckets.get(operation)!.consume();
}

// ─── 3. Validación de integridad de datos ────────────────────
// Detecta manipulación de valores críticos en formularios
export interface SaleIntegrityCheck {
  valid: boolean;
  errors: string[];
}

export function checkSaleIntegrity(data: {
  items: Array<{ quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  discount: number;
  total: number;
  maxDiscountPct?: number;
}): SaleIntegrityCheck {
  const errors: string[] = [];

  // Verificar que cada item.total = quantity * unitPrice
  for (const item of data.items) {
    const expected = Math.round(item.quantity * item.unitPrice);
    const actual   = Math.round(item.total);
    if (Math.abs(expected - actual) > 1) { // tolerancia de 1 peso por redondeo
      errors.push(`Item inconsistente: ${item.quantity} × $${item.unitPrice} ≠ $${item.total}`);
    }
    if (item.quantity <= 0) errors.push('Cantidad debe ser positiva');
    if (item.unitPrice < 0) errors.push('Precio no puede ser negativo');
  }

  // Verificar subtotal = suma de items
  const itemsSum = data.items.reduce((s, i) => s + i.total, 0);
  if (Math.abs(itemsSum - data.subtotal) > 1) {
    errors.push(`Subtotal inconsistente: suma items $${itemsSum} ≠ $${data.subtotal}`);
  }

  // Verificar total = subtotal - descuento
  const expectedTotal = data.subtotal - data.discount;
  if (Math.abs(expectedTotal - data.total) > 1) {
    errors.push(`Total inconsistente: $${data.subtotal} - $${data.discount} ≠ $${data.total}`);
  }

  // Verificar límite de descuento
  if (data.maxDiscountPct !== undefined && data.subtotal > 0) {
    const discountPct = (data.discount / data.subtotal) * 100;
    if (discountPct > data.maxDiscountPct) {
      errors.push(`Descuento ${discountPct.toFixed(1)}% supera límite ${data.maxDiscountPct}%`);
    }
  }

  // Verificar que total no sea negativo
  if (data.total < 0) {
    errors.push('Total no puede ser negativo');
  }

  return { valid: errors.length === 0, errors };
}

// ─── 4. Secure Storage ────────────────────────────────────────
// Abstracción sobre localStorage que rechaza datos sensibles
// y serializa correctamente.
const FORBIDDEN_KEYS = ['password', 'token', 'secret', 'key', 'auth'];

export const secureStorage = {
  set(key: string, value: unknown): void {
    if (FORBIDDEN_KEYS.some(f => key.toLowerCase().includes(f))) {
      console.warn(`[Security] Attempted to store sensitive key: ${key}`);
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage lleno u otro error: ignorar silenciosamente
    }
  },
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  remove(key: string): void {
    localStorage.removeItem(key);
  },
};

// ─── 5. Device Fingerprint básico ────────────────────────────
// Para detectar login desde dispositivos nuevos (no es identificación biométrica).
export function getDeviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    new Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen.width + 'x' + screen.height,
    navigator.hardwareConcurrency,
  ].join('|');

  // Hash simple (djb2) — no criptográfico, solo para identificar dispositivo
  let hash = 5381;
  for (let i = 0; i < parts.length; i++) {
    hash = ((hash << 5) + hash) + parts.charCodeAt(i);
    hash = hash & hash; // 32-bit int
  }
  return Math.abs(hash).toString(36);
}

// ─── 6. Detección de apertura en múltiples tabs ──────────────
// Evita que dos tabs tengan sesión de caja simultáneamente
let tabChannel: BroadcastChannel | null = null;

export function initTabDetection(onConflict: () => void): () => void {
  if (!('BroadcastChannel' in window)) return () => {};

  tabChannel = new BroadcastChannel('2rd_pos_tab');
  const tabId = Math.random().toString(36).slice(2);

  tabChannel.postMessage({ type: 'TAB_OPENED', tabId });

  tabChannel.addEventListener('message', (e: MessageEvent) => {
    if (e.data.type === 'TAB_OPENED' && e.data.tabId !== tabId) {
      onConflict();
    }
  });

  return () => tabChannel?.close();
}

// ─── 7. Content Security Policy headers (para vercel.json) ───
// Referencia: estos headers van en vercel.json, no en el código.
// Incluirlos aquí como documentación/exportación para CI.
export const CSP_DIRECTIVES = {
  "default-src":     ["'self'"],
  "script-src":      ["'self'", "'unsafe-inline'"],  // unsafe-inline requerido por Vite build
  "style-src":       ["'self'", "'unsafe-inline'"],
  "img-src":         ["'self'", "data:", "blob:", "https://*.supabase.co"],
  "font-src":        ["'self'"],
  "connect-src":     ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
  "frame-ancestors": ["'none'"],                     // Anti-clickjacking
  "form-action":     ["'self'"],
  "base-uri":        ["'self'"],
  "object-src":      ["'none'"],
  "worker-src":      ["'self'"],
} as const;

export function buildCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}
