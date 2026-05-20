import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { CashRegisterSession } from '@/types';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';
import { toast } from 'sonner';

interface Advisor {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  type: string;
  advisor: string;
  description: string;
  amount: number;
}

interface Props {
  currentSession: CashRegisterSession | undefined;
  advisors: Advisor[];
  dailyExpenses: Expense[];
  totalExpenses: number;
  isAdmin: boolean;
  onAddExpense: (advisorId: string, advisorName: string, type: 'gasto' | 'prestamo', amount: number, description: string) => void;
  onDeleteExpense: (id: string) => void;
}

export default function ExpensesCard({ currentSession, advisors, dailyExpenses, totalExpenses, isAdmin, onAddExpense, onDeleteExpense }: Props) {
  const [advisorInput, setAdvisorInput] = useState('');
  const [expenseType, setExpenseType] = useState<'gasto' | 'prestamo'>('gasto');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState('');

  const filteredExpenses = useMemo(() => {
    if (!advisorFilter) return dailyExpenses;
    return dailyExpenses.filter(e => e.advisor === advisorFilter);
  }, [advisorFilter, dailyExpenses]);

  const handleAdd = () => {
    if (!currentSession || currentSession.status === 'closed') {
      toast.error('La caja está cerrada. No se pueden registrar egresos.'); return;
    }
    if (!advisorInput) { toast.error('Selecciona un asesor'); return; }
    const amount = parseMoney(expenseAmount);
    if (amount <= 0) { toast.error('El monto debe ser mayor a $0'); return; }
    if (!expenseDesc.trim()) { toast.error('La descripción del gasto es obligatoria'); return; }
    const advisor = advisors.find(a => a.id === advisorInput);
    onAddExpense(advisorInput, advisor?.name ?? advisorInput, expenseType, amount, expenseDesc);
    setExpenseAmount('');
    setExpenseDesc('');
  };

  const isClosed = !currentSession || currentSession.status === 'closed';

  return (
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
        {isClosed ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 mb-4 text-center">
            {!currentSession ? 'Abre la caja para registrar egresos.' : 'La caja está cerrada. No se pueden registrar nuevos egresos.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Asesor</Label>
              <select value={advisorInput} onChange={e => setAdvisorInput(e.target.value)} className="w-full border rounded p-2">
                <option value="">Seleccione...</option>
                {advisors.map(ad => <option key={ad.id} value={ad.id}>{ad.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Tipo</Label>
              <select value={expenseType} onChange={e => setExpenseType(e.target.value as 'gasto' | 'prestamo')} className="w-full border rounded p-2">
                <option value="gasto">Gasto</option>
                <option value="prestamo">Préstamo</option>
              </select>
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="text" inputMode="numeric"
                value={expenseAmount} onChange={e => setExpenseAmount(fmtMoneyInput(e.target.value))} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="Detalle" />
            </div>
          </div>
        )}

        {currentSession?.status === 'open' && (
          <Button onClick={handleAdd}>Registrar Egreso</Button>
        )}

        <div className="mt-6">
          <label htmlFor="advisorFilter" className="block text-sm font-medium text-gray-700">
            Filtrar por asesor
          </label>
          <select id="advisorFilter" value={advisorFilter} onChange={(e) => setAdvisorFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
            <option value="">Todos</option>
            {advisors.map(ad => <option key={ad.id} value={ad.name}>{ad.name}</option>)}
          </select>
        </div>

        <div className="mt-6 space-y-2 max-h-60 overflow-y-auto">
          {filteredExpenses.length === 0 ? (
            <p className="text-gray-500 text-center">No hay egresos registrados</p>
          ) : (
            filteredExpenses.map(e => (
              <div key={e.id} className="p-3 border rounded-lg flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="font-medium">{e.type.toUpperCase()}</p>
                  <p className="text-xs text-gray-600">{e.advisor}</p>
                  <p className="text-xs">{e.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-600">-${e.amount.toLocaleString('es-CO')}</span>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar este ${e.type} de $${e.amount.toLocaleString('es-CO')}? El monto se restablecerá.`)) {
                          onDeleteExpense(e.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded"
                      title="Eliminar egreso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 text-right font-bold text-red-700">
          Total Egresos: ${totalExpenses.toLocaleString('es-CO')}
        </div>
      </CardContent>
    </Card>
  );
}
