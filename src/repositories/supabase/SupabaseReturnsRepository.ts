import { supabase } from '@/lib/supabase';
import type { SaleReturn, SaleItem } from '@/types';
import type { PaymentMethod } from '@/types/shared';

type Row = Record<string, unknown>;

function toReturn(row: Row): SaleReturn {
  const items: SaleItem[] = ((row.sale_return_items ?? []) as Row[]).map(i => ({
    productId:   i.product_id as string,
    productName: i.product_name as string,
    description: (i.description as string) ?? '',
    cost:        Number(i.cost),
    quantity:    Number(i.quantity),
    unitPrice:   Number(i.unit_price),
    total:       Number(i.total),
    hasIva:      false,
    ivaAmount:   0,
  }));
  return {
    id:            row.id as string,
    returnNumber:  row.return_number as string,
    saleId:        row.sale_id as string,
    saleNumber:    row.sale_number as string,
    advisorId:     row.advisor_id as string,
    advisorName:   row.advisor_name as string,
    items,
    subtotal:      Number(row.subtotal),
    total:         Number(row.total),
    reason:        (row.reason as string) ?? '',
    paymentMethod: row.payment_method as PaymentMethod | undefined,
    createdAt:     new Date(row.created_at as string),
  };
}

export class SupabaseReturnsRepository {
  private readonly table = 'sale_returns';

  async findAll(): Promise<SaleReturn[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select('*, sale_return_items(*)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toReturn(r as Row));
  }

  async create(data: {
    saleId: string; saleNumber: string;
    advisorId: string; advisorName: string;
    items: SaleItem[]; reason: string;
    paymentMethod?: PaymentMethod;
  }): Promise<SaleReturn> {
    const subtotal = data.items.reduce((s, i) => s + i.total, 0);
    const returnNumber = `DEV${Date.now()}`;

    const { data: inserted, error } = await supabase
      .from(this.table)
      .insert({
        return_number:  returnNumber,
        sale_id:        data.saleId,
        sale_number:    data.saleNumber,
        advisor_id:     data.advisorId,
        advisor_name:   data.advisorName,
        subtotal,
        total:          subtotal,
        reason:         data.reason,
        payment_method: data.paymentMethod ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.items.length > 0) {
      const itemRows = data.items.map(i => ({
        return_id:    inserted.id,
        product_id:   i.productId,
        product_name: i.productName,
        description:  i.description ?? '',
        cost:         i.cost,
        quantity:     i.quantity,
        unit_price:   i.unitPrice,
        total:        i.total,
      }));
      const { error: ie } = await supabase.from('sale_return_items').insert(itemRows);
      if (ie) throw new Error(ie.message);
    }

    return { ...toReturn(inserted as Row), items: data.items };
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
