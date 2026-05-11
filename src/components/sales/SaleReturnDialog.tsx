import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PaymentMethod, Sale, SaleItem } from '@/types';

interface Props {
  sale: Sale | null;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
  onConfirm: (items: SaleItem[], reason: string, paymentMethodId: string) => void;
}

export default function SaleReturnDialog({ sale, paymentMethods, onClose, onConfirm }: Props) {
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnPaymentMethodId, setReturnPaymentMethodId] = useState('');

  const handleOpen = () => {
    if (!sale) return;
    const initial: { [k: string]: number } = {};
    sale.items.forEach(item => { initial[item.productId] = 0; });
    setReturnItems(initial);
    setReturnReason('');
    setReturnPaymentMethodId('');
  };

  const handleConfirm = () => {
    if (!sale) return;
    if (!returnReason.trim()) { toast.error('Indica el motivo de la devolución'); return; }
    const itemsToReturn: SaleItem[] = sale.items
      .filter(item => (returnItems[item.productId] || 0) > 0)
      .map(item => ({
        ...item,
        quantity: returnItems[item.productId],
        total: returnItems[item.productId] * item.unitPrice,
      }));
    if (itemsToReturn.length === 0) { toast.error('Selecciona al menos un artículo para devolver'); return; }
    onConfirm(itemsToReturn, returnReason, returnPaymentMethodId);
    setReturnReason('');
    setReturnPaymentMethodId('');
  };

  return (
    <Dialog open={!!sale} onOpenChange={(open) => { if (!open) onClose(); else handleOpen(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Devolución — {sale?.saleNumber}</DialogTitle>
        </DialogHeader>
        {sale && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Indica las cantidades a devolver por artículo:</p>
            <div className="space-y-2">
              {sale.items.map(item => (
                <div key={item.productId} className="flex items-center justify-between gap-3 p-2 border rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-gray-500">Vendido: {item.quantity} u. · ${item.unitPrice.toLocaleString('es-CO')}</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={returnItems[item.productId] || 0}
                    onChange={e => setReturnItems(prev => ({ ...prev, [item.productId]: Math.min(Number(e.target.value), item.quantity) }))}
                    className="w-16 border rounded p-1 text-center text-sm"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium">Motivo *</label>
              <Input
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                placeholder="Ej: Producto defectuoso, talla incorrecta..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Método de devolución del dinero</label>
              <select
                value={returnPaymentMethodId}
                onChange={e => setReturnPaymentMethodId(e.target.value)}
                className="w-full border rounded p-2 text-sm mt-1"
              >
                <option value="">Sin reembolso / Saldo a favor</option>
                {paymentMethods.filter(pm => pm.isActive).map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 border rounded text-sm" onClick={onClose}>Cancelar</button>
              <button className="px-4 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600" onClick={handleConfirm}>
                Registrar devolución
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
