import { supabase } from '@/lib/supabase';
import type { Advisor } from '@/types/shared';
import type { IAdvisorRepository, CreateAdvisorInput } from '../interfaces/IAdvisorRepository';

type Row = Record<string, unknown>;

function toAdvisor(row: Row): Advisor {
  return {
    id:        row.id as string,
    name:      row.name as string,
    email:     (row.email as string) ?? '',
    phone:     (row.phone as string) ?? '',
    isActive:  Boolean(row.is_active),
    createdAt: new Date(row.created_at as string),
  };
}

function toRow(data: Partial<Advisor> & Partial<CreateAdvisorInput>): Row {
  const row: Row = {};
  if (data.name     !== undefined) row.name      = data.name;
  if (data.email    !== undefined) row.email     = data.email;
  if (data.phone    !== undefined) row.phone     = data.phone;
  if (data.isActive !== undefined) row.is_active = data.isActive;
  return row;
}

export class SupabaseAdvisorRepository implements IAdvisorRepository {
  private readonly table = 'advisors';

  async findAll(): Promise<Advisor[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toAdvisor);
  }

  async findById(id: string): Promise<Advisor | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toAdvisor(data) : null;
  }

  async create(data: CreateAdvisorInput): Promise<Advisor> {
    const { data: inserted, error } = await supabase
      .from(this.table).insert(toRow(data)).select().single();
    if (error) throw new Error(error.message);
    return toAdvisor(inserted);
  }

  async update(id: string, data: Partial<Advisor>): Promise<Advisor> {
    const { data: updated, error } = await supabase
      .from(this.table).update(toRow(data)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toAdvisor(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findActive(): Promise<Advisor[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('is_active', true).order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toAdvisor);
  }
}
