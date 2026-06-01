import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { CashSession } from '@/types/cashRegister';

interface Props {
  open: boolean;
  session: CashSession | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export default function ReopenSessionDialog({ open, session, onClose, onConfirm, isLoading }: Props) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); setReason(''); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <RotateCcw className="h-5 w-5" />
            Reabrir Sesión de Caja
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Acción de administrador requerida</p>
              <p className="mt-1">
                El cierre original <strong>{session?.sessionNumber}</strong> quedará en el historial.
                Se generará un registro de auditoría con tu usuario y el motivo.
              </p>
            </div>
          </div>

          {session && (
            <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 rounded-lg p-3">
              <span className="text-gray-600">Sesión:</span>
              <span className="font-mono font-medium">{session.sessionNumber}</span>
              <span className="text-gray-600">Cerrada:</span>
              <span>{session.closedAt ? new Date(session.closedAt).toLocaleString('es-CO') : '—'}</span>
              <span className="text-gray-600">Monto cierre:</span>
              <span className="font-medium">${(session.closingAmount ?? 0).toLocaleString('es-CO')}</span>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">
              Motivo de reapertura <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: Venta registrada manualmente pendiente de ingresar al sistema..."
              rows={3}
              className="mt-1 resize-none"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">{reason.length} caracteres (mínimo 10)</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => { onClose(); setReason(''); }}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={reason.trim().length < 10 || isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isLoading ? 'Reabriendo...' : 'Reabrir Caja'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
