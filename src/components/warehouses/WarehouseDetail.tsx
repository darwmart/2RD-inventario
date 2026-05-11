import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, SlidersHorizontal,
  FileSpreadsheet, FileText, History, Package, Trash2, Warehouse, X,
  Image as ImageIcon,
} from 'lucide-react';
import { ExternalWarehouse, WarehouseTransaction, WarehouseTransactionType } from '@/types';
import { formatDate } from '@/utils/dates';
import { typeLabel, variantTags } from '@/utils/warehouseExports';
import { WarehouseStockMap } from './TransactionDialog';

interface Props {
  warehouse: ExternalWarehouse;
  warehouseStock: WarehouseStockMap;
  warehouseTransactions: WarehouseTransaction[];
  isAdmin: boolean;
  onOpenTxDialog: (type: WarehouseTransactionType) => void;
  onDeleteTransaction: (id: string) => void;
  onExchangeFromStock: (productId: string) => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
}

function typeBadge(type: WarehouseTransactionType) {
  if (type === 'loan') return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Préstamo</Badge>;
  if (type === 'return') return <Badge className="bg-green-100 text-green-700 border-green-200">Devolución</Badge>;
  if (type === 'exchange') return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Cambio</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Ajuste</Badge>;
}

export default function WarehouseDetail({
  warehouse, warehouseStock, warehouseTransactions, isAdmin,
  onOpenTxDialog, onDeleteTransaction, onExchangeFromStock, onExportExcel, onExportPDF,
}: Props) {
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {/* Header de bodega */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{warehouse.name}</h2>
            <p className="text-sm text-gray-500">{warehouse.code}</p>
            <div className="flex flex-wrap gap-4 mt-1 text-xs text-gray-600">
              {warehouse.location && <span>📍 {warehouse.location}</span>}
              {warehouse.contact && <span>👤 {warehouse.contact}</span>}
              {warehouse.phone && <span>📞 {warehouse.phone}</span>}
            </div>
            {warehouse.description && <p className="text-xs text-gray-500 mt-1">{warehouse.description}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => onOpenTxDialog('loan')}>
              <ArrowDownToLine className="h-4 w-4 mr-1" /> Préstamo
            </Button>
            <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50" onClick={() => onOpenTxDialog('return')}>
              <ArrowUpFromLine className="h-4 w-4 mr-1" /> Devolución
            </Button>
            <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => onOpenTxDialog('exchange')}>
              <ArrowLeftRight className="h-4 w-4 mr-1" /> Cambio
            </Button>
            {isAdmin && (
              <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => onOpenTxDialog('adjustment')}>
                <SlidersHorizontal className="h-4 w-4 mr-1" /> Ajuste
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onExportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
            <Button size="sm" variant="outline" onClick={onExportPDF}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['stock', 'history'] as const).map(tab => (
          <button key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab(tab)}>
            {tab === 'stock'
              ? <><Package className="inline h-4 w-4 mr-1" />Stock en Bodega ({Object.keys(warehouseStock).length})</>
              : <><History className="inline h-4 w-4 mr-1" />Historial ({warehouseTransactions.length})</>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'stock' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {Object.keys(warehouseStock).length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />No hay productos en esta bodega
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Código de Barras</TableHead>
                    <TableHead className="text-right">Uds. en Bodega</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(warehouseStock).map(([productId, info]) => (
                    <TableRow key={productId}>
                      <TableCell className="font-medium">{info.productName}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{info.reference || '-'}</TableCell>
                      <TableCell className="text-gray-500 text-sm font-mono">{info.barcode || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">{info.quantity}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50 text-xs h-7 px-2"
                          onClick={() => onExchangeFromStock(productId)}>
                          <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />Cambiar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col gap-3">
            {warehouseTransactions.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 text-center py-10 text-gray-400 text-sm">
                <History className="h-8 w-8 mx-auto mb-2 opacity-40" />Sin movimientos registrados
              </div>
            ) : (
              warehouseTransactions.map(tx => (
                <div key={tx.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {typeBadge(tx.type)}
                      <span className="text-sm text-gray-600">{formatDate(tx.createdAt)}</span>
                      <span className="text-sm text-gray-500">por <strong>{tx.createdBy}</strong></span>
                    </div>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                        onClick={() => onDeleteTransaction(tx.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {tx.notes && <p className="text-xs text-gray-500 mt-2 italic">{tx.notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tx.items.map(item => {
                      const isIn = item.direction === 'in';
                      const isExchange = tx.type === 'exchange';
                      const tags = variantTags(item);
                      return (
                        <span key={item.productId + (item.direction ?? '')}
                          className={`text-xs px-2 py-1 rounded flex flex-col gap-0.5 ${isExchange && isIn ? 'bg-orange-100 text-orange-800' : isExchange && !isIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                          <span>
                            {isExchange && isIn && <ArrowUpFromLine className="inline h-3 w-3 mr-0.5 text-orange-600" />}
                            {isExchange && !isIn && <ArrowDownToLine className="inline h-3 w-3 mr-0.5 text-green-600" />}
                            <strong>{item.quantity}×</strong> {item.productName}
                            {item.reference && <span className="text-gray-400 ml-1">({item.reference})</span>}
                            {isExchange && isIn && <span className="ml-1 text-orange-600 font-medium">[SALE]</span>}
                            {isExchange && !isIn && <span className="ml-1 text-green-600 font-medium">[ENTRA]</span>}
                          </span>
                          {tags.length > 0 && <span className="text-purple-600 font-medium">{tags.join(' · ')}</span>}
                        </span>
                      );
                    })}
                  </div>
                  {tx.evidenceImages && tx.evidenceImages.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                        <ImageIcon className="h-3 w-3" />Evidencia fotográfica ({tx.evidenceImages.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tx.evidenceImages.map((src, idx) => (
                          <img key={idx} src={src} alt={`evidencia-${idx + 1}`}
                            className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => setLightbox(src)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="evidencia" className="max-h-[90vh] max-w-[90vw] rounded shadow-2xl" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}><X className="h-7 w-7" /></button>
        </div>
      )}
    </div>
  );
}
