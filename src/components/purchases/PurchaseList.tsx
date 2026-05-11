import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Purchase, Supplier } from '@/types';

interface Props {
  purchases: Purchase[];
  suppliers: Supplier[];
  selectedDate: string;
  onEdit: (purchase: Purchase) => void;
  onDelete: (id: string) => void;
  onPayCredit: (purchase: Purchase) => void;
}

function resolveSupplierName(purchase: Purchase, suppliers: Supplier[]): string {
  if (purchase.supplierName?.trim()) return purchase.supplierName.trim();
  const s = suppliers.find(x => x.id === purchase.supplierId);
  if (!s) return 'Sin proveedor';
  return ((s.commercialName || '').trim() || (s.fiscalName || '').trim() || (s as any).name || '').trim() || 'Sin proveedor';
}

export default function PurchaseList({ purchases, suppliers, selectedDate, onEdit, onDelete, onPayCredit }: Props) {
  const [searchPurchase, setSearchPurchase] = useState('');

  const filtered = purchases.filter(purchase => {
    const purchaseDate = new Date(purchase.createdAt);
    const y = purchaseDate.getFullYear();
    const m = String(purchaseDate.getMonth() + 1).padStart(2, '0');
    const d = String(purchaseDate.getDate()).padStart(2, '0');
    const matchesDate = `${y}-${m}-${d}` === selectedDate;

    const searchLower = searchPurchase.toLowerCase();
    const docNumber = (purchase.documentNumber || '').toLowerCase();
    const supplierLabel = resolveSupplierName(purchase, suppliers).toLowerCase();
    const matchesSearch = !searchPurchase || supplierLabel.includes(searchLower) || docNumber.includes(searchLower);

    return matchesDate && matchesSearch;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compras del {new Date(selectedDate).toLocaleDateString('es-CO')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label>Buscar por proveedor o número de factura</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar proveedor o factura..."
              className="pl-10"
              value={searchPurchase}
              onChange={(e) => setSearchPurchase(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchPurchase
                ? 'No se encontraron compras con ese criterio de búsqueda'
                : 'No hay compras registradas para esta fecha'}
            </p>
          ) : (
            filtered.map(purchase => (
              <div key={purchase.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">Factura: {purchase.documentNumber}</h4>
                    <p className="text-sm text-gray-600">Proveedor: {resolveSupplierName(purchase, suppliers)}</p>
                    <p className="text-xs text-gray-500">{new Date(purchase.createdAt).toLocaleString('es-CO')}</p>
                    {purchase.paymentDetails?.dueDate && !purchase.paymentDetails?.bankId && (
                      <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded mt-1 inline-block">
                        Crédito pendiente — Vence: {new Date(purchase.paymentDetails.dueDate).toLocaleDateString('es-CO')}
                      </span>
                    )}
                    {purchase.paymentDetails?.bankId && purchase.paymentDetails?.dueDate === undefined && (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block">
                        Pagada
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex gap-2 mb-2">
                      {purchase.paymentDetails?.dueDate && !purchase.paymentDetails?.bankId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 border-green-300"
                          onClick={() => onPayCredit(purchase)}
                        >
                          Marcar pagada
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => onEdit(purchase)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => onDelete(purchase.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-green-600">${purchase.total.toLocaleString('es-CO')}</p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Productos:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {purchase.items.map((item, idx) => (
                      <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-gray-600"> - {item.quantity} unidades × ${item.unitCost.toLocaleString('es-CO')}</span>
                        <span className="float-right font-bold">${item.total.toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {purchase.notes && (
                  <div className="border-t mt-3 pt-3">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Notas:</span> {purchase.notes}
                    </p>
                  </div>
                )}

                <div className="border-t mt-3 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Método de pago: <span className="font-medium">{purchase.paymentMethod?.name}</span>
                      {purchase.paymentDetails?.dueDate && (
                        <span className="ml-2 text-orange-600">
                          (Vence: {new Date(purchase.paymentDetails.dueDate).toLocaleDateString('es-CO')})
                        </span>
                      )}
                    </span>
                    <span className="text-gray-600">
                      Subtotal: ${purchase.subtotal.toLocaleString('es-CO')}
                      {purchase.tax && purchase.tax > 0 && ` + IVA: $${purchase.tax.toLocaleString('es-CO')}`}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
