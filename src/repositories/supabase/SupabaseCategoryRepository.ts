import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/product';
import type { ICategoryRepository, CreateCategoryInput } from '../interfaces/ICategoryRepository';

type Row = Record<string, unknown>;

function toCategory(row: Row): Category {
  return {
    id:          row.id as string,
    name:        row.name as string,
    description: (row.description as string) ?? '',
    createdAt:   new Date(row.created_at as string),
  };
}

function toRow(data: Partial<Category> & Partial<CreateCategoryInput>): Row {
  const row: Row = {};
  if (data.name        !== undefined) row.name        = data.name;
  if (data.description !== undefined) row.description = data.description;
  return row;
}

export class SupabaseCategoryRepository implements ICategoryRepository {
  private readonly table = 'categories';

  async findAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCategory);
  }

  async findById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCategory(data) : null;
  }

  async create(data: CreateCategoryInput): Promise<Category> {
    const { data: inserted, error } = await supabase
      .from(this.table).insert(toRow(data)).select().single();
    if (error) throw new Error(error.message);
    return toCategory(inserted);
  }

  async update(id: string, data: Partial<Category>): Promise<Category> {
    const { data: updated, error } = await supabase
      .from(this.table).update(toRow(data)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toCategory(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findByName(name: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').ilike('name', name).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCategory(data) : null;
  }
}
