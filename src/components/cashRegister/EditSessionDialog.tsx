import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DoorOpen } from 'lucide-react';
import { CashRegisterSession } from '@/types';
import { fmtMoneyInput, numToMoneyStr, parseMoney } from '@/utils/formatters';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  session: CashRegisterSession | undefined;
  expectedCash: number;
  onClose: () => void;
  onSave: (opening: number, closing: number, notes: string) => void;
  onReopen: () => void;
}

export default function EditSessionDialog({ open, session, expectedCash, onClose, onSave, onReopen }: Props) {
  const [editOpeningAmount, setEditOpeningAmount] = useState('');
  const [editClosingAmount, setEditClosingAmount] = useState('');
  const [editClosingNotes, setEditClosingNotes] = useState('');

  useEffect(() => {
    if (!open || !session) return;
    setEditOpeningAmount(numToMoneyStr(session.openingAmount));
    setEditClosingAmount(numToMoneyStr(session.closingAmount ?? 0));
    setEditClosingNotes(session.notes ?? '');
  }, [open, session]);

  const handleSave = () => {
    const opening = parseMoney(editOpeningAmount);
    const closing = parseMoney(editClosingAmount);
    if (opening < 0) { toast.error('Monto de apertura inválido'); return; }
    if (closing < 0) { toast.error('Monto de cierre inválido'); return; }
    onSave(opening, closing, editClosingNotes);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modificar Caja — {session?.date}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Monto de apertura</Label>
            <Input type="text" inputMode="numeric"
              value={editOpeningAmount} onChange={(e) => setEditOpeningAmount(fmtMoneyInput(e.target.value))} />
          </div>
          <div>
            <Label>Monto de cierre (efectivo contado)</Label>
            <Input type="text" inputMode="numeric"
              value={editClosingAmount} onChange={(e) => setEditClosingAmount(fmtMoneyInput(e.target.value))} />
          </div>
          <div>
            <Label>Notas</Label>
            <Input value={editClosingNotes} onChange={(e) => setEditClosingNotes(e.target.value)}
              placeholder="Observaciones del cierre" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">Guardar cambios</Button>
            <Button variant="outline" onClick={onReopen}
              className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50">
              <DoorOpen className="h-4 w-4 mr-2" />Reabrir caja
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
