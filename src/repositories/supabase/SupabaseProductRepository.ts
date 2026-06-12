// Implementación Supabase de IProductRepository.
//
// SCHEMA SQL requerido (ejecutar en Supabase SQL Editor):
// ─────────────────────────────────────────────────────
// create table products (
//   id          uuid primary key default gen_random_uuid(),
//   name        text not null,
//   barcode     text,
//   reference   text,
//   description text,
//   image       text,
//   cost        numeric not null default 0,
//   suggested_price  numeric not null default 0,
//   discount_price   numeric not null default 0,
//   wholesale_price  numeric not null default 0,
//   current_price    numeric not null default 0,
//   stock            integer not null default 0,
//   min_stock        integer not null default 0,
//   reserved_stock   integer default 0,
//   has_iva          boolean default false,
//   category_id      uuid references categories(id),
//   supplier_id      uuid,
//   created_at  timestamptz default now(),
//   updated_at  timestamptz default now()
// );
// alter table products enable row level security;
// create policy "Authenticated users" on products for all using (auth.role() = 'authenticated');

import { supabase } from '@/lib/supabase';
import type { Product } from '@/types/product';
import type { IProductRepository } from '../interfaces/IProductRepository';
import type { CreateProductInput } from '@/domain/inventory';

function toProduct(row: Record<string, unknown>): Product {
  return {
    id:             row.id as string,
    name:           row.name as string,
    barcode:        (row.barcode as string) ?? '',
    reference:      (row.reference as string) ?? '',
    description:    (row.description as string) ?? '',
    image:          (row.image as string) ?? '',
    cost:           Number(row.cost),
    suggestedPrice: Number(row.suggested_price),
    discountPrice:  Number(row.discount_price),
    wholesalePrice: Number(row.wholesale_price),
    currentPrice:   Number(row.current_price),
    stock:          Number(row.stock),
    minStock:       Number(row.min_stock),
    reservedStock:  Number(row.reserved_stock ?? 0),
    hasIva:         Boolean(row.has_iva),
    categoryId:     (row.category_id as string) ?? '',
    supplierId:     (row.supplier_id as string) ?? '',
    createdAt:      new Date(row.created_at as string),
    updatedAt:      new Date(row.updated_at as string),
  };
}

function toRow(data: Partial<Product> & Partial<CreateProductInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.name           !== undefined) row.name            = data.name;
  if (data.barcode        !== undefined) row.barcode         = data.barcode;
  if (data.reference      !== undefined) row.reference       = data.reference;
  if (data.description    !== undefined) row.description     = data.description;
  if (data.image          !== undefined) row.image           = data.image;
  if (data.cost           !== undefined) row.cost            = data.cost;
  if (data.suggestedPrice !== undefined) row.suggested_price = data.suggestedPrice;
  if (data.discountPrice  !== undefined) row.discount_price  = data.discountPrice;
  if (data.wholesalePrice !== undefined) row.wholesale_price = data.wholesalePrice;
  if (data.currentPrice   !== undefined) row.current_price   = data.currentPrice;
  if (data.stock          !== undefined) row.stock           = data.stock;
  if (data.minStock       !== undefined) row.min_stock       = data.minStock;
  if (data.reservedStock  !== undefined) row.reserved_stock  = data.reservedStock;
  if (data.hasIva         !== undefined) row.has_iva         = data.hasIva;
  if (data.categoryId     !== undefined) row.category_id     = data.categoryId || null;
  if (data.supplierId     !== undefined) row.supplier_id     = data.supplierId || null;
  return row;
}

export class SupabaseProductRepository implements IProductRepository {
  private readonly table = 'products';

  async findAll(): Promise<Product[]> {
    const { data, error } = await supabase.from(this.table).select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toProduct);
  }

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await supabase.from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toProduct(data) : null;
  }

  async create(data: CreateProductInput): Promise<Product> {
    const row = { ...toRow(data), reserved_stock: 0 };
    const { data: inserted, error } = await supabase.from(this.table).insert(row).select().single();
    if (error) throw new Error(error.message);
    return toProduct(inserted);
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const row = { ...toRow(data), updated_at: new Date().toISOString() };
    const { data: updated, error } = await supabase
      .from(this.table).update(row).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toProduct(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('barcode', barcode).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toProduct(data) : null;
  }

  async findByReference(reference: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('reference', reference).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toProduct(data) : null;
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('category_id', categoryId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toProduct);
  }

  async findBySupplier(supplierId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('supplier_id', supplierId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toProduct);
  }

  async getLowStock(): Promise<Product[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').gt('stock', 0).lte('stock', supabase.from(this.table).select('min_stock'));
    if (error) throw new Error(error.message);
    // Filtro final en memoria (Supabase no soporta column comparisons directamente en lte)
    return (data ?? []).map(toProduct).filter(p => p.stock <= p.minStock);
  }

  async updateStock(id: string, delta: number, reservedDelta?: number): Promise<void> {
    const { error } = await supabase.rpc('update_product_stock', {
      p_product_id:     id,
      p_delta:          delta,
      p_reserved_delta: reservedDelta ?? 0,
    });
    if (error) throw new Error(error.message);
  }
}
