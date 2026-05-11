import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentMethod } from '@/types';

interface Sale {
  id: string;
  saleNumber: string;
  total: number;
  deposit?: number;
}

interface Props {
  open: boolean;
  sale: Sale | undefined;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
  onConfirm: (amount: number, paymentMethodId: string) => void;
}

export default function DepositDialog({ open, sale, paymentMethods, onClose, onConfirm }: Props) {
  const [amount, setAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');

  useEffect(() => {
    if (open) { setAmount(''); setPaymentMethodId(''); }
  }, [open]);

  const paid = sale?.deposit ?? 0;
  const remaining = sale ? Math.max(0, sale.total - paid) : 0;

  const handleConfirm = () => {
    const num = parseInt(amount.replace(/\./g, ''), 10) || 0;
    onConfirm(num, paymentMethodId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Abono</DialogTitle>
        </DialogHeader>

        {!sale ? (
          <div className="text-sm text-gray-500">Selecciona un separado</div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-700">
              <div><span className="text-gray-500">Separado:</span> {sale.saleNumber}</div>
              <div><span className="text-gray-500">Total:</span> ${sale.total.toLocaleString('es-CO')}</div>
              <div><span className="text-gray-500">Abonado:</span> ${paid.toLocaleString('es-CO')}</div>
              <div className="font-medium"><span className="text-gray-500">Saldo pendiente:</span> ${remaining.toLocaleString('es-CO')}</div>
            </div>

            <div>
              <Label>Método de Pago</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar método" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.filter(pm => pm.isActive).map(pm => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Monto a Abonar</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setAmount(raw === '' ? '' : raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                }}
              />
              {remaining > 0 && (
                <div className="text-xs text-gray-500 mt-1">Máximo permitido: ${remaining.toLocaleString('es-CO')}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleConfirm}>Confirmar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
