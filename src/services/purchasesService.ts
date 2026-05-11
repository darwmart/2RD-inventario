import type { PurchaseDocument, DocumentType, DocumentStatus } from '@/types/purchase';
import type { IBaseRepository } from '@/repositories/interfaces/IBaseRepository';
import type { IBankRepository } from '@/repositories/interfaces/IBankRepository';
import type { IProductRepository } from '@/repositories/interfaces/IProductRepository';
import {
  CreateDocumentInput,
  buildDocument,
  applyPayment,
  convertDelivery,
  generateDocumentNumber,
} from '@/domain/purchases';

export type IPurchaseRepository = IBaseRepository<PurchaseDocument, CreateDocumentInput> & {
  findBySupplier(supplierId: string): Promise<PurchaseDocument[]>;
  findByStatus(status: DocumentStatus): Promise<PurchaseDocument[]>;
  findByType(type: DocumentType): Promise<PurchaseDocument[]>;
  replaceAll(docs: PurchaseDocument[]): Promise<void>;
};

export class PurchasesService {
  constructor(
    private readonly purchases: IPurchaseRepository,
    private readonly products: IProductRepository,
    private readonly banks: IBankRepository,
  ) {}

  async getAll(): Promise<PurchaseDocument[]> {
    return this.purchases.findAll();
  }

  async createDocument(data: CreateDocumentInput): Promise<PurchaseDocument> {
    if (!data.supplierId) throw new Error('El proveedor es requerido');
    if (!data.items?.length) throw new Error('El documento debe tener al menos un artículo');

    const all = await this.purchases.findAll();
    const doc = buildDocument(all, data);
    await this.purchases.create(data);

    // Si es factura pagada al contado, actualiza stock y balance bancario
    if (doc.documentType === 'invoice' && doc.paymentDetails?.isCashPayment) {
      await this._applyStockEntries(doc);
      if (doc.paymentDetails.bankId) {
        await this.banks.updateBalance(doc.paymentDetails.bankId, -doc.total);
      }
    }

    return doc;
  }

  async updateDocument(id: string, updates: Partial<PurchaseDocument>): Promise<PurchaseDocument> {
    return this.purchases.update(id, updates);
  }

  async deleteDocument(id: string): Promise<void> {
    return this.purchases.delete(id);
  }

  async updateStatus(id: string, status: DocumentStatus): Promise<PurchaseDocument> {
    return this.purchases.update(id, { status, updatedAt: new Date() });
  }

  async markAsPaid(id: string, bankId: string, bankName: string, amount: number): Promise<PurchaseDocument> {
    const purchase = await this.purchases.findById(id);
    if (!purchase) throw new Error(`Compra ${id} no encontrada`);

    const bank = await this.banks.findById(bankId);
    if (!bank) throw new Error(`Banco ${bankId} no encontrado`);
    if ((bank.balance ?? 0) < amount) throw new Error('Saldo bancario insuficiente');

    const updated = applyPayment(purchase, bankId, bankName, amount);
    await this.purchases.update(id, updated);
    await this.banks.updateBalance(bankId, -amount);

    await this._applyStockEntries(purchase);
    return updated;
  }

  async convertDeliveryToInvoice(
    deliveryId: string,
    paymentData: Parameters<typeof convertDelivery>[2],
  ): Promise<PurchaseDocument> {
    const all = await this.purchases.findAll();
    const { updatedList, invoice } = convertDelivery(all, deliveryId, paymentData);
    await this.purchases.replaceAll(updatedList);
    return invoice;
  }

  getNextDocumentNumber(purchases: PurchaseDocument[], type: DocumentType): string {
    return generateDocumentNumber(purchases, type);
  }

  // Registra entradas de stock para todos los ítems del documento
  private async _applyStockEntries(doc: PurchaseDocument): Promise<void> {
    await Promise.all(
      doc.items.map(async item => {
        const product = await this.products.findById(item.productId);
        if (!product) return;
        await this.products.updateStock(product.id, product.stock + item.quantity);
      })
    );
  }
}
