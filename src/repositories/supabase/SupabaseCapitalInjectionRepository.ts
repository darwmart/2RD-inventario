import { supabase } from '@/lib/supabase';
import type { CapitalInjection } from '@/components/cashRegister/CapitalInjectionsCard';

type Row = Record<string, unknown>;

function toInjection(row: Row): CapitalInjection {
  return {
    id:        row.id as string,
    type:      row.type as string,
    typeLabel: row.type_label as string,
    banco:     row.bank_id as string,
    bancoName: row.bank_name as string,
    amount:    Number(row.amount),
    detail:    (row.detail as string) ?? '',
    fecha:     row.fecha as string,
  };
}

export class SupabaseCapitalInjectionRepository {
  private readonly table = 'capital_injections';

  async findAll(): Promise<CapitalInjection[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('fecha', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toInjection(r as Row));
  }

  async create(data: Omit<CapitalInjection, 'id'>): Promise<CapitalInjection> {
    const { data: inserted, error } = await supabase
      .from(this.table).insert({
        type:       data.type,
        type_label: data.typeLabel,
        bank_id:    data.banco,
        bank_name:  data.bancoName,
        amount:     data.amount,
        detail:     data.detail,
        fecha:      data.fecha,
      }).select().single();
    if (error) throw new Error(error.message);
    return toInjection(inserted as Row);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
