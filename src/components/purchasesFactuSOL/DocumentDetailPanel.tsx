import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PurchaseDocument } from '@/types';

interface Props {
  document: PurchaseDocument;
}

export default function DocumentDetailPanel({ document: doc }: Props) {
  const [tab, setTab] = useState<'lines' | 'totals'>('lines');

  return (
    <div className="border-t">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'lines' | 'totals')}>
        <div className="border-b bg-gray-50 px-4">
          <TabsList className="h-9">
            <TabsTrigger value="lines" className="text-xs">Ver detalles de línea</TabsTrigger>
            <TabsTrigger value="totals" className="text-xs">Ver totales de documento</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="lines" className="m-0 p-4">
          <h4 className="font-semibold text-sm text-gray-700 mb-3">
            Artículos del documento {doc.documentNumber}
          </h4>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs">Artículo</TableHead>
                <TableHead className="text-xs text-right">Cantidad</TableHead>
                <TableHead className="text-xs text-right">P. Unitario</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doc.items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm">{item.productName}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    ${item.unitCost.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    ${item.total.toLocaleString('es-CO')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="totals" className="m-0 p-4">
          <div className="max-w-md">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">
              Resumen del documento {doc.documentNumber}
            </h4>
            <div className="space-y-2 bg-gray-50 p-4 rounded">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unidades:</span>
                <span className="font-mono">{doc.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Art. diferentes:</span>
                <span className="font-mono">{doc.items.length}</span>
              </div>
              <div className="border-t pt-2 mt-2" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-mono">${doc.subtotal.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA:</span>
                <span className="font-mono">${(doc.tax || 0).toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                <span>TOTAL:</span>
                <span className="font-mono text-blue-600">${doc.total.toLocaleString('es-CO')}</span>
              </div>
              {doc.notes && (
                <>
                  <div className="border-t pt-2 mt-2" />
                  <div className="text-sm">
                    <span className="text-gray-600 font-medium">Notas:</span>
                    <p className="text-gray-700 mt-1">{doc.notes}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
