import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import type { Sale, SaleItem } from '@/types/sale';
import type { PaymentMethod, Deposit } from '@/types/shared';
import type { ISaleRepository } from '../interfaces/ISaleRepository';
import type { CreateSaleInput } from '@/domain/sales';
import { buildSale, filterSalesByDate } from '@/domain/sales';

// ─── TIPOS DE FILA ───────────────────────────────────────────────────────────

type SaleRow = {
  id: string;
  sale_number: string;
  advisor_id: string;
  advisor_name: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  iva_total: number;
  commission: number | null;
  commission_amount: number | null;
  reteiva_amount: number | null;
  payment_method: unknown;
  customer_name: string | null;
  customer_document: string | null;
  customer_phone: string | null;
  deposit: number;
  status: string;
  type: string;
  created_at: string;
  sale_items?: SaleItemRow[];
  sale_deposits?: SaleDepositRow[];
};

type SaleItemRow = {
  product_id: string;
  product_name: string;
  description: string;
  cost: number;
  quantity: number;
  unit_price: number;
  total: number;
  has_iva: boolean;
  iva_amount: number;
  sort_order: number;
};

type SaleDepositRow = {
  id: string;
  amount: number;
  method: unknown;
  created_at: string;
};

// ─── MAPEADORES ──────────────────────────────────────────────────────────────

function toSale(row: SaleRow): Sale {
  const items: SaleItem[] = (row.sale_items ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(r => ({
      productId:   r.product_id,
      productName: r.product_name,
      description: r.description ?? '',
      cost:        Number(r.cost),
      quantity:    Number(r.quantity),
      unitPrice:   Number(r.unit_price),
      total:       Number(r.total),
      hasIva:      Boolean(r.has_iva),
      ivaAmount:   Number(r.iva_amount ?? 0),
    }));

  const deposits: Deposit[] = (row.sale_deposits ?? []).map(d => ({
    id:        d.id,
    amount:    Number(d.amount),
    method:    d.method as PaymentMethod,
    createdAt: new Date(d.created_at),
  }));

  return {
    id:               row.id,
    saleNumber:       row.sale_number,
    advisorId:        row.advisor_id,
    advisorName:      row.advisor_name,
    customerId:       row.customer_id ?? undefined,
    items,
    subtotal:         Number(row.subtotal),
    discount:         Number(row.discount),
    total:            Number(row.total),
    ivaTotal:         row.iva_total    ? Number(row.iva_total)         : undefined,
    commission:       row.commission   ? Number(row.commission)        : undefined,
    commissionAmount: row.commission_amount ? Number(row.commission_amount) : undefined,
    reteivaAmount:    row.reteiva_amount    ? Number(row.reteiva_amount)    : undefined,
    paymentMethod:    row.payment_method as PaymentMethod,
    customerName:     row.customer_name     ?? undefined,
    customerDocument: row.customer_document ?? undefined,
    customerPhone:    row.customer_phone    ?? undefined,
    deposit:          Number(row.deposit),
    deposits:         deposits.length > 0 ? deposits : undefined,
    status:           row.status as Sale['status'],
    type:             row.type   as Sale['type'],
    createdAt:        new Date(row.created_at),
  };
}

function toSaleRow(sale: Sale): Record<string, unknown> {
  return {
    id:                sale.id,
    sale_number:       sale.saleNumber,
    advisor_id:        sale.advisorId,
    advisor_name:      sale.advisorName,
    customer_id:       sale.customerId    ?? null,
    subtotal:          sale.subtotal,
    discount:          sale.discount      ?? 0,
    total:             sale.total,
    iva_total:         sale.ivaTotal      ?? 0,
    commission:        sale.commission    ?? null,
    commission_amount: sale.commissionAmount ?? null,
    reteiva_amount:    sale.reteivaAmount ?? null,
    payment_method:    sale.paymentMethod,
    customer_name:     sale.customerName     ?? null,
    customer_document: sale.customerDocument ?? null,
    customer_phone:    sale.customerPhone    ?? null,
    deposit:           sale.deposit          ?? 0,
    status:            sale.status,
    type:              sale.type,
    created_at:        new Date().toISOString(),
  };
}

const SELECT_WITH_RELATIONS = '*, sale_items(*), sale_deposits(*)';

// ─── REPOSITORIO ─────────────────────────────────────────────────────────────

export class SupabaseSaleRepository implements ISaleRepository {
  private readonly table = 'sales';

  async findAll(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select(SELECT_WITH_RELATIONS)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toSale(r as unknown as SaleRow));
  }

  async findById(id: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from(this.table)
      .select(SELECT_WITH_RELATIONS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toSale(data as unknown as SaleRow) : null;
  }

  async create(data: CreateSaleInput): Promise<Sale> {
    const sale = buildSale(data);

    // 1 — Insertar cabecera de venta
    const { error: saleError } = await supabase
      .from(this.table)
      .insert(toSaleRow(sale));
    if (saleError) throw new Error(saleError.message);

    // 2 — Insertar items
    if (sale.items.length > 0) {
      const itemRows = sale.items.map((item, idx) => ({
        sale_id:      sale.id,
        product_id:   item.productId,
        product_name: item.productName,
        description:  item.description  ?? '',
        cost:         item.cost,
        quantity:     item.quantity,
        unit_price:   item.unitPrice,
        total:        item.total,
        has_iva:      item.hasIva        ?? false,
        iva_amount:   item.ivaAmount     ?? 0,
        sort_order:   idx,
      }));
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemRows);
      if (itemsError) throw new Error(itemsError.message);
    }

    // 3 — Insertar abono inicial (si es separado con depósito)
    if (sale.deposits && sale.deposits.length > 0) {
      const depositRows = sale.deposits.map(d => ({
        id:         d.id,
        sale_id:    sale.id,
        amount:     d.amount,
        method:     d.method,
        created_at: new Date().toISOString(),
      }));
      const { error: depositsError } = await supabase
        .from('sale_deposits')
        .insert(depositRows);
      if (depositsError) throw new Error(depositsError.message);
    }

    return sale;
  }

  async update(id: string, data: Partial<Sale>): Promise<Sale> {
    // Extraemos los campos anidados — no se actualizan en update normal
    const { items: _items, deposits: _deposits, ...flat } = data;

    const row: Record<string, unknown> = {};
    if (flat.status           !== undefined) row.status            = flat.status;
    if (flat.type             !== undefined) row.type              = flat.type;
    if (flat.discount         !== undefined) row.discount          = flat.discount;
    if (flat.deposit          !== undefined) row.deposit           = flat.deposit;
    if (flat.paymentMethod    !== undefined) row.payment_method    = flat.paymentMethod;
    if (flat.commission       !== undefined) row.commission        = flat.commission;
    if (flat.commissionAmount !== undefined) row.commission_amount = flat.commissionAmount;
    if (flat.reteivaAmount    !== undefined) row.reteiva_amount    = flat.reteivaAmount;
    if (flat.customerId       !== undefined) row.customer_id       = flat.customerId    ?? null;
    if (flat.customerName     !== undefined) row.customer_name     = flat.customerName  ?? null;
    if (flat.customerDocument !== undefined) row.customer_document = flat.customerDocument ?? null;
    if (flat.customerPhone    !== undefined) row.customer_phone    = flat.customerPhone ?? null;

    const { data: updated, error } = await supabase
      .from(this.table)
      .update(row)
      .eq('id', id)
      .select(SELECT_WITH_RELATIONS)
      .single();
    if (error) throw new Error(error.message);
    return toSale(updated as unknown as SaleRow);
  }

  async delete(id: string): Promise<void> {
    // sale_items y sale_deposits se eliminan en cascada (ON DELETE CASCADE)
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findByDate(dateKey: string): Promise<Sale[]> {
    // Filtramos en memoria usando la misma función del dominio
    const all = await this.findAll();
    return filterSalesByDate(all, dateKey);
  }

  async findByAdvisor(advisorId: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select(SELECT_WITH_RELATIONS)
      .eq('advisor_id', advisorId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toSale(r as unknown as SaleRow));
  }

  async findByCustomer(customerId: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select(SELECT_WITH_RELATIONS)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toSale(r as unknown as SaleRow));
  }

  async findByStatus(status: Sale['status']): Promise<Sale[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select(SELECT_WITH_RELATIONS)
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toSale(r as unknown as SaleRow));
  }

  async findByType(type: Sale['type']): Promise<Sale[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select(SELECT_WITH_RELATIONS)
      .eq('type', type)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toSale(r as unknown as SaleRow));
  }

  async addDeposit(saleId: string, amount: number, method: PaymentMethod): Promise<Sale> {
    const sale = await this.findById(saleId);
    if (!sale) throw new Error(`Venta ${saleId} no encontrada`);

    const deposit: Deposit = { id: uuidv4(), amount, method, createdAt: new Date() };

    // Insertar registro de abono
    const { error: depError } = await supabase.from('sale_deposits').insert({
      id:         deposit.id,
      sale_id:    saleId,
      amount:     deposit.amount,
      method:     deposit.method,
      created_at: deposit.createdAt.toISOString(),
    });
    if (depError) throw new Error(depError.message);

    // Actualizar total acumulado en la cabecera
    const newDeposit = (sale.deposit ?? 0) + amount;
    const { error: updateError } = await supabase
      .from(this.table)
      .update({ deposit: newDeposit })
      .eq('id', saleId);
    if (updateError) throw new Error(updateError.message);

    return {
      ...sale,
      deposit: newDeposit,
      deposits: [...(sale.deposits ?? []), deposit],
    };
  }
}
