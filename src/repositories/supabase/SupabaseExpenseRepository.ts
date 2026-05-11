import { supabase } from '@/lib/supabase';
import type { Expense } from '@/types/shared';
import type { IExpenseRepository, CreateExpenseInput } from '../interfaces/IExpenseRepository';

type Row = Record<string, unknown>;

function toExpense(row: Row): Expense {
  return {
    id:          row.id as string,
    advisorId:   row.advisor_id as string,
    advisor:     row.advisor as string,
    type:        row.type as Expense['type'],
    amount:      Number(row.amount),
    description: (row.description as string) ?? '',
    createdAt:   row.created_at as string,
  };
}

function toRow(data: Partial<Expense> & Partial<CreateExpenseInput>): Row {
  const row: Row = {};
  if (data.advisorId   !== undefined) row.advisor_id  = data.advisorId;
  if (data.advisor     !== undefined) row.advisor     = data.advisor;
  if (data.type        !== undefined) row.type        = data.type;
  if (data.amount      !== undefined) row.amount      = data.amount;
  if (data.description !== undefined) row.description = data.description;
  if (data.createdAt   !== undefined) row.created_at  = data.createdAt;
  return row;
}

// Extrae la parte 'YYYY-MM-DD' de una cadena ISO o de createdAt
function dateKey(createdAt: string): string {
  return createdAt.slice(0, 10);
}

export class SupabaseExpenseRepository implements IExpenseRepository {
  private readonly table = 'expenses';

  async findAll(): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toExpense);
  }

  async findById(id: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toExpense(data) : null;
  }

  async create(data: CreateExpenseInput): Promise<Expense> {
    const row = {
      ...toRow(data),
      created_at: data.createdAt ?? new Date().toISOString(),
    };
    const { data: inserted, error } = await supabase
      .from(this.table).insert(row).select().single();
    if (error) throw new Error(error.message);
    return toExpense(inserted);
  }

  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    const { data: updated, error } = await supabase
      .from(this.table).update(toRow(data)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toExpense(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findByDate(key: string): Promise<Expense[]> {
    // createdAt en expenses es text ISO — filtramos por prefijo de fecha
    const { data, error } = await supabase
      .from(this.table).select('*').like('created_at', `${key}%`);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toExpense).filter(e => dateKey(e.createdAt) === key);
  }

  async findByAdvisorId(advisorId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('advisor_id', advisorId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toExpense);
  }

  async findByAdvisorName(name: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').ilike('advisor', name);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toExpense);
  }
}
