import { z } from 'zod';

// ─── Helpers de validación reutilizables ──────────────────────
const positiveNumber = z.coerce.number().min(0, 'Debe ser un número positivo');
const positiveInt = z.coerce.number().int().min(0, 'Debe ser un entero positivo');
const requiredText = (field: string) =>
  z.string().min(1, `${field} es requerido`).trim();
const phone = z.string().regex(/^\d{7,15}$/, 'Teléfono inválido (7-15 dígitos)').optional().or(z.literal(''));
const email = z.string().email('Email inválido').optional().or(z.literal(''));
const taxId = z.string().min(5, 'NIT/RUT demasiado corto').max(20, 'NIT/RUT demasiado largo');

// ─── Producto ─────────────────────────────────────────────────
export const ProductSchema = z.object({
  name: requiredText('Nombre'),
  barcode: z.string().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
  cost: positiveNumber,
  suggested_price: positiveNumber,
  discount_price: positiveNumber,
  wholesale_price: positiveNumber,
  current_price: positiveNumber.refine((v) => v > 0, 'El precio de venta debe ser mayor a 0'),
  stock: positiveInt,
  min_stock: positiveInt,
  has_iva: z.boolean().default(false),
  category_id: z.string().uuid('Categoría inválida').optional().nullable(),
  supplier_id: z.string().uuid('Proveedor inválido').optional().nullable(),
}).refine(
  (data) => data.current_price >= data.cost,
  { message: 'El precio de venta no puede ser menor al costo', path: ['current_price'] },
);

export type ProductFormData = z.infer<typeof ProductSchema>;

// ─── Cliente ──────────────────────────────────────────────────
export const CustomerSchema = z.object({
  full_name: requiredText('Nombre completo'),
  document_type: z.enum(['CC', 'NIT', 'CE', 'PP', 'TI']).default('CC'),
  document: z.string().min(4, 'Documento demasiado corto').optional().or(z.literal('')),
  phone: phone,
  mobile: phone,
  email: email,
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof CustomerSchema>;

// ─── Proveedor ────────────────────────────────────────────────
export const SupplierSchema = z.object({
  tax_id_type: z.enum(['NIT', 'CC', 'CE', 'Passport']).default('NIT'),
  tax_id: taxId,
  fiscal_name: requiredText('Razón social'),
  commercial_name: z.string().optional(),
  address: z.string().optional(),
  phone: phone,
  mobile: phone,
  email: email,
  city: z.string().optional(),
  country: z.string().optional(),
  payment_terms: z.string().optional(),
  observations: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type SupplierFormData = z.infer<typeof SupplierSchema>;

// ─── Venta ────────────────────────────────────────────────────
export const SaleItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  quantity: z.number().int().min(1, 'Cantidad mínima: 1'),
  unit_price: z.number().min(0),
  cost: z.number().min(0),
  total: z.number().min(0),
  has_iva: z.boolean().default(false),
  iva_amount: z.number().min(0).default(0),
});

export const CreateSaleSchema = z.object({
  advisor_id: z.string().uuid('Asesor requerido'),
  customer_id: z.string().uuid().optional().nullable(),
  items: z.array(SaleItemSchema).min(1, 'Debe agregar al menos un producto'),
  discount: z.number().min(0).default(0),
  type: z.enum(['sale', 'quote', 'reserved']).default('sale'),
  payment_method: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['cash', 'electronic', 'credit']),
  }),
  deposit: z.number().min(0).default(0),
  notes: z.string().optional(),
}).refine(
  (data) => data.type !== 'reserved' || data.deposit > 0,
  { message: 'Un separado requiere un abono inicial', path: ['deposit'] },
);

export type CreateSaleFormData = z.infer<typeof CreateSaleSchema>;

// ─── Ajuste de stock ──────────────────────────────────────────
export const StockAdjustmentSchema = z.object({
  product_id: z.string().uuid(),
  new_stock: z.number().int().min(0, 'Stock no puede ser negativo'),
  reason: z.string().min(5, 'Describe el motivo del ajuste (mín. 5 caracteres)'),
});

export type StockAdjustmentFormData = z.infer<typeof StockAdjustmentSchema>;

// ─── Categoría ────────────────────────────────────────────────
export const CategorySchema = z.object({
  name: requiredText('Nombre de categoría'),
  description: z.string().optional(),
});

export type CategoryFormData = z.infer<typeof CategorySchema>;

// ─── Usuario / Perfil ─────────────────────────────────────────
export const UserSchema = z.object({
  name: requiredText('Nombre'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').optional(),
  role: z.enum(['super_admin','admin','manager','cashier','advisor','accountant','warehouse','viewer']),
  is_active: z.boolean().default(true),
});

export type UserFormData = z.infer<typeof UserSchema>;

// ─── Helpers de parseo seguro ─────────────────────────────────
export function safeParse<T>(schema: z.ZodType<T>, data: unknown):
  { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: result.error };
}

export function getFieldError(errors: z.ZodError, field: string): string | undefined {
  return errors.errors.find((e) => e.path.join('.') === field)?.message;
}
