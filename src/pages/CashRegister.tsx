import { useState, useMemo, useEffect } from 'react';
import { useSales } from '@/hooks/useSales';
import { useExpenses } from '@/hooks/useExpenses';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Calculator, CreditCard, Banknote, Smartphone, DoorOpen, DoorClosed, ArrowRightLeft, Pencil } from 'lucide-react';
import { PaymentMethod, Sale, CashRegisterSession, AccountingRecord } from '@/types';
import { toast } from 'sonner';

export default function CashRegister() {
  const { isAdmin } = useAuth();
  const { sales, paymentMethods, getSalesByDate, advisors } = useSales();
  const { addExpense, getExpensesByDate } = useExpenses();
  const { banks, updateBankBalance } = useSettings();
  const [advisorInput, setAdvisorInput] = useState('');
  const [expenseType, setExpenseType] = useState<'gasto' | 'prestamo'>('gasto');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });

  // Estados para apertura/cierre de caja
  const [cashSessions, setCashSessions] = useLocalStorage<CashRegisterSession[]>('cashSessions', []);
  const [accountingRecords, setAccountingRecords] = useLocalStorage<AccountingRecord[]>("accountingRecords",[]);
  const [openingAmount, setOpeningAmount] = useState<string>('');
  const [closingAmount, setClosingAmount] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [isOpeningDialog, setIsOpeningDialog] = useState(false);
  const [isClosingDialog, setIsClosingDialog] = useState(false);

  // Estados para traspaso de efectivo
  const [isTransferDialog, setIsTransferDialog] = useState(false);
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferDescription, setTransferDescription] = useState<string>('');

  // Estados para modificar sesión cerrada
  const [isEditSessionDialog, setIsEditSessionDialog] = useState(false);
  const [editOpeningAmount, setEditOpeningAmount] = useState<string>('');
  const [editClosingAmount, setEditClosingAmount] = useState<string>('');
  const [editClosingNotes, setEditClosingNotes] = useState<string>('');


  // Obtener la sesión de caja del día seleccionado
  const currentSession = cashSessions.find(s => s.date === selectedDate);

  const dailyExpenses = getExpensesByDate(selectedDate);
  const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const filteredExpenses = useMemo(() => {
    if (!advisorFilter) return dailyExpenses;
    return dailyExpenses.filter(e => e.advisor === advisorFilter);
  }, [advisorFilter, dailyExpenses]);

  const parseMoney = (s: string) => parseInt(s.replace(/\./g, ''), 10) || 0;
  const fmtMoneyInput = (s: string) => {
    const raw = s.replace(/\D/g, '');
    return raw === '' ? '' : raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  const numToMoneyStr = (n: number) => n > 0 ? Math.round(n).toLocaleString('es-CO') : '';

  const handleAddExpense = () => {
    const amount = parseMoney(expenseAmount);
    if (!currentSession || currentSession.status === 'closed') { toast.error('La caja está cerrada. No se pueden registrar egresos.'); return; }
    if (!advisorInput) { toast.error('Selecciona un asesor'); return; }
    if (amount <= 0) { toast.error('El monto debe ser mayor a $0'); return; }
    if (!expenseDesc.trim()) { toast.error('La descripción del gasto es obligatoria'); return; }
    const advisor = advisors.find(a => a.id === advisorInput);
    addExpense(advisorInput, advisor?.name ?? advisorInput, expenseType, amount, expenseDesc);
    setExpenseAmount('');
    setExpenseDesc('');
  };

  // Función para abrir caja
  const handleOpenCashRegister = () => {
    const amount = parseMoney(openingAmount);
    if (amount < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    const newSession: CashRegisterSession = {
      id: crypto.randomUUID(),
      date: selectedDate,
      openingAmount: amount,
      openingTime: new Date().toISOString(),
      status: 'open'
    };

    setCashSessions([...cashSessions, newSession]);

    // Registrar en contabilidad como ingreso
    const newRecord: AccountingRecord = {
      id: Date.now(),
      tipo: 'ingreso',
      descripcion: `Apertura de caja - ${selectedDate}`,
      monto: amount,
      banco: 'efectivo',
      fecha: new Date().toISOString(),
    };
    setAccountingRecords([...accountingRecords, newRecord]);

    toast.success(`Caja abierta con $${amount.toLocaleString('es-CO')}`);
    setOpeningAmount('');
    setIsOpeningDialog(false);
  };

  // Función para cerrar caja
  const handleCloseCashRegister = () => {
    if (!currentSession || currentSession.status === 'closed') {
      toast.error('No hay una caja abierta para cerrar');
      return;
    }

    const amount = parseMoney(closingAmount);
    if (amount < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    // Calcular lo esperado en efectivo
    const expectedCash = calculateExpectedCash();
    const difference = amount - expectedCash;

    const updatedSession: CashRegisterSession = {
      ...currentSession,
      closingAmount: amount,
      closingTime: new Date().toISOString(),
      status: 'closed',
      difference: difference,
      notes: closingNotes
    };

    setCashSessions(cashSessions.map(s => s.id === currentSession.id ? updatedSession : s));

    toast.success(
      difference === 0
        ? 'Caja cerrada correctamente. Cuadre exacto.'
        : `Caja cerrada. Diferencia: $${Math.abs(difference).toLocaleString('es-CO')} ${difference > 0 ? 'a favor' : 'en contra'}`
    );

    setClosingAmount('');
    setClosingNotes('');
    setIsClosingDialog(false);
  };

  // Función para traspaso de efectivo a caja principal
  const handleTransferCash = () => {
    if (!currentSession || currentSession.status === 'closed') {
      toast.error('Debe haber una caja abierta para hacer traspasos');
      return;
    }

    const amount = parseMoney(transferAmount);
    if (amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    // Validar que no supere el efectivo disponible en caja
    const availableCash = estimatedCloseCash;
    if (amount > availableCash) {
      toast.error(
        `El traspaso ($${amount.toLocaleString('es-CO')}) supera el efectivo disponible en caja ($${availableCash.toLocaleString('es-CO')})`
      );
      return;
    }

    // Registrar en contabilidad como traspaso
    const newRecord: AccountingRecord = {
      id: Date.now(),
      tipo: 'traspaso',
      descripcion: transferDescription || `Traspaso de efectivo a Caja Fuerte`,
      monto: amount,
      banco: 'efectivo', // Sale del efectivo
      fecha: new Date().toISOString(),
    };
    setAccountingRecords([...accountingRecords, newRecord]);

    // Actualizar balance de caja principal
    updateBankBalance('caja-principal', amount);

    toast.success(`Traspaso de $${amount.toLocaleString('es-CO')} a Caja Fuerte realizado exitosamente`);
    setTransferAmount('');
    setTransferDescription('');
    setIsTransferDialog(false);
  };

  // Abrir dialog de edición de sesión cerrada
  const handleOpenEditSession = () => {
    if (!currentSession) return;
    setEditOpeningAmount(numToMoneyStr(currentSession.openingAmount));
    setEditClosingAmount(numToMoneyStr(currentSession.closingAmount ?? 0));
    setEditClosingNotes(currentSession.notes ?? '');
    setIsEditSessionDialog(true);
  };

  // Guardar cambios en sesión cerrada
  const handleSaveEditSession = () => {
    if (!currentSession) return;
    const opening = parseMoney(editOpeningAmount);
    const closing = parseMoney(editClosingAmount);
    if (opening < 0) { toast.error('Monto de apertura inválido'); return; }
    if (closing < 0) { toast.error('Monto de cierre inválido'); return; }
    const expected = calculateExpectedCash();
    const difference = closing - expected;
    setCashSessions(cashSessions.map(s => s.id === currentSession.id
      ? { ...s, openingAmount: opening, closingAmount: closing, difference, notes: editClosingNotes }
      : s
    ));
    toast.success('Sesión de caja actualizada');
    setIsEditSessionDialog(false);
  };

  // Reabrir sesión cerrada
  const handleReopenSession = () => {
    if (!currentSession) return;
    if (!confirm('¿Estás seguro de reabrir esta caja? Se podrán registrar nuevos egresos.')) return;
    setCashSessions(cashSessions.map(s => s.id === currentSession.id
      ? { ...s, status: 'open', closingAmount: undefined, closingTime: undefined, difference: undefined, notes: undefined }
      : s
    ));
    setIsEditSessionDialog(false);
    toast.success('Caja reabierta correctamente');
  };

  // Calcular efectivo esperado en caja
  const calculateExpectedCash = () => {
    // Efectivo inicial (apertura)
    const initial = currentSession?.openingAmount || 0;

    // Ventas en efectivo del día (por tipo, no por ID hardcodeado)
    const cashSales = dailySales
      .filter(sale => sale.paymentMethod.type === 'cash')
      .reduce((sum, sale) => sum + sale.total, 0);

    // Abonos en efectivo del día
    const cashDeposits = depositRecordsOfDay
      .filter(rec => rec.method.type === 'cash')
      .reduce((sum, rec) => sum + rec.amount, 0);

    // Gastos del día
    const expenses = totalExpenses;

    // Traspasos a Caja Fuerte del día
    const transfers = dailyTransfers;

    return initial + cashSales + cashDeposits - expenses - transfers;
  };

  // --- Ventas del día (todas las completadas del mismo día) ---
  const dailySales: Sale[] = useMemo(() => {
    return getSalesByDate(selectedDate).filter(sale => sale.status === 'completed');
  }, [selectedDate, getSalesByDate]);


  /*const handleAddExpense = () => {
    const amount = Number(expenseAmount);
    if (!advisorInput || isNaN(amount) || amount <= 0) return;

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      advisor: advisorInput,
      type: expenseType,
      amount,
      description: expenseDesc,
      createdAt: new Date().toISOString(),
    };

    setExpenses(prev => [...prev, newExpense]);
    setExpensesMap(prev => ({
      ...prev,
      [selectedDate]: [...(prev[selectedDate] ?? []), newExpense]
    }));

    setExpenseAmount("");
    setExpenseDesc("");
  };*/

// Registros de abonos de separados del día (por fecha del abono)
// Nota: comparamos por clave local 'YYYY-MM-DD' para evitar desfases de zona horaria.
const depositRecordsOfDay = useMemo(() => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const toKey = (date: Date) => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    return `${y}-${m}-${dd}`;
  };
  const targetKey = selectedDate; // valor de <input type="date" />

  const records: { amount: number; method: PaymentMethod }[] = [];

  sales.forEach(sale => {
    if (sale.type !== 'reserved') return;

    // Si hay historial de abonos, usar su fecha real de creación
    if (sale.deposits && sale.deposits.length > 0) {
      sale.deposits.forEach(d => {
        if (toKey(new Date(d.createdAt)) === targetKey) {
          records.push({ amount: d.amount, method: d.method });
        }
      });
    } else {
      // Compatibilidad: si solo existe "deposit" y la fecha de la venta coincide
      const amount = sale.deposit ?? 0;
      if (amount > 0 && toKey(new Date(sale.createdAt)) === targetKey) {
        records.push({ amount, method: sale.paymentMethod });
      }
    }
  });

  return records;
}, [selectedDate, sales]);

 
  const summary = useMemo(() => {
    let cashSales = 0;
    let electronicSales = 0;
    let creditSales = 0;
    let totalSales = 0;

    const paymentBreakdown: { [key: string]: { count: number; amount: number } } = {};

    dailySales.forEach(sale => {
      
      totalSales += sale.total;

      // Inicializar si no existe
      if (!paymentBreakdown[sale.paymentMethod.name]) {
        paymentBreakdown[sale.paymentMethod.name] = { count: 0, amount: 0 };
      }

      paymentBreakdown[sale.paymentMethod.name].count++;
      paymentBreakdown[sale.paymentMethod.name].amount += sale.total;

      switch (sale.paymentMethod.type) {
        case 'cash':
          cashSales += sale.total;
          break;
        case 'electronic':
          electronicSales += sale.total;
          break;
        case 'credit':
          creditSales += sale.total;
          break;
      }
    });

    return {
      cashSales,
      electronicSales,
      creditSales,
      totalSales,
      totalTransactions: dailySales.length,
      paymentBreakdown
    };
  }, [dailySales]);

  // Resumen de abonos de separados por método de pago (del día)
  const depositSummary = useMemo(() => {
    let depositCash = 0;
    let depositElectronic = 0;
    let depositCredit = 0;
    let totalDeposits = 0;

    const depositBreakdown: { [key: string]: { count: number; amount: number } } = {};

    depositRecordsOfDay.forEach(rec => {
      const amount = rec.amount;
      const method = rec.method;
      totalDeposits += amount;

      if (!depositBreakdown[method.name]) {
        depositBreakdown[method.name] = { count: 0, amount: 0 };
      }
      depositBreakdown[method.name].count++;
      depositBreakdown[method.name].amount += amount;

      switch (method.type) {
        case 'cash':
          depositCash += amount;
          break;
        case 'electronic':
          depositElectronic += amount;
          break;
        case 'credit':
          depositCredit += amount;
          break;
      }
    });

    return {
      depositCash,
      depositElectronic,
      depositCredit,
      totalDeposits,
      totalTransactions: depositRecordsOfDay.length,
      depositBreakdown
    };
  }, [depositRecordsOfDay]);

  // Totales combinados (ventas completadas + abonos de separados) por método y general
  const totalsWithDeposits = useMemo(() => {
    return {
      total: summary.totalSales + depositSummary.totalDeposits,
      cash: summary.cashSales + depositSummary.depositCash,
      electronic: summary.electronicSales + depositSummary.depositElectronic,
      credit: summary.creditSales + depositSummary.depositCredit
    };
  }, [summary, depositSummary]);

  // Traspasos a Caja Fuerte realizados en el día seleccionado (comparación en hora local)
  const dailyTransfers = useMemo(() => {
    const toLocalKey = (isoStr: string) => {
      const d = new Date(isoStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    return accountingRecords
      .filter(r => r.tipo === 'traspaso' && toLocalKey(r.fecha) === selectedDate)
      .reduce((sum, r) => sum + r.monto, 0);
  }, [accountingRecords, selectedDate]);

  // Cierre estimado en efectivo: apertura + efectivo del día - gastos - traspasos
  const estimatedCloseCash = useMemo(() => {
    const opening = currentSession?.openingAmount ?? 0;
    return opening + totalsWithDeposits.cash - totalExpenses - dailyTransfers;
  }, [currentSession, totalsWithDeposits, totalExpenses, dailyTransfers]);

 
  const getPaymentIcon = (type: 'cash' | 'electronic' | 'credit') => {
    switch (type) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'electronic':
        return <CreditCard className="h-4 w-4" />;
      case 'credit':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Calculator className="h-4 w-4" />;
    }
  };

  return (

    <ScrollArea className="h-screen p-6 ">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Arqueo de Caja</h1>
          <p className="mt-2 text-gray-600">
            Resumen diario de ventas y métodos de pago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Estado de Caja */}
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
                  <Button>
                    <DoorOpen className="h-4 w-4 mr-2" />
                    Abrir Caja
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Apertura de Caja - {selectedDate}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Monto inicial en efectivo</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={openingAmount}
                        onChange={(e) => setOpeningAmount(fmtMoneyInput(e.target.value))}
                        placeholder=""
                      />
                    </div>
                    <Button onClick={handleOpenCashRegister} className="w-full">
                      Confirmar Apertura
                    </Button>
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
                  <p className="text-xs text-gray-500">
                    {new Date(currentSession.openingTime).toLocaleTimeString('es-CO')}
                  </p>
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
                      <p className="font-semibold">${calculateExpectedCash().toLocaleString('es-CO')}</p>
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

              {currentSession.status === 'closed' && isAdmin() && (
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={handleOpenEditSession}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Modificar Cierre
                  </Button>
                </div>
              )}

              {currentSession.status === 'open' && (
                <div className="flex gap-2">
                  <Dialog open={isClosingDialog} onOpenChange={setIsClosingDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <DoorClosed className="h-4 w-4 mr-2" />
                        Cerrar Caja
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cierre de Caja - {selectedDate}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium">Efectivo esperado</p>
                          <p className="text-2xl font-bold text-blue-700">
                            ${calculateExpectedCash().toLocaleString('es-CO')}
                          </p>
                        </div>
                        <div>
                          <Label>Efectivo contado en caja</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={closingAmount}
                            onChange={(e) => setClosingAmount(fmtMoneyInput(e.target.value))}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label>Notas (opcional)</Label>
                          <Input
                            value={closingNotes}
                            onChange={(e) => setClosingNotes(e.target.value)}
                            placeholder="Observaciones sobre el cierre"
                          />
                        </div>
                        <Button onClick={handleCloseCashRegister} className="w-full">
                          Confirmar Cierre
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isTransferDialog} onOpenChange={setIsTransferDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Traspaso de Efectivo
                      </Button>
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
                              <span>Ya traspassado hoy:</span>
                              <span>${dailyTransfers.toLocaleString('es-CO')}</span>
                            </div>
                          )}
                          <p className="text-xs text-blue-600 mt-1">
                            El traspaso se descontará del efectivo de caja e ingresará a Caja Fuerte.
                          </p>
                        </div>
                        <div>
                          <Label>Monto a traspasar</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(fmtMoneyInput(e.target.value))}
                            placeholder=""
                          />
                        </div>
                        <div>
                          <Label>Descripción (opcional)</Label>
                          <Input
                            value={transferDescription}
                            onChange={(e) => setTransferDescription(e.target.value)}
                            placeholder="Descripción del traspaso"
                          />
                        </div>
                        <Button onClick={handleTransferCash} className="w-full">
                          Confirmar Traspaso
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog modificar sesión cerrada */}
      <Dialog open={isEditSessionDialog} onOpenChange={setIsEditSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modificar Caja — {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Monto de apertura</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={editOpeningAmount}
                onChange={(e) => setEditOpeningAmount(fmtMoneyInput(e.target.value))}
                placeholder=""
              />
            </div>
            <div>
              <Label>Monto de cierre (efectivo contado)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={editClosingAmount}
                onChange={(e) => setEditClosingAmount(fmtMoneyInput(e.target.value))}
                placeholder=""
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Input
                value={editClosingNotes}
                onChange={(e) => setEditClosingNotes(e.target.value)}
                placeholder="Observaciones del cierre"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveEditSession} className="flex-1">
                Guardar cambios
              </Button>
              <Button variant="outline" onClick={handleReopenSession} className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50">
                <DoorOpen className="h-4 w-4 mr-2" />
                Reabrir caja
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Ventas
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalsWithDeposits.total.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalTransactions} ventas • {depositSummary.totalTransactions} abonos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas en Efectivo
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalsWithDeposits.cash.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              {((totalsWithDeposits.cash / (totalsWithDeposits.total || 1)) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Medios Electrónicos
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${totalsWithDeposits.electronic.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              {((totalsWithDeposits.electronic / (totalsWithDeposits.total || 1)) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Créditos
            </CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${totalsWithDeposits.credit.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              {((totalsWithDeposits.credit / (totalsWithDeposits.total || 1)) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cierre Estimado
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              ${estimatedCloseCash.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              Apertura + efectivo − gastos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desglose por método de pago */}
        <Card>
          <CardHeader>
            <CardTitle>Desglose por Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Unir métodos de ventas y métodos de abonos en una sola lista
                const allMethods = new Set([
                  ...Object.keys(summary.paymentBreakdown),
                  ...Object.keys(depositSummary.depositBreakdown)
                ]);
                return Array.from(allMethods).map(method => {
                  const paymentMethodInfo = paymentMethods.find(pm => pm.name === method);
                  const salesData = summary.paymentBreakdown[method] || { count: 0, amount: 0 };
                  const depositData = depositSummary.depositBreakdown[method] || { count: 0, amount: 0 };
                  return (
                    <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {paymentMethodInfo && getPaymentIcon(paymentMethodInfo.type)}
                        <div>
                          <p className="font-medium">{method}</p>
                          <p className="text-xs text-gray-600">
                            {salesData.count > 0 && `${salesData.count} ventas`}
                            {salesData.count > 0 && depositData.count > 0 && ' • '}
                            {depositData.count > 0 && `${depositData.count} abonos`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {salesData.amount > 0 && (
                          <>
                            <p className="font-bold">Ventas: ${salesData.amount.toLocaleString('es-CO')}</p>
                            <p className="text-xs text-gray-600 mb-1">
                              {((salesData.amount / summary.totalSales) * 100 || 0).toFixed(1)}% del total ventas
                            </p>
                          </>
                        )}
                        {depositData.amount > 0 && (
                          <>
                            <p className="font-bold text-purple-700">Abonos: ${depositData.amount.toLocaleString('es-CO')}</p>
                            <p className="text-xs text-gray-600">
                              {((depositData.amount / (depositSummary.totalDeposits || 1)) * 100 || 0).toFixed(1)}% del total abonos
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>


        {/* Lista de ventas del día */}
        <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Egresos (Gastos y Préstamos)
            {currentSession?.status === 'closed' && (
              <Badge variant="secondary">Caja cerrada — solo lectura</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Formulario para registrar egreso — bloqueado si caja cerrada o no abierta */}
          {(!currentSession || currentSession.status === 'closed') ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 mb-4 text-center">
              {!currentSession
                ? 'Abre la caja para registrar egresos.'
                : 'La caja está cerrada. No se pueden registrar nuevos egresos.'}
            </div>
          ) : (
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
  <div>
    <Label>Asesor</Label>
    <select
      value={advisorInput}
      onChange={e => setAdvisorInput(e.target.value)}
      className="w-full border rounded p-2"
    >
      <option value="">Seleccione...</option>
      {advisors.map(ad => (
        <option key={ad.id} value={ad.id}>
          {ad.name}
        </option>
      ))}
    </select>
  </div>
  <div>
    <Label>Tipo</Label>
    <select
      value={expenseType}
      onChange={e => setExpenseType(e.target.value as "gasto" | "prestamo")}
      className="w-full border rounded p-2"
    >
      <option value="gasto">Gasto</option>
      <option value="prestamo">Préstamo</option>
    </select>
  </div>
  <div>
    <Label>Monto</Label>
    <Input
      type="text"
      inputMode="numeric"
      value={expenseAmount}
      onChange={e => setExpenseAmount(fmtMoneyInput(e.target.value))}
      placeholder=""
    />
  </div>
  <div>
    <Label>Descripción</Label>
    <Input
      value={expenseDesc}
      onChange={e => setExpenseDesc(e.target.value)}
      placeholder="Detalle"
    />
  </div>
</div>
          )}
          {currentSession?.status === 'open' && (
            <Button onClick={handleAddExpense}>Registrar Egreso</Button>
          )}

{/* Filtro por asesor */}
<div className="mt-6">
  <label
    htmlFor="advisorFilter"
    className="block text-sm font-medium text-gray-700"
  >
    Filtrar por asesor
  </label>
  <select
    id="advisorFilter"
    value={advisorFilter}
    onChange={(e) => setAdvisorFilter(e.target.value)}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
  >
    <option value="">Todos</option>
    {advisors.map(ad => (
      <option key={ad.id} value={ad.name}>
        {ad.name}
      </option>
    ))}
  </select>
</div>

          {/* Lista de egresos */}
          <div className="mt-6 space-y-2 max-h-60 overflow-y-auto">
            {filteredExpenses.length === 0 ? (
              <p className="text-gray-500 text-center">No hay egresos registrados</p>
            ) : (
              filteredExpenses.map(e => (
                <div key={e.id} className="p-3 border rounded-lg flex justify-between">
                  <div>
                    <p className="font-medium">{e.type.toUpperCase()}</p>
                    <p className="text-xs text-gray-600">{e.advisor}</p>
                    <p className="text-xs">{e.description}</p>
                  </div>
                  <div className="text-right font-bold text-red-600">
                    -${e.amount.toLocaleString("es-CO")}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total egresos */}
          <div className="mt-4 text-right font-bold text-red-700">
            Total Egresos: ${totalExpenses.toLocaleString("es-CO")}
          </div>
        </CardContent>
      </Card>
      </div>
    </ScrollArea>
  );
}