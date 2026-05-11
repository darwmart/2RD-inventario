import { supabase } from '@/lib/supabase';
import type { Supplier } from '@/types/supplier';
import type { ISupplierRepository, CreateSupplierInput } from '../interfaces/ISupplierRepository';

type Row = Record<string, unknown>;

function toSupplier(row: Row): Supplier {
  return {
    id:              row.id as string,
    code:            (row.code as string) ?? undefined,
    accountingCode:  (row.accounting_code as string) ?? undefined,
    taxIdType:       (row.tax_id_type as string) ?? 'NIT',
    taxId:           row.tax_id as string,
    fiscalName:      row.fiscal_name as string,
    commercialName:  (row.commercial_name as string) ?? undefined,
    address:         (row.address as string) ?? '',
    postalCode:      (row.postal_code as string) ?? undefined,
    city:            (row.city as string) ?? undefined,
    province:        (row.province as string) ?? undefined,
    country:         (row.country as string) ?? undefined,
    phone:           (row.phone as string) ?? '',
    mobile:          (row.mobile as string) ?? undefined,
    fax:             (row.fax as string) ?? undefined,
    contactPerson:   (row.contact_person as string) ?? undefined,
    email:           (row.email as string) ?? '',
    twitter:         (row.twitter as string) ?? undefined,
    facebook:        (row.facebook as string) ?? undefined,
    iban:            (row.iban as string) ?? undefined,
    ccc:             (row.ccc as string) ?? undefined,
    bankName:        (row.bank_name as string) ?? undefined,
    observations:    (row.observations as string) ?? undefined,
    isProvider:      (row.is_provider as boolean) ?? true,
    isCreditor:      (row.is_creditor as boolean) ?? false,
    createdAt:       new Date(row.created_at as string),
  };
}

function toRow(data: Partial<Supplier> & Partial<CreateSupplierInput>): Row {
  const row: Row = {};
  if (data.taxIdType      !== undefined) row.tax_id_type     = data.taxIdType;
  if (data.taxId          !== undefined) row.tax_id          = data.taxId;
  if (data.fiscalName     !== undefined) row.fiscal_name     = data.fiscalName;
  if (data.commercialName !== undefined) row.commercial_name = data.commercialName ?? null;
  if (data.address        !== undefined) row.address         = data.address;
  if (data.postalCode     !== undefined) row.postal_code     = data.postalCode ?? null;
  if (data.city           !== undefined) row.city            = data.city ?? null;
  if (data.province       !== undefined) row.province        = data.province ?? null;
  if (data.country        !== undefined) row.country         = data.country ?? null;
  if (data.phone          !== undefined) row.phone           = data.phone;
  if (data.mobile         !== undefined) row.mobile          = data.mobile ?? null;
  if (data.fax            !== undefined) row.fax             = data.fax ?? null;
  if (data.contactPerson  !== undefined) row.contact_person  = data.contactPerson ?? null;
  if (data.email          !== undefined) row.email           = data.email;
  if (data.twitter        !== undefined) row.twitter         = data.twitter ?? null;
  if (data.facebook       !== undefined) row.facebook        = data.facebook ?? null;
  if (data.iban           !== undefined) row.iban            = data.iban ?? null;
  if (data.ccc            !== undefined) row.ccc             = data.ccc ?? null;
  if (data.bankName       !== undefined) row.bank_name       = data.bankName ?? null;
  if (data.observations   !== undefined) row.observations    = data.observations ?? null;
  if (data.isProvider     !== undefined) row.is_provider     = data.isProvider;
  if (data.isCreditor     !== undefined) row.is_creditor     = data.isCreditor;
  if (data.accountingCode !== undefined) row.accounting_code = data.accountingCode ?? null;
  if (data.code           !== undefined) row.code            = data.code ?? null;
  return row;
}

export class SupabaseSupplierRepository implements ISupplierRepository {
  private readonly table = 'suppliers';

  async findAll(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('fiscal_name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toSupplier);
  }

  async findById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toSupplier(data) : null;
  }

  async create(data: CreateSupplierInput): Promise<Supplier> {
    const code = await this.getNextCode();
    const { data: inserted, error } = await supabase
      .from(this.table).insert({ ...toRow(data), code }).select().single();
    if (error) throw new Error(error.message);
    return toSupplier(inserted);
  }

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const { data: updated, error } = await supabase
      .from(this.table).update(toRow(data)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toSupplier(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findByTaxId(taxId: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('tax_id', taxId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toSupplier(data) : null;
  }

  async getNextCode(): Promise<string> {
    const { data, error } = await supabase
      .from(this.table).select('code').order('code', { ascending: false }).limit(1);
    if (error) throw new Error(error.message);
    const maxCode = data?.[0]?.code ? parseInt(data[0].code as string) : 0;
    return String(isNaN(maxCode) ? 1 : maxCode + 1);
  }
}
