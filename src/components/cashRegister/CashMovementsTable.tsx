import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { CashMovement } from '@/types/cashRegister';
import { MOVEMENT_TYPE_LABELS } from '@/types/cashRegister';

const TYPE_COLOR: Record<string, string> = {
  SALE:              'bg-green-100 text-green-800',
  EXPENSE:           'bg-red-100 text-red-800',
  CREDIT_PAYMENT:    'bg-blue-100 text-blue-800',
  CAPITAL_INJECTION: 'bg-purple-100 text-purple-800',
  CASH_WITHDRAWAL:   'bg-orange-100 text-orange-800',
  SAFE_TRANSFER:     'bg-gray-100 text-gray-800',
  REFUND:            'bg-yellow-100 text-yellow-800',
  ADJUSTMENT:        'bg-indigo-100 text-indigo-800',
  REVERSAL:          'bg-pink-100 text-pink-800',
};

interface Props {
  movements: CashMovement[];
  isLoading?: boolean;
  maxHeight?: number;
}

export default function CashMovementsTable({ movements, isLoading, maxHeight = 320 }: Props) {
  const fmt = (n: number) => `$${Math.abs(n).toLocaleString('es-CO')}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
        Cargando movimientos...
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No hay movimientos registrados en esta sesión
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded border" style={{ maxHeight }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 border-b">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-600 w-36">Hora</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Tipo</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Descripción</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">Usuario</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Monto</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {movements.map(m => {
            const isIngreso = m.amount > 0;
            return (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-500 font-mono whitespace-nowrap">
                  {new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[m.movementType] ?? 'bg-gray-100 text-gray-700'}`}>
                    {MOVEMENT_TYPE_LABELS[m.movementType]}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{m.description}</td>
                <td className="px-3 py-2 text-xs text-gray-500 truncate max-w-[100px]">{m.createdByName}</td>
                <td className="px-3 py-2 text-right font-mono font-medium">
                  <span className={`flex items-center justify-end gap-1 ${isIngreso ? 'text-green-700' : 'text-red-700'}`}>
                    {isIngreso
                      ? <ArrowUpCircle className="h-3.5 w-3.5" />
                      : <ArrowDownCircle className="h-3.5 w-3.5" />
                    }
                    {fmt(m.amount)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50 border-t font-medium">
          <tr>
            <td colSpan={4} className="px-3 py-2 text-sm">Balance</td>
            <td className="px-3 py-2 text-right font-mono">
              {(() => {
                const bal = movements.reduce((s, m) => s + m.amount, 0);
                return (
                  <span className={bal >= 0 ? 'text-green-700' : 'text-red-700'}>
                    ${bal.toLocaleString('es-CO')}
                  </span>
                );
              })()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
