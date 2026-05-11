import { supabase } from '@/lib/supabase';
import type { PaymentMethod } from '@/types/shared';
import type {
  IPaymentMethodRepository,
  CreatePaymentMethodInput,
} from '../interfaces/IPaymentMethodRepository';

type Row = Record<string, unknown>;

function toMethod(row: Row): PaymentMethod {
  return {
    id:            row.id as string,
    name:          row.name as string,
    type:          row.type as PaymentMethod['type'],
    isActive:      Boolean(row.is_active),
    bankId:        (row.bank_id as string)        ?? undefined,
    commission:    row.commission != null ? Number(row.commission) : undefined,
    paymentPeriod: (row.payment_period as PaymentMethod['paymentPeriod']) ?? undefined,
    paymentDays:   row.payment_days != null ? Number(row.payment_days) : undefined,
  };
}

function toRow(data: Partial<PaymentMethod> & Partial<CreatePaymentMethodInput>): Row {
  const row: Row = {};
  if (data.name          !== undefined) row.name           = data.name;
  if (data.type          !== undefined) row.type           = data.type;
  if (data.isActive      !== undefined) row.is_active      = data.isActive;
  if (data.bankId        !== undefined) row.bank_id        = data.bankId        ?? null;
  if (data.commission    !== undefined) row.commission     = data.commission    ?? null;
  if (data.paymentPeriod !== undefined) row.payment_period = data.paymentPeriod ?? null;
  if (data.paymentDays   !== undefined) row.payment_days   = data.paymentDays   ?? null;
  return row;
}

export class SupabasePaymentMethodRepository implements IPaymentMethodRepository {
  private readonly table = 'payment_methods';

  async findAll(): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toMethod);
  }

  async findById(id: string): Promise<PaymentMethod | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toMethod(data) : null;
  }

  async create(data: CreatePaymentMethodInput): Promise<PaymentMethod> {
    const { data: inserted, error } = await supabase
      .from(this.table).insert(toRow(data)).select().single();
    if (error) throw new Error(error.message);
    return toMethod(inserted);
  }

  async update(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> {
    const { data: updated, error } = await supabase
      .from(this.table).update(toRow(data)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toMethod(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findActive(): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('is_active', true).order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toMethod);
  }

  async findByType(type: PaymentMethod['type']): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('type', type).order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toMethod);
  }
}
