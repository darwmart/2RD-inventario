import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Search, ShoppingCart, Printer } from 'lucide-react';
import { usePrintPOS } from '@/hooks/usePrintPOS';

interface CompanyInfo {
  name: string;
  [key: string]: unknown;
}

interface SaleItem {
  productName: string;
  quantity: number;
}

interface PaymentMethod {
  name: string;
}

interface Reservation {
  id: string;
  saleNumber: string;
  advisorName: string;
  createdAt: string | Date;
  total: number;
  deposit?: number;
  deposits?: { amount: number; method?: { name: string }; createdAt: Date }[];
  items: SaleItem[];
  paymentMethod?: PaymentMethod;
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  type?: string;
}

interface Props {
  reserved: Reservation[];
  companyInfo: CompanyInfo;
  onDeposit: (id: string) => void;
  onConvert: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function ReservedList({ reserved, companyInfo, onDeposit, onConvert, onCancel }: Props) {
  const printPOS = usePrintPOS();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return reserved;
    const q = search.toLowerCase();
    return reserved.filter(r =>
      (r.customerName?.toLowerCase().includes(q) ?? false) ||
      (r.customerDocument?.includes(search) ?? false) ||
      r.items.some(it => it.productName.toLowerCase().includes(q))
    );
  }, [search, reserved]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Separados ({reserved.length})
        </CardTitle>
        <div className="relative w-full max-w-md mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por cédula, nombre o artículo..."
            className="pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay productos separados</p>
          ) : (
            filtered.map(reservation => {
              const paid = reservation.deposit ?? 0;
              const remaining = Math.max(0, reservation.total - paid);
              return (
                <div key={reservation.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{reservation.saleNumber}</h4>
                      <p className="text-sm text-gray-600">Asesor: {reservation.advisorName}</p>
                      <p className="text-sm text-gray-500">{new Date(reservation.createdAt).toLocaleDateString('es-CO')}</p>
                    </div>
                    <Badge variant="secondary">Separado</Badge>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    {reservation.items.length} productos - Total: ${reservation.total.toLocaleString('es-CO')}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-3">
                    <div><span className="text-gray-500">Método:</span> {reservation.paymentMethod?.name}</div>
                    <div><span className="text-gray-500">Abono:</span> ${paid.toLocaleString('es-CO')}</div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Saldo pendiente:</span> ${remaining.toLocaleString('es-CO')}
                    </div>
                    {reservation.customerName && (
                      <div className="col-span-2"><span className="text-gray-500">Cliente:</span> {reservation.customerName}</div>
                    )}
                    {reservation.customerDocument && (
                      <div><span className="text-gray-500">Documento:</span> {reservation.customerDocument}</div>
                    )}
                    {reservation.customerPhone && (
                      <div><span className="text-gray-500">Teléfono:</span> {reservation.customerPhone}</div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => printPOS({ ...reservation, type: 'reserved' } as never, companyInfo as never)}>
                      <Printer className="h-4 w-4 mr-1" />Imprimir
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDeposit(reservation.id)}>Abonar</Button>
                    <Button size="sm" onClick={() => onConvert(reservation.id)} className="flex-1" disabled={paid < reservation.total}>
                      <ShoppingCart className="h-4 w-4 mr-1" />Convertir a Venta
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onCancel(reservation.id)}>Cancelar</Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
