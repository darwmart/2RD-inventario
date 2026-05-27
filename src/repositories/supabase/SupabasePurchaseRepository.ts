import { supabase } from '@/lib/supabase';
import type { PurchaseDocument, PurchaseItem, DocumentType, DocumentStatus } from '@/types/purchase';
import type { IPurchaseRepository } from '@/services/purchasesService';
import type { CreateDocumentInput } from '@/domain/purchases';
import { generateDocumentNumber } from '@/domain/purchases';
import { v4 as uuidv4 } from 'uuid';

const SELECT = '*, purchase_items(*), purchase_payments(*)';

type PurchaseRow = {
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
  purchase_items: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_cost: number;
    total: number;
  }[];
  purchase_payments: {
    date: string;
    amount: number;
    bank_id: string;
    bank_name: string;
  }[];
};

function toDoc(r: PurchaseRow): PurchaseDocument {
  return {
    id: r.id,
    documentType: r.document_type,
    documentNumber: r.document_number,
    supplierInvoiceNumber: r.supplier_invoice_number,
    warehouse: r.warehouse,
    status: r.status,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    items: (r.purchase_items ?? []).map(i => ({
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      unitCost: i.unit_cost,
      total: i.total,
    } satisfies PurchaseItem)),
    subtotal: r.subtotal,
    tax: r.tax,
    total: r.total,
    notes: r.notes,
    paymentMethod: r.payment_method as PurchaseDocument['paymentMethod'],
    paymentDetails: r.payment_details as PurchaseDocument['paymentDetails'],
    payments: (r.purchase_payments ?? []).map(p => ({
      date: p.date,
      amount: p.amount,
      bankId: p.bank_id,
      bankName: p.bank_name,
    })),
    orderRef: r.order_ref,
    deliveryRef: r.delivery_ref,
    invoiceRef: r.invoice_ref,
    createdAt: new Date(r.created_at),
    updatedAt: r.updated_at ? new Date(r.updated_at) : undefined,
  };
}

export class SupabasePurchaseRepository implements IPurchaseRepository {
  async findAll(): Promise<PurchaseDocument[]> {
    const { data, error } = await supabase
      .from('purchase_documents')
      .select(SELECT)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toDoc(r as unknown as PurchaseRow));
  }

  async findById(id: string): Promise<PurchaseDocument | null> {
    const { data, error } = await supabase
      .from('purchase_documents')
      .select(SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toDoc(data as unknown as PurchaseRow) : null;
  }

  async create(input: CreateDocumentInput): Promise<PurchaseDocument> {
    const all = await this.findAll();
    const subtotal = input.items.reduce((s, i) => s + i.total, 0);
    const total = subtotal + (input.tax ?? 0);
    const id = uuidv4();
    const documentNumber = generateDocumentNumber(all, input.documentType);

    const { error: docErr } = await supabase.from('purchase_documents').insert({
      id,
      document_type: input.documentType,
      document_number: documentNumber,
      supplier_invoice_number: input.supplierInvoiceNumber,
      status: 'pending',
      supplier_id: input.supplierId,
      supplier_name: input.supplierName,
      subtotal,
      tax: input.tax,
      total,
      notes: input.notes,
      payment_method: input.paymentMethod ?? null,
      payment_details: input.paymentDetails ?? null,
      order_ref: input.orderRef,
      delivery_ref: input.deliveryRef,
    });
    if (docErr) throw new Error(docErr.message);

    if (input.items.length > 0) {
      const { error: itemErr } = await supabase.from('purchase_items').insert(
        input.items.map((i, idx) => ({
          document_id: id,
          product_id: i.productId,
          product_name: i.productName,
          quantity: i.quantity,
          unit_cost: i.unitCost,
          total: i.total,
          sort_order: idx,
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
    if (data.status !== undefined)         payload.status           = data.status;
    if (data.notes !== undefined)          payload.notes            = data.notes;
    if (data.supplierId !== undefined)     payload.supplier_id      = data.supplierId;
    if (data.supplierName !== undefined)   payload.supplier_name    = data.supplierName;
    if (data.paymentMethod !== undefined)  payload.payment_method   = data.paymentMethod;
    if (data.paymentDetails !== undefined) payload.payment_details  = data.paymentDetails;
    if (data.invoiceRef !== undefined)     payload.invoice_ref      = data.invoiceRef;
    if (data.deliveryRef !== undefined)    payload.delivery_ref     = data.deliveryRef;
    if (data.tax !== undefined)            payload.tax              = data.tax;
    if (data.total !== undefined)          payload.total            = data.total;
    if (data.subtotal !== undefined)       payload.subtotal         = data.subtotal;

    if (data.items !== undefined) {
      await supabase.from('purchase_items').delete().eq('document_id', id);
      if (data.items.length > 0) {
        await supabase.from('purchase_items').insert(
          data.items.map((i, idx) => ({
            document_id: id,
            product_id: i.productId,
            product_name: i.productName,
            quantity: i.quantity,
            unit_cost: i.unitCost,
            total: i.total,
            sort_order: idx,
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
            date: p.date,
            amount: p.amount,
            bank_id: p.bankId,
            bank_name: p.bankName,
          }))
        );
      }
    }

    const { error } = await supabase.from('purchase_documents').update(payload).eq('id', id);
    if (error) throw new Error(error.message);

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
      .select(SELECT)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toDoc(r as unknown as PurchaseRow));
  }

  async findByStatus(status: DocumentStatus): Promise<PurchaseDocument[]> {
    const { data, error } = await supabase
      .from('purchase_documents')
      .select(SELECT)
      .eq('status', status);
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toDoc(r as unknown as PurchaseRow));
  }

  async findByType(type: DocumentType): Promise<PurchaseDocument[]> {
    const { data, error } = await supabase
      .from('purchase_documents')
      .select(SELECT)
      .eq('document_type', type);
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toDoc(r as unknown as PurchaseRow));
  }

  async replaceAll(docs: PurchaseDocument[]): Promise<void> {
    await supabase.from('purchase_documents').delete().neq('id', '');
    for (const doc of docs) {
      await this.create({
        documentType: doc.documentType,
        supplierId: doc.supplierId,
        supplierName: doc.supplierName,
        items: doc.items,
        tax: doc.tax,
        notes: doc.notes,
        paymentMethod: doc.paymentMethod,
        paymentDetails: doc.paymentDetails,
      });
    }
  }
}
