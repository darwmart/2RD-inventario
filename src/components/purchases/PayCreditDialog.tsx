import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bank, Purchase } from '@/types';

interface Props {
  purchase: Purchase | null;
  banks: Bank[];
  onClose: () => void;
  onConfirm: (bankId: string) => void;
}

function resolveSupplierName(purchase: Purchase): string {
  return (purchase.supplierName || '').trim() || 'Sin proveedor';
}

export default function PayCreditDialog({ purchase, banks, onClose, onConfirm }: Props) {
  const [bankId, setBankId] = useState('');

  const handleClose = () => {
    setBankId('');
    onClose();
  };

  const handleConfirm = () => {
    if (!bankId) return;
    onConfirm(bankId);
    setBankId('');
  };

  return (
    <Dialog open={!!purchase} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago — {purchase?.documentNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Proveedor: <strong>{purchase ? resolveSupplierName(purchase) : ''}</strong><br />
            Total a pagar: <strong>${purchase?.total.toLocaleString('es-CO')}</strong>
          </p>
          <div>
            <Label>Banco con el que se realiza el pago</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar banco..." />
              </SelectTrigger>
              <SelectContent>
                {banks.filter(b => b.isActive && b.id !== 'efectivo').map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleConfirm} className="w-full" disabled={!bankId}>
            Confirmar Pago
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
