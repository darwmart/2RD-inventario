import { supabase } from '@/lib/supabase';
import type { StockCount, StockCountItem } from '@/types';

type Row = Record<string, unknown>;

function toCount(row: Row): StockCount {
  const items: StockCountItem[] = ((row.stock_count_items ?? []) as Row[]).map(i => ({
    productId:    i.product_id as string,
    productName:  i.product_name as string,
    barcode:      (i.barcode as string) ?? undefined,
    reference:    (i.reference as string) ?? undefined,
    systemStock:  Number(i.system_stock),
    countedStock: Number(i.counted_stock),
    difference:   Number(i.difference),
  }));
  return {
    id:          row.id as string,
    countNumber: row.count_number as string,
    status:      row.status as StockCount['status'],
    items,
    notes:       (row.notes as string) ?? undefined,
    createdAt:   new Date(row.created_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
  };
}

export class SupabaseStockCountRepository {
  private readonly table = 'stock_counts';

  async findAll(): Promise<StockCount[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select('*, stock_count_items(*)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toCount(r as Row));
  }

  async create(items: Omit<StockCountItem, 'difference'>[], notes?: string): Promise<StockCount> {
    const countNumber = `INV${Date.now()}`;
    const { data: inserted, error } = await supabase
      .from(this.table)
      .insert({ count_number: countNumber, status: 'draft', notes: notes ?? null })
      .select().single();
    if (error) throw new Error(error.message);

    if (items.length > 0) {
      const rows = items.map(i => ({
        count_id:      inserted.id,
        product_id:    i.productId,
        product_name:  i.productName,
        barcode:       i.barcode ?? null,
        reference:     i.reference ?? null,
        system_stock:  i.systemStock,
        counted_stock: i.countedStock,
      }));
      const { error: ie } = await supabase.from('stock_count_items').insert(rows);
      if (ie) throw new Error(ie.message);
    }

    const itemsWithDiff: StockCountItem[] = items.map(i => ({
      ...i, difference: i.countedStock - i.systemStock,
    }));
    return { ...toCount(inserted as Row), items: itemsWithDiff };
  }

  async updateItems(id: string, items: StockCountItem[]): Promise<void> {
    await supabase.from('stock_count_items').delete().eq('count_id', id);
    if (items.length > 0) {
      const rows = items.map(i => ({
        count_id:      id,
        product_id:    i.productId,
        product_name:  i.productName,
        barcode:       i.barcode ?? null,
        reference:     i.reference ?? null,
        system_stock:  i.systemStock,
        counted_stock: i.countedStock,
      }));
      await supabase.from('stock_count_items').insert(rows);
    }
  }

  async complete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.table)
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
