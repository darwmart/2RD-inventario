import { supabase } from '@/lib/supabase';
import type { Customer } from '@/types/customer';
import type { ICustomerRepository, CreateCustomerInput } from '../interfaces/ICustomerRepository';

type Row = Record<string, unknown>;

function toCustomer(row: Row): Customer {
  return {
    id:           row.id as string,
    name:         row.name as string,
    document:     (row.document as string)      ?? undefined,
    documentType: (row.document_type as string) ?? undefined,
    phone:        (row.phone as string)         ?? undefined,
    email:        (row.email as string)         ?? undefined,
    address:      (row.address as string)       ?? undefined,
    city:         (row.city as string)          ?? undefined,
    creditLimit:  row.credit_limit != null ? Number(row.credit_limit) : undefined,
    balance:      Number(row.balance ?? 0),
    notes:        (row.notes as string)         ?? undefined,
    isActive:     Boolean(row.is_active),
    createdAt:    new Date(row.created_at as string),
  };
}

function toRow(data: Partial<Customer> & Partial<CreateCustomerInput>): Row {
  const row: Row = {};
  if (data.name         !== undefined) row.name          = data.name;
  if (data.document     !== undefined) row.document      = data.document     ?? null;
  if (data.documentType !== undefined) row.document_type = data.documentType ?? null;
  if (data.phone        !== undefined) row.phone         = data.phone        ?? null;
  if (data.email        !== undefined) row.email         = data.email        ?? null;
  if (data.address      !== undefined) row.address       = data.address      ?? null;
  if (data.city         !== undefined) row.city          = data.city         ?? null;
  if (data.creditLimit  !== undefined) row.credit_limit  = data.creditLimit  ?? null;
  if (data.balance      !== undefined) row.balance       = data.balance;
  if (data.notes        !== undefined) row.notes         = data.notes        ?? null;
  if (data.isActive     !== undefined) row.is_active     = data.isActive;
  return row;
}

export class SupabaseCustomerRepository implements ICustomerRepository {
  private readonly table = 'customers';

  async findAll(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCustomer);
  }

  async findById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCustomer(data) : null;
  }

  async create(data: CreateCustomerInput): Promise<Customer> {
    const { data: inserted, error } = await supabase
      .from(this.table).insert(toRow(data)).select().single();
    if (error) throw new Error(error.message);
    return toCustomer(inserted);
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const { data: updated, error } = await supabase
      .from(this.table).update(toRow(data)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toCustomer(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findByDocument(document: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('document', document).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCustomer(data) : null;
  }

  async search(term: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .or(`name.ilike.%${term}%,document.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
      .order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCustomer);
  }
}
