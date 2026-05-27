import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { purchasesService } from '@/infrastructure/container';
import type { PurchaseDocument, DocumentType, DocumentStatus } from '@/types/purchase';
import type { CreateDocumentInput } from '@/domain/purchases';

export const purchaseKeys = { all: ['purchases'] as const };

export function usePurchasesData() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: purchaseKeys.all,
    queryFn: () => purchasesService.getAll(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: purchaseKeys.all });
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['banks'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateDocumentInput) => purchasesService.createDocument(data),
    onSuccess: (doc) => {
      invalidate();
      const label = doc.documentType === 'delivery' ? 'Remisión' : 'Factura';
      toast.success(`${label} ${doc.documentNumber} creada`);
    },
    onError: (e: Error) => { invalidate(); toast.error(e.message); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PurchaseDocument> }) =>
      purchasesService.updateDocument(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchasesService.deleteDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all });
      toast.success('Documento eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DocumentStatus }) =>
      purchasesService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const markAsPaidMutation = useMutation({
    mutationFn: ({ id, bankId, bankName, amount }: { id: string; bankId: string; bankName: string; amount: number }) =>
      purchasesService.markAsPaid(id, bankId, bankName, amount),
    onSuccess: () => {
      invalidate();
      toast.success('Pago registrado correctamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertMutation = useMutation({
    mutationFn: ({ deliveryId, paymentData }: Parameters<typeof purchasesService.convertDeliveryToInvoice>) =>
      purchasesService.convertDeliveryToInvoice(deliveryId, paymentData),
    onSuccess: (invoice) => {
      invalidate();
      toast.success(`Factura ${invoice.documentNumber} generada`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purchases = query.data ?? [];

  return {
    purchases,
    isLoading: query.isLoading,

    createDocument:          createMutation.mutate,
    createDocumentAsync:     createMutation.mutateAsync,
    updateDocument:          (id: string, updates: Partial<PurchaseDocument>) =>
                               updateMutation.mutate({ id, updates }),
    deleteDocument:          deleteMutation.mutate,
    updateStatus:            (id: string, status: DocumentStatus) =>
                               statusMutation.mutate({ id, status }),
    markAsPaid:              (id: string, bankId: string, bankName: string, amount: number) =>
                               markAsPaidMutation.mutate({ id, bankId, bankName, amount }),
    convertDeliveryToInvoice:(deliveryId: string, paymentData: Parameters<typeof purchasesService.convertDeliveryToInvoice>[1]) =>
                               convertMutation.mutate({ deliveryId, paymentData }),

    // Derivados síncronos
    generateDocumentNumber: (type: DocumentType) =>
      purchasesService.getNextDocumentNumber(purchases, type),
    getPurchasesByDate: (dateKey: string) =>
      purchases.filter(p => {
        const d = new Date(p.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        return key === dateKey;
      }),
    getPurchasesBySupplier: (supplierId: string) =>
      purchases.filter(p => p.supplierId === supplierId),
  };
}
