import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DoorOpen, DoorClosed, ArrowRightLeft, Pencil } from 'lucide-react';
import { CashRegisterSession } from '@/types';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';
import { toast } from 'sonner';

interface Bank {
  id: string;
  name: string;
  isActive: boolean;
  balance?: number;
}

interface Props {
  currentSession: CashRegisterSession | undefined;
  selectedDate: string;
  expectedCash: number;
  estimatedCloseCash: number;
  dailyTransfers: number;
  isAdmin: boolean;
  banks: Bank[];
  onOpen: (amount: number) => void;
  onClose: (amount: number, notes: string) => void;
  onTransfer: (amount: number, description: string) => void;
  onEditSession: () => void;
}

export default function CashSessionCard({
  currentSession, selectedDate, expectedCash, estimatedCloseCash, dailyTransfers,
  isAdmin, onOpen, onClose, onTransfer, onEditSession,
}: Props) {
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [isOpeningDialog, setIsOpeningDialog] = useState(false);
  const [isClosingDialog, setIsClosingDialog] = useState(false);
  const [isTransferDialog, setIsTransferDialog] = useState(false);

  const handleOpen = () => {
    const amount = parseMoney(openingAmount);
    if (amount <= 0) { toast.error('Ingresa un monto válido'); return; }
    onOpen(amount);
    setOpeningAmount('');
    setIsOpeningDialog(false);
  };

  const handleClose = () => {
    const amount = parseMoney(closingAmount);
    if (amount < 0) { toast.error('Ingresa un monto válido'); return; }
    onClose(amount, closingNotes);
    setClosingAmount('');
    setClosingNotes('');
    setIsClosingDialog(false);
  };

  const handleTransfer = () => {
    const amount = parseMoney(transferAmount);
    if (amount <= 0) { toast.error('Ingresa un monto válido'); return; }
    if (amount > estimatedCloseCash) {
      toast.error(`El traspaso ($${amount.toLocaleString('es-CO')}) supera el efectivo disponible en caja ($${estimatedCloseCash.toLocaleString('es-CO')})`);
      return;
    }
    onTransfer(amount, transferDescription);
    setTransferAmount('');
    setTransferDescription('');
    setIsTransferDialog(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Estado de Caja</span>
          {currentSession && (
            <Badge variant={currentSession.status === 'open' ? 'default' : 'secondary'}>
              {currentSession.status === 'open' ? 'Abierta' : 'Cerrada'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!currentSession ? (
          <div className="text-center py-6">
            <DoorClosed className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No hay caja abierta para este día</p>
            <Dialog open={isOpeningDialog} onOpenChange={setIsOpeningDialog}>
              <DialogTrigger asChild>
                <Button><DoorOpen className="h-4 w-4 mr-2" />Abrir Caja</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Apertura de Caja - {selectedDate}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Monto inicial en efectivo</Label>
                    <Input type="text" inputMode="numeric"
                      value={openingAmount} onChange={(e) => setOpeningAmount(fmtMoneyInput(e.target.value))} />
                  </div>
                  <Button onClick={handleOpen} className="w-full">Confirmar Apertura</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600">Apertura</p>
                <p className="font-semibold">${currentSession.openingAmount.toLocaleString('es-CO')}</p>
                <p className="text-xs text-gray-500">{new Date(currentSession.openingTime).toLocaleTimeString('es-CO')}</p>
              </div>
              {currentSession.status === 'closed' && (
                <>
                  <div>
                    <p className="text-xs text-gray-600">Cierre</p>
                    <p className="font-semibold">${currentSession.closingAmount?.toLocaleString('es-CO')}</p>
                    <p className="text-xs text-gray-500">
                      {currentSession.closingTime && new Date(currentSession.closingTime).toLocaleTimeString('es-CO')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Esperado</p>
                    <p className="font-semibold">${expectedCash.toLocaleString('es-CO')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Diferencia</p>
                    <p className={`font-semibold ${currentSession.difference === 0 ? 'text-green-600' : currentSession.difference! > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ${Math.abs(currentSession.difference || 0).toLocaleString('es-CO')}
                      {currentSession.difference !== 0 && (currentSession.difference! > 0 ? ' a favor' : ' en contra')}
                    </p>
                  </div>
                </>
              )}
            </div>

            {isAdmin && (
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={onEditSession}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {currentSession.status === 'open' ? 'Editar base de apertura' : 'Modificar Cierre'}
                </Button>
              </div>
            )}

            {currentSession.status === 'open' && (
              <div className="flex gap-2">
                <Dialog open={isClosingDialog} onOpenChange={setIsClosingDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><DoorClosed className="h-4 w-4 mr-2" />Cerrar Caja</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cierre de Caja - {selectedDate}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium">Efectivo esperado</p>
                        <p className="text-2xl font-bold text-blue-700">${expectedCash.toLocaleString('es-CO')}</p>
                      </div>
                      <div>
                        <Label>Efectivo contado en caja</Label>
                        <Input type="text" inputMode="numeric"
                          value={closingAmount} onChange={(e) => setClosingAmount(fmtMoneyInput(e.target.value))} />
                      </div>
                      <div>
                        <Label>Notas (opcional)</Label>
                        <Input value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)}
                          placeholder="Observaciones sobre el cierre" />
                      </div>
                      <Button onClick={handleClose} className="w-full">Confirmar Cierre</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isTransferDialog} onOpenChange={setIsTransferDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><ArrowRightLeft className="h-4 w-4 mr-2" />Traspaso de Efectivo</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Traspaso de Efectivo a Caja Fuerte</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="p-4 bg-blue-50 rounded-lg space-y-1">
                        <div className="flex justify-between text-sm text-blue-800">
                          <span>Efectivo disponible en caja:</span>
                          <strong>${estimatedCloseCash.toLocaleString('es-CO')}</strong>
                        </div>
                        {dailyTransfers > 0 && (
                          <div className="flex justify-between text-xs text-blue-600">
                            <span>Ya traspasado hoy:</span>
                            <span>${dailyTransfers.toLocaleString('es-CO')}</span>
                          </div>
                        )}
                        <p className="text-xs text-blue-600 mt-1">
                          El traspaso se descontará del efectivo de caja e ingresará a Caja Fuerte.
                        </p>
                      </div>
                      <div>
                        <Label>Monto a traspasar</Label>
                        <Input type="text" inputMode="numeric"
                          value={transferAmount} onChange={(e) => setTransferAmount(fmtMoneyInput(e.target.value))} />
                      </div>
                      <div>
                        <Label>Descripción (opcional)</Label>
                        <Input value={transferDescription} onChange={(e) => setTransferDescription(e.target.value)}
                          placeholder="Descripción del traspaso" />
                      </div>
                      <Button onClick={handleTransfer} className="w-full">Confirmar Traspaso</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
