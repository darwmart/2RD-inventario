import type { PurchaseDocument, PurchaseItem, DocumentType, DocumentStatus } from '@/types/purchase';
import type { IBaseRepository } from '@/repositories/interfaces/IBaseRepository';
import type { IBankRepository } from '@/repositories/interfaces/IBankRepository';
import type { IProductRepository } from '@/repositories/interfaces/IProductRepository';
import {
  CreateDocumentInput,
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
    const doc = await this.purchases.create(data);
    this._applyStockEntries(doc).catch(e => console.error('[Compras] Error al actualizar stock:', e));
    return doc;
  }

  async updateDocument(id: string, updates: Partial<PurchaseDocument>): Promise<PurchaseDocument> {
    // If items change, capture the originals before overwriting so we can adjust stock
    let originalItems: PurchaseItem[] | undefined;
    if (updates.items !== undefined) {
      const original = await this.purchases.findById(id);
      originalItems = original?.items;
    }

    const updated = await this.purchases.update(id, updates);

    // Stock adjustment is best-effort — document is already saved regardless
    if (updates.items !== undefined && originalItems !== undefined) {
      this._applyStockAdjustment(originalItems, updates.items)
        .catch(e => console.error('[Compras] Error al ajustar stock:', e));
    }

    return updated;
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

  // Registra entradas de stock para todos los ítems del documento (al crear)
  private async _applyStockEntries(doc: PurchaseDocument): Promise<void> {
    await Promise.all(
      doc.items.map(async item => {
        const product = await this.products.findById(item.productId);
        if (!product) return;
        await this.products.updateStock(product.id, item.quantity);
      })
    );
  }

  // Ajusta el stock cuando se editan los ítems de un documento existente.
  // Calcula el delta neto por producto: (cantidad nueva) − (cantidad anterior).
  private async _applyStockAdjustment(
    oldItems: PurchaseItem[],
    newItems: PurchaseItem[],
  ): Promise<void> {
    const deltas = new Map<string, number>();
    for (const item of oldItems) {
      deltas.set(item.productId, (deltas.get(item.productId) ?? 0) - item.quantity);
    }
    for (const item of newItems) {
      deltas.set(item.productId, (deltas.get(item.productId) ?? 0) + item.quantity);
    }

    await Promise.all(
      Array.from(deltas.entries())
        .filter(([, delta]) => delta !== 0)
        .map(async ([productId, delta]) => {
          const product = await this.products.findById(productId);
          if (!product) return;
          await this.products.updateStock(product.id, delta);
        }),
    );
  }
}
