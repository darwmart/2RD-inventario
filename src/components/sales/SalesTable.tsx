import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Printer, Edit2, Trash2, RotateCcw } from 'lucide-react';
import { CompanyInfo, Sale } from '@/types';
import { printPOSInvoice } from '@/utils/printUtils';

export interface DepositEntry {
  key: string;
  saleId: string;
  saleNumber: string;
  advisorName: string;
  description: string;
  paymentMethodId: string;
  paymentMethodName: string;
  dayDepositSum: number;
  totalPaidAllTime: number;
  saleTotal: number;
  initialDeposit: number;
}

interface DailyTotals {
  totalVentas: number;
  totalCostos: number;
  utilidad: number;
}

interface Props {
  deposits: DepositEntry[];
  salesOfDay: Sale[];
  allSales: Sale[];
  selectedDate: string;
  companyInfo: CompanyInfo;
  isAdmin: boolean;
  dailyTotals: DailyTotals;
  onEdit: (sale: Sale) => void;
  onDelete: (sale: Sale) => void;
  onReturn: (sale: Sale) => void;
}

export default function SalesTable({
  deposits, salesOfDay, allSales, selectedDate, companyInfo,
  isAdmin, dailyTotals, onEdit, onDelete, onReturn,
}: Props) {
  return (
    <Card>
      <ScrollArea className="h-[51rem] p-6">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-white z-10">Fecha</TableHead>
                <TableHead className="sticky top-0 bg-white z-10">Asesor</TableHead>
                <TableHead className="sticky top-0 bg-white z-10">Descripción</TableHead>
                <TableHead className="sticky top-0 bg-white z-10">Cantidad</TableHead>
                <TableHead className="sticky top-0 bg-white z-10">Costo</TableHead>
                <TableHead className="sticky top-0 bg-white z-10">Venta & Abonos</TableHead>
                <TableHead className="sticky top-0 bg-white z-10">Utilidad</TableHead>
                <TableHead className="sticky top-0 bg-white z-10">Estado</TableHead>
                <TableHead className="sticky top-0 bg-white z-10">Método</TableHead>
                <TableHead className="sticky top-0 bg-white z-10">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {/* Filas de abonos del día */}
              {deposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500">
                    No hay abonos en la fecha seleccionada
                  </TableCell>
                </TableRow>
              ) : (
                deposits.map(entry => {
                  const isCompleted = (entry.totalPaidAllTime ?? 0) >= (entry.saleTotal ?? 0);
                  const fullSale = allSales.find(s => s.id === entry.saleId);
                  return (
                    <TableRow key={entry.key}>
                      <TableCell>{selectedDate}</TableCell>
                      <TableCell>{entry.advisorName}</TableCell>
                      <TableCell>{`Abono - ${entry.description}`}</TableCell>
                      <TableCell></TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-blue-600">${(entry.dayDepositSum ?? 0).toLocaleString('es-CO')}</TableCell>
                      <TableCell></TableCell>
                      <TableCell>{isCompleted ? 'CANCELADO' : 'SEPARADO'}</TableCell>
                      <TableCell>{entry.paymentMethodName}</TableCell>
                      <TableCell>
                        {fullSale && (
                          <Button size="sm" variant="outline" onClick={() => printPOSInvoice(fullSale, companyInfo)} title="Reimprimir factura">
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {/* Filas de ventas normales del día (una fila por item) */}
              {salesOfDay.flatMap(sale =>
                sale.items.map((item, index) => {
                  const rent = (item.total ?? 0) - ((item.cost ?? 0) * (item.quantity ?? 0));
                  const isFirstItem = index === 0;
                  return (
                    <TableRow key={`${sale.id}-${item.productId}`}>
                      <TableCell>{selectedDate}</TableCell>
                      <TableCell>{sale.advisorName}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${(item.cost ?? 0).toLocaleString('es-CO')}</TableCell>
                      <TableCell>${(item.total ?? 0).toLocaleString('es-CO')}</TableCell>
                      <TableCell colSpan={2} className="text-green-600 font-bold">${rent.toLocaleString('es-CO')}</TableCell>
                      <TableCell>{sale.paymentMethod?.name ?? '-'}</TableCell>
                      <TableCell>
                        {isFirstItem && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => printPOSInvoice(sale, companyInfo)} title="Reimprimir factura">
                              <Printer className="h-4 w-4" />
                            </Button>
                            {sale.status !== 'returned' && (
                              <Button size="sm" variant="outline" onClick={() => onReturn(sale)} title="Registrar devolución">
                                <RotateCcw className="h-4 w-4 text-orange-500" />
                              </Button>
                            )}
                            {isAdmin && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => onEdit(sale)} title="Editar venta">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onDelete(sale)} title="Eliminar venta">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>

            <TableFooter>
              <TableRow className="bg-gray-100 font-bold">
                <TableCell colSpan={4} className="text-right">TOTALES DEL DÍA:</TableCell>
                <TableCell className="text-blue-600">${dailyTotals.totalCostos.toLocaleString('es-CO')}</TableCell>
                <TableCell className="text-green-600">${dailyTotals.totalVentas.toLocaleString('es-CO')}</TableCell>
                <TableCell colSpan={2} className="text-purple-600">${dailyTotals.utilidad.toLocaleString('es-CO')}</TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
