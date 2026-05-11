# Migraciones SQL — Supabase

Ejecutar en orden en **Supabase > SQL Editor**. Cada archivo es idempotente
(`create table if not exists`, `create index if not exists`) y puede re-ejecutarse
sin errores si algo falla a mitad.

## Orden de ejecución

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `001_categories_products_suppliers.sql` | Categorías, Productos, Proveedores + trigger `updated_at` |
| 2 | `002_advisors_methods_customers.sql` | Asesores, Métodos de Pago, Clientes |
| 3 | `003_sales.sql` | Ventas, Items, Abonos, Devoluciones |
| 4 | `004_purchases.sql` | Compras (remisiones/facturas), Items, Pagos |
| 5 | `005_accounting.sql` | Bancos, Registros Contables, Caja, Gastos |
| 6 | `006_settings.sql` | Configuración clave-valor + valores por defecto |
| 7 | `007_warehouse_stock.sql` | Bodegas Externas, Transacciones, Conteos de Stock |
| 8 | `008_rls_policies.sql` | Row Level Security en todas las tablas |
| 9 | `009_indexes.sql` | Índices para consultas frecuentes |

> **Importante**: el archivo `001` crea la función `set_updated_at()` que usan
> los archivos `004` y `007`. Siempre ejecutar `001` primero.

## Notas de diseño

### JSONB para objetos anidados
`payment_method`, `payment_details` y `method` (en abonos) se almacenan como
`jsonb` porque en el dominio son objetos con estructura variable. El repositorio
Supabase los serializa/deserializa con `JSON.stringify` / `JSON.parse`.

### IDs semánticos en `banks`
La tabla `banks` usa `text` como clave primaria (`'efectivo'`, `'caja-principal'`)
para mantener compatibilidad con el sistema contable que referencia bancos por nombre.

### `accounting_records.id` es `bigserial`
El tipo TypeScript `AccountingRecord.id: number` requiere un entero, no UUID.

### `expenses.created_at` es `text`
El tipo TypeScript `Expense.createdAt: string` espera una cadena ISO.
La columna almacena el valor como texto para evitar conversiones en el repositorio.

### RLS
Todos los accesos requieren `auth.role() = 'authenticated'`. No hay acceso
público a ninguna tabla. Las imágenes de productos usan Supabase Storage
(ver `SUPABASE_SETUP.md`).

## Variables de entorno requeridas

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

El contenedor (`src/infrastructure/container.ts`) detecta automáticamente si
Supabase está configurado con `import.meta.env.VITE_SUPABASE_URL`. Si no hay
URL, usa implementaciones localStorage como fallback.
