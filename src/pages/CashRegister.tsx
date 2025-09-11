import { useState, useMemo, useEffect } from 'react';
import { useSales } from '@/hooks/useSales';
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Calculator, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { PaymentMethod } from '@/types';

export default function CashRegister() {
  const { sales, paymentMethods, getSalesByDate } = useSales();

   // --- Filtro de cédula ---
  const [documentFilter, setDocumentFilter] = useState("");

  // Fecha seleccionada en formato local YYYY-MM-DD (evita desfases por zona horaria)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });

    // --- Ventas del día (todas las completadas) ---
 const dailySales: Sale[] = useMemo(() => {
    return getSalesByDate(selectedDate).filter(sale => sale.status === 'completed');
  }, [selectedDate, getSalesByDate]);

  // --- Ventas filtradas por cédula ---
  const filteredDailySales = useMemo(() => {
    return dailySales
      .filter(sale => sale.type === "sale") // Solo facturas
      .filter(sale => {
        if (!documentFilter) return true;
        return sale.customerDocument?.toLowerCase().includes(documentFilter.toLowerCase());
      });
  }, [dailySales, documentFilter]);

  // Base del día por fecha (persistencia en localStorage)
  const [dailyBaseMap, setDailyBaseMap] = useLocalStorage<Record<string, { amount: number; updatedAt: string }>>('dailyBaseMap', {});
  const baseAmount = dailyBaseMap[selectedDate]?.amount ?? 0;

  // Control del input editable
  const [baseInput, setBaseInput] = useState<string>('');
  useEffect(() => {
    setBaseInput(baseAmount ? String(baseAmount) : '');
  }, [selectedDate, baseAmount]);

  const handleSaveBase = () => {
    const value = Number(baseInput);
    if (isNaN(value) || value < 0) return;
    setDailyBaseMap(prev => ({
      ...prev,
      [selectedDate]: { amount: Math.round(value), updatedAt: new Date().toISOString() }
    }));
  };

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

  // Cierre estimado en efectivo: base del día + efectivo ingresado en el día
  const estimatedCloseCash = useMemo(() => {
    return baseAmount + totalsWithDeposits.cash;
  }, [baseAmount, totalsWithDeposits]);
 
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

      {/* Base del Día */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Base del Día</CardTitle>
          <div className="text-xs text-muted-foreground">
            {dailyBaseMap[selectedDate]?.updatedAt
              ? new Date(dailyBaseMap[selectedDate].updatedAt).toLocaleDateString('es-CO')
              : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Base registrada</p>
              <p className="text-xl font-bold">${baseAmount.toLocaleString('es-CO')}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Efectivo del día</p>
              <p className="text-xl font-bold text-green-600">${totalsWithDeposits.cash.toLocaleString('es-CO')}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Cierre estimado</p>
              <p className="text-xl font-bold text-indigo-600">${estimatedCloseCash.toLocaleString('es-CO')}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">Transacciones</p>
              <p className="text-xl font-bold">
                {summary.totalTransactions + depositSummary.totalTransactions}
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Ingresar/actualizar base</Label>
              <Input
                type="number"
                min={0}
                value={baseInput}
                onChange={(e) => setBaseInput(e.target.value)}
                placeholder="0"
              />
            </div>
            <Button onClick={handleSaveBase} className="mt-2">
              Guardar base
            </Button>
          </div>
        </CardContent>
      </Card>
 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desglose por método de pago */}
        <Card>
          <CardHeader>
            <CardTitle>Desglose por Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(summary.paymentBreakdown).map(([method, data]) => {
                const paymentMethodInfo = paymentMethods.find(pm => pm.name === method);
                const depositData = depositSummary.depositBreakdown[method] || { count: 0, amount: 0 };
                return (
                  <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {paymentMethodInfo && getPaymentIcon(paymentMethodInfo.type)}
                      <div>
                        <p className="font-medium">{method}</p>
                        <p className="text-xs text-gray-600">
                          {data.count} ventas
                          {depositData.count > 0 && ` • ${depositData.count} abonos`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">Ventas: ${data.amount.toLocaleString('es-CO')}</p>
                      <p className="text-xs text-gray-600 mb-1">
                        {((data.amount / summary.totalSales) * 100 || 0).toFixed(1)}% del total ventas
                      </p>
                      <p className="font-bold text-purple-700">Abonos: ${depositData.amount.toLocaleString('es-CO')}</p>
                      <p className="text-xs text-gray-600">
                        {((depositData.amount / (depositSummary.totalDeposits || 1)) * 100 || 0).toFixed(1)}% del total abonos
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>


        {/* Lista de ventas del día */}
        <Card>
    <CardHeader>
    <CardTitle>Ventas del Día</CardTitle>
    <div className="mt-2">
      <Input
        type="text"
        placeholder="Buscar por cédula..."
        value={documentFilter}
        onChange={(e) => setDocumentFilter(e.target.value)}
        className="w-full"
      />
    </div>
        </CardHeader>
      <CardContent>
    
              <ScrollArea className="h-96">
                {sales.map((sale) => (
                  <div key={sale.id} className="p-3 border rounded-lg mb-2">
                    <p className="font-medium">{sale.saleNumber}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(sale.createdAt).toLocaleString('es-CO')}
                    </p>
                    <p className="text-sm text-gray-600">
                      Cliente: {sale.customerName || "Consumidor Final"} ({sale.customerDocument || "N/A"})
                    </p>
                    <p className="text-sm text-gray-600">
                      Método: {sale.paymentMethod.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Tipo: {sale.type === 'sale' ? 'Venta' : sale.type === 'quote' ? 'Cotización' : 'Separado'}
                    </p>
                    <p className="font-bold text-green-600">
                      ${sale.total.toLocaleString('es-CO')}
                    </p>
                  </div>
                ))}
              </ScrollArea>
    <div className="space-y-2">
      {filteredDailySales.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No hay ventas para la fecha seleccionada {documentFilter ? `con cédula ${documentFilter}` : ""}
        </p>
      ) : (
        filteredDailySales.map((sale) => (
          <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{sale.saleNumber}</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{sale.advisorName}</span>
                <Badge variant="outline" className="text-xs">
                  {sale.paymentMethod.name}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                Cliente: {sale.customerName} ({sale.customerDocument})
              </p>
              <p className="text-xs text-gray-500">
                {new Date(sale.createdAt).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-600">
                ${sale.total.toLocaleString('es-CO')}
              </p>
              {sale.discount > 0 && (
                <p className="text-xs text-red-500">
                  Desc: ${sale.discount.toLocaleString('es-CO')}
                </p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
      </CardContent>
    </Card>
    </div>
  </ScrollArea>
  );
}