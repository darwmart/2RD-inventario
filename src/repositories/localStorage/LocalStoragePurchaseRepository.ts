import type { PurchaseDocument, DocumentType, DocumentStatus } from '@/types/purchase';
import type { IPurchaseRepository } from '@/services/purchasesService';
import type { CreateDocumentInput } from '@/domain/purchases';
import { buildDocument } from '@/domain/purchases';
import { LocalStorageRepository } from './base';

export class LocalStoragePurchaseRepository
  extends LocalStorageRepository<PurchaseDocument>
  implements IPurchaseRepository
{
  constructor() {
    super('purchases');
  }

  async create(data: CreateDocumentInput): Promise<PurchaseDocument> {
    const all = this.read();
    const doc = buildDocument(all, data);
    this.write([...all, doc]);
    return doc;
  }

  async update(id: string, data: Partial<PurchaseDocument>): Promise<PurchaseDocument> {
    const updated = this.read().map(p =>
      p.id === id ? { ...p, ...data, updatedAt: new Date() } : p
    );
    this.write(updated);
    const result = updated.find(p => p.id === id);
    if (!result) throw new Error(`Compra ${id} no encontrada`);
    return result;
  }

  async findBySupplier(supplierId: string): Promise<PurchaseDocument[]> {
    return this.read().filter(p => p.supplierId === supplierId);
  }

  async findByStatus(status: DocumentStatus): Promise<PurchaseDocument[]> {
    return this.read().filter(p => p.status === status);
  }

  async findByType(type: DocumentType): Promise<PurchaseDocument[]> {
    return this.read().filter(p => p.documentType === type);
  }

  async replaceAll(docs: PurchaseDocument[]): Promise<void> {
    this.write(docs);
  }
}
