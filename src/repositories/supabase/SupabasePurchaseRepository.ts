import { supabase } from '@/lib/supabase';
import type { PurchaseDocument, PurchaseItem, DocumentType, DocumentStatus } from '@/types/purchase';
import type { IPurchaseRepository } from '@/services/purchasesService';
import type { CreateDocumentInput } from '@/domain/purchases';
import { generateDocumentNumber } from '@/domain/purchases';
import { v4 as uuidv4 } from 'uuid';

// ─── TIPOS DE FILAS ──────────────────────────────────────────────────────────

type DocRow = {
  id: string;
  document_type: DocumentType;
  document_number: string;
  supplier_invoice_number?: string;
  warehouse?: string;
  status: DocumentStatus;
  supplier_id: string;
  supplier_name: string;
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
  payment_method?: unknown;
  payment_details?: unknown;
  order_ref?: string;
  delivery_ref?: string;
  invoice_ref?: string;
  created_at: string;
  updated_at?: string;
};

type ItemRow = {
  document_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
  sort_order: number;
};

type PaymentRow = {
  document_id: string;
  date: string;
  amount: number;
  bank_id: string;
  bank_name: string;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function fetchItemsForDocs(ids: string[]): Promise<ItemRow[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('purchase_items')
    .select('document_id, product_id, product_name, quantity, unit_cost, total, sort_order')
    .in('document_id', ids)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as ItemRow[];
}

async function fetchPaymentsForDocs(ids: string[]): Promise<PaymentRow[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('purchase_payments')
    .select('document_id, date, amount, bank_id, bank_name')
    .in('document_id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentRow[];
}

function buildDoc(row: DocRow, items: ItemRow[], payments: PaymentRow[]): PurchaseDocument {
  return {
    id: row.id,
    documentType: row.document_type,
    documentNumber: row.document_number,
    supplierInvoiceNumber: row.supplier_invoice_number,
    warehouse: row.warehouse,
    status: row.status,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    items: items
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(i => ({
        productId:   i.product_id,
        productName: i.product_name,
        quantity:    Number(i.quantity),
        unitCost:    Number(i.unit_cost),
        total:       Number(i.total),
      } satisfies PurchaseItem)),
    subtotal: Number(row.subtotal),
    tax: row.tax !== undefined ? Number(row.tax) : undefined,
    total: Number(row.total),
    notes: row.notes,
    paymentMethod: row.payment_method as PurchaseDocument['paymentMethod'],
    paymentDetails: row.payment_details as PurchaseDocument['paymentDetails'],
    payments: payments.map(p => ({
      date:     p.date,
      amount:   Number(p.amount),
      bankId:   p.bank_id,
      bankName: p.bank_name,
    })),
    orderRef:    row.order_ref,
    deliveryRef: row.delivery_ref,
    invoiceRef:  row.invoice_ref,
    createdAt:   new Date(row.created_at),
    updatedAt:   row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

// ─── REPOSITORIO ─────────────────────────────────────────────────────────────

export class SupabasePurchaseRepository implements IPurchaseRepository {
  async findAll(): Promise<PurchaseDocument[]> {
    const { data, error } = await supabase
      .from('purchase_documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const docs = (data ?? []) as DocRow[];
    if (!docs.length) return [];

    const ids = docs.map(d => d.id);
    const [items, payments] = await Promise.all([
      fetchItemsForDocs(ids),
      fetchPaymentsForDocs(ids),
    ]);

    return docs.map(r => buildDoc(
      r,
      items.filter(i => i.document_id === r.id),
      payments.filter(p => p.document_id === r.id),
    ));
  }

  async findById(id: string): Promise<PurchaseDocument | null> {
    const { data, error } = await supabase
      .from('purchase_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const [items, payments] = await Promise.all([
      fetchItemsForDocs([id]),
      fetchPaymentsForDocs([id]),
    ]);
    return buildDoc(data as DocRow, items, payments);
  }

  async create(input: CreateDocumentInput): Promise<PurchaseDocument> {
    const all = await this.findAll();
    const subtotal = input.items.reduce((s, i) => s + i.total, 0);
    const total = subtotal + (input.tax ?? 0);
    const id = uuidv4();
    const documentNumber = generateDocumentNumber(all, input.documentType);

    const { error: docErr } = await supabase.from('purchase_documents').insert({
      id,
      document_type:          input.documentType,
      document_number:        documentNumber,
      supplier_invoice_number:input.supplierInvoiceNumber,
      status:                 'pending',
      supplier_id:            input.supplierId,
      supplier_name:          input.supplierName,
      warehouse:              input.warehouse,
      subtotal,
      tax:                    input.tax ?? 0,
      total,
      notes:                  input.notes,
      payment_method:         input.paymentMethod ?? null,
      payment_details:        input.paymentDetails ?? null,
      order_ref:              input.orderRef,
      delivery_ref:           input.deliveryRef,
    });
    if (docErr) throw new Error(docErr.message);

    if (input.items.length > 0) {
      const { error: itemErr } = await supabase.from('purchase_items').insert(
        input.items.map((i, idx) => ({
          document_id:  id,
          product_id:   i.productId,
          product_name: i.productName,
          quantity:     i.quantity,
          unit_cost:    i.unitCost,
          total:        i.total,
          sort_order:   idx,
        }))
      );
      if (itemErr) throw new Error(itemErr.message);
    }

    const doc = await this.findById(id);
    if (!doc) throw new Error('Error al recuperar el documento creado');
    return doc;
  }

  async update(id: string, data: Partial<PurchaseDocument>): Promise<PurchaseDocument> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.status        !== undefined) payload.status          = data.status;
    if (data.notes         !== undefined) payload.notes           = data.notes;
    if (data.supplierId    !== undefined) payload.supplier_id     = data.supplierId;
    if (data.supplierName  !== undefined) payload.supplier_name   = data.supplierName;
    if (data.paymentMethod !== undefined) payload.payment_method  = data.paymentMethod;
    if (data.paymentDetails!== undefined) payload.payment_details = data.paymentDetails;
    if (data.invoiceRef    !== undefined) payload.invoice_ref     = data.invoiceRef;
    if (data.deliveryRef   !== undefined) payload.delivery_ref    = data.deliveryRef;
    if (data.tax           !== undefined) payload.tax             = data.tax;
    if (data.total         !== undefined) payload.total           = data.total;
    if (data.subtotal      !== undefined) payload.subtotal        = data.subtotal;

    const { error } = await supabase.from('purchase_documents').update(payload).eq('id', id);
    if (error) throw new Error(error.message);

    if (data.items !== undefined) {
      await supabase.from('purchase_items').delete().eq('document_id', id);
      if (data.items.length > 0) {
        await supabase.from('purchase_items').insert(
          data.items.map((i, idx) => ({
            document_id:  id,
            product_id:   i.productId,
            product_name: i.productName,
            quantity:     i.quantity,
            unit_cost:    i.unitCost,
            total:        i.total,
            sort_order:   idx,
          }))
        );
      }
    }

    if (data.payments !== undefined) {
      await supabase.from('purchase_payments').delete().eq('document_id', id);
      if (data.payments.length > 0) {
        await supabase.from('purchase_payments').insert(
          data.payments.map(p => ({
            document_id: id,
            date:        p.date,
            amount:      p.amount,
            bank_id:     p.bankId,
            bank_name:   p.bankName,
          }))
        );
      }
    }

    const doc = await this.findById(id);
    if (!doc) throw new Error(`Compra ${id} no encontrada`);
    return doc;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('purchase_documents').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findBySupplier(supplierId: string): Promise<PurchaseDocument[]> {
    const { data, error } = await supabase
      .from('purchase_documents')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const docs = (data ?? []) as DocRow[];
    if (!docs.length) return [];
    const ids = docs.map(d => d.id);
    const [items, payments] = await Promise.all([fetchItemsForDocs(ids), fetchPaymentsForDocs(ids)]);
    return docs.map(r => buildDoc(r, items.filter(i => i.document_id === r.id), payments.filter(p => p.document_id === r.id)));
  }

  async findByStatus(status: DocumentStatus): Promise<PurchaseDocument[]> {
    const { data, error } = await supabase
      .from('purchase_documents')
      .select('*')
      .eq('status', status);
    if (error) throw new Error(error.message);
    const docs = (data ?? []) as DocRow[];
    if (!docs.length) return [];
    const ids = docs.map(d => d.id);
    const [items, payments] = await Promise.all([fetchItemsForDocs(ids), fetchPaymentsForDocs(ids)]);
    return docs.map(r => buildDoc(r, items.filter(i => i.document_id === r.id), payments.filter(p => p.document_id === r.id)));
  }

  async findByType(type: DocumentType): Promise<PurchaseDocument[]> {
    const { data, error } = await supabase
      .from('purchase_documents')
      .select('*')
      .eq('document_type', type);
    if (error) throw new Error(error.message);
    const docs = (data ?? []) as DocRow[];
    if (!docs.length) return [];
    const ids = docs.map(d => d.id);
    const [items, payments] = await Promise.all([fetchItemsForDocs(ids), fetchPaymentsForDocs(ids)]);
    return docs.map(r => buildDoc(r, items.filter(i => i.document_id === r.id), payments.filter(p => p.document_id === r.id)));
  }

  async replaceAll(docs: PurchaseDocument[]): Promise<void> {
    await supabase.from('purchase_documents').delete().neq('id', '');
    for (const doc of docs) {
      await this.create({
        documentType:   doc.documentType,
        supplierId:     doc.supplierId,
        supplierName:   doc.supplierName,
        items:          doc.items,
        tax:            doc.tax,
        notes:          doc.notes,
        paymentMethod:  doc.paymentMethod,
        paymentDetails: doc.paymentDetails,
      });
    }
  }
}
