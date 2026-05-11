import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';
import { PurchaseDocument } from '@/types';

interface Bank {
  id: string;
  name: string;
  isActive: boolean;
  balance?: number;
}

interface Props {
  open: boolean;
  invoice: PurchaseDocument | null;
  banks: Bank[];
  pendingAmount: number;
  supplierName: string;
  onClose: () => void;
  onConfirm: (bankId: string) => void;
}

export default function PayInvoiceDialog({ open, invoice, banks, pendingAmount, supplierName, onClose, onConfirm }: Props) {
  const [selectedBank, setSelectedBank] = useState('');

  useEffect(() => {
    if (open && invoice) {
      setSelectedBank(invoice.paymentDetails?.bankId || 'efectivo');
    }
  }, [open, invoice]);

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar Factura como Pagada</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm border-b pb-3">
            <div>
              <span className="text-gray-500">Factura:</span>{' '}
              <span className="font-mono font-bold">{invoice.documentNumber}</span>
            </div>
            <div>
              <span className="text-gray-500">Proveedor:</span>{' '}
              <span className="font-medium">{supplierName}</span>
            </div>
            <div>
              <span className="text-gray-500">Total factura:</span>{' '}
              <span className="font-mono">${invoice.total.toLocaleString('es-CO')}</span>
            </div>
            <div>
              <span className="text-gray-500">Importe pendiente:</span>{' '}
              <span className="font-mono font-bold text-red-600 text-base">
                ${pendingAmount.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          {(invoice.payments || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-1">Pagos anteriores</p>
              <table className="w-full text-xs border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-1 font-medium text-gray-600">Fecha</th>
                    <th className="text-right px-2 py-1 font-medium text-gray-600">Importe</th>
                    <th className="text-left px-2 py-1 font-medium text-gray-600">Banco</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.payments || []).map((pay, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1">{new Date(pay.date).toLocaleDateString('es-CO')}</td>
                      <td className="px-2 py-1 text-right font-mono">${pay.amount.toLocaleString('es-CO')}</td>
                      <td className="px-2 py-1 text-gray-600">{pay.bankName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="space-y-2">
            <Label>Banco / Forma de Pago</Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar banco..." />
              </SelectTrigger>
              <SelectContent>
                {banks.filter(b => b.isActive).map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                    {bank.balance !== undefined && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Saldo: ${bank.balance.toLocaleString('es-CO')})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
            <p className="font-medium">⚠️ Atención:</p>
            <p>Se debitará <strong>${pendingAmount.toLocaleString('es-CO')}</strong> del banco seleccionado.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onConfirm(selectedBank)} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Pago
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
