import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { Bank } from '@/types/settings';
import type { IBankRepository, CreateBankInput } from '../interfaces/IBankRepository';

type Row = Record<string, unknown>;

function toBank(row: Row): Bank {
  return {
    id:       row.id as string,
    name:     row.name as string,
    icon:     (row.icon as string) ?? undefined,
    isActive: Boolean(row.is_active),
    balance:  Number(row.balance ?? 0),
  };
}

function toRow(data: Partial<Bank> & Partial<CreateBankInput>): Row {
  const row: Row = {};
  if (data.id       !== undefined) row.id        = data.id;
  if (data.name     !== undefined) row.name      = data.name;
  if (data.icon     !== undefined) row.icon      = data.icon     ?? null;
  if (data.isActive !== undefined) row.is_active = data.isActive;
  if (data.balance  !== undefined) row.balance   = data.balance;
  return row;
}

export class SupabaseBankRepository implements IBankRepository {
  private readonly table = 'banks';

  async findAll(): Promise<Bank[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toBank);
  }

  async findById(id: string): Promise<Bank | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toBank(data) : null;
  }

  async create(data: CreateBankInput & { id?: string }): Promise<Bank> {
    const row = toRow({ ...data, id: data.id ?? uuidv4() });
    const { data: inserted, error } = await supabase
      .from(this.table).insert(row).select().single();
    if (error) throw new Error(error.message);
    return toBank(inserted);
  }

  async update(id: string, data: Partial<Bank>): Promise<Bank> {
    const { data: updated, error } = await supabase
      .from(this.table).update(toRow(data)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toBank(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findActive(): Promise<Bank[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('is_active', true).order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toBank);
  }

  async updateBalance(id: string, delta: number): Promise<Bank> {
    // Incremento/decremento atómico con RPC o lectura + escritura
    const bank = await this.findById(id);
    if (!bank) throw new Error(`Banco ${id} no encontrado`);
    const newBalance = (bank.balance ?? 0) + delta;
    const { data: updated, error } = await supabase
      .from(this.table)
      .update({ balance: newBalance })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toBank(updated);
  }

  async setBalance(id: string, amount: number): Promise<Bank> {
    const { data: updated, error } = await supabase
      .from(this.table)
      .update({ balance: amount })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toBank(updated);
  }
}
