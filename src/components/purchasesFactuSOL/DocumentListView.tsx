import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Edit, Trash2, FileText, Package, ArrowRight, CheckCircle, Clock, XCircle, Search, Building2, Upload,
} from 'lucide-react';
import { PurchaseDocument, DocumentType, DocumentStatus } from '@/types';
import DocumentDetailPanel from './DocumentDetailPanel';

function getStatusBadge(status: DocumentStatus) {
  if (status === 'pending') return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>;
  if (status === 'partial') return <Badge variant="default" className="gap-1"><Clock className="h-3 w-3" />Parcial</Badge>;
  if (status === 'completed') return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Pagado</Badge>;
  if (status === 'invoiced') return <Badge variant="default" className="gap-1"><FileText className="h-3 w-3" />Facturado</Badge>;
  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Anulado</Badge>;
}

interface Totals {
  subtotal: number;
  tax: number;
  total: number;
}

interface Props {
  activeTab: DocumentType;
  onTabChange: (tab: DocumentType) => void;
  filteredDocuments: PurchaseDocument[];
  selectedDocument: PurchaseDocument | null;
  purchases: PurchaseDocument[];
  totals: Totals;
  startDate: string;
  endDate: string;
  searchTerm: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onClearFilters: () => void;
  onSelectDocument: (doc: PurchaseDocument) => void;
  onNew: () => void;
  onImport: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvertToInvoice: (id: string) => void;
  onOpenPayment: (doc: PurchaseDocument) => void;
  onOpenSupplier: () => void;
  resolveSupplierName: (doc: PurchaseDocument) => string;
}

export default function DocumentListView({
  activeTab, onTabChange, filteredDocuments, selectedDocument, purchases, totals,
  startDate, endDate, searchTerm,
  onStartDateChange, onEndDateChange, onSearchChange, onClearFilters,
  onSelectDocument, onNew, onImport, onEdit, onDelete, onConvertToInvoice, onOpenPayment, onOpenSupplier,
  resolveSupplierName,
}: Props) {
  const hasFilters = !!(startDate || endDate || searchTerm);

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compras</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-600">Desde:</Label>
            <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="w-[140px] h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-600">Hasta:</Label>
            <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className="w-[140px] h-9" />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9">Limpiar</Button>
          )}
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Proveedor, factura, artículo..." className="pl-8 w-[280px] h-9"
              value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
          <span className="font-medium">Filtros activos:</span>
          {startDate && <Badge variant="secondary">Desde: {new Date(startDate).toLocaleDateString('es-CO')}</Badge>}
          {endDate && <Badge variant="secondary">Hasta: {new Date(endDate).toLocaleDateString('es-CO')}</Badge>}
          {searchTerm && <Badge variant="secondary">Búsqueda: "{searchTerm}"</Badge>}
          <span className="text-gray-500">({filteredDocuments.length} resultado{filteredDocuments.length !== 1 ? 's' : ''})</span>
        </div>
      )}

      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onNew}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
          <Button size="sm" variant="outline" onClick={onImport}>
            <Upload className="h-4 w-4 mr-1" />Importar
          </Button>
          <Button size="sm" variant="outline" disabled={!selectedDocument} onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />Editar
          </Button>
          <Button size="sm" variant="outline" disabled={!selectedDocument} onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" />Borrar
          </Button>
          <div className="h-6 w-px bg-gray-300 mx-2" />
          <Button size="sm" variant="outline" onClick={onOpenSupplier}>
            <Building2 className="h-4 w-4 mr-1" />Ver proveedor
          </Button>
          <div className="h-6 w-px bg-gray-300 mx-2" />
          {selectedDocument?.documentType === 'delivery' && selectedDocument.status !== 'invoiced' && (
            <Button size="sm" onClick={() => onConvertToInvoice(selectedDocument.id)}>
              <ArrowRight className="h-4 w-4 mr-1" />Convertir a Factura
            </Button>
          )}
          {selectedDocument?.documentType === 'invoice' && (selectedDocument.status === 'pending' || selectedDocument.status === 'partial') && (
            <Button size="sm"
              className={selectedDocument.status === 'partial' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
              onClick={() => onOpenPayment(selectedDocument)}>
              <CheckCircle className="h-4 w-4 mr-1" />
              {selectedDocument.status === 'partial' ? 'Pagar Saldo Pendiente' : 'Marcar como Pagada'}
            </Button>
          )}
        </div>
      </Card>

      {/* Tabs + tabla */}
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as DocumentType)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="delivery" className="gap-2">
            <Package className="h-4 w-4" />Albaranes
            <Badge variant="secondary">{purchases.filter(p => p.documentType === 'delivery' && p.status !== 'invoiced').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="invoice" className="gap-2">
            <FileText className="h-4 w-4" />Facturas
            <Badge variant="secondary">{purchases.filter(p => p.documentType === 'invoice').length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Número</TableHead>
                  <TableHead className="w-[130px]">Nº Factura Prov.</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-gray-300" />
                        <p className="text-gray-500 font-medium">
                          {hasFilters ? 'No se encontraron documentos con los filtros aplicados' : 'No hay documentos para mostrar'}
                        </p>
                        {hasFilters && (
                          <Button variant="outline" size="sm" onClick={onClearFilters}>Limpiar filtros</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}
                      className={`cursor-pointer ${selectedDocument?.id === doc.id ? 'bg-blue-50' : ''}`}
                      onClick={() => onSelectDocument(doc)}>
                      <TableCell className="font-mono font-medium">{doc.documentNumber}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {doc.supplierInvoiceNumber
                          ? <span className="text-blue-600">{doc.supplierInvoiceNumber}</span>
                          : <span className="text-gray-400 text-xs">-</span>}
                      </TableCell>
                      <TableCell>{new Date(doc.createdAt).toLocaleDateString('es-CO')}</TableCell>
                      <TableCell>{resolveSupplierName(doc)}</TableCell>
                      <TableCell className="text-right">${doc.subtotal.toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right">${(doc.tax || 0).toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right font-bold">${doc.total.toLocaleString('es-CO')}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        {doc.orderRef && <Badge variant="outline" className="text-xs">P</Badge>}
                        {doc.deliveryRef && <Badge variant="outline" className="text-xs ml-1">A</Badge>}
                        {doc.invoiceRef && <Badge variant="outline" className="text-xs ml-1">F</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Totales */}
            <div className="border-t p-4 bg-gray-50">
              <div className="flex justify-end gap-8 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-mono font-medium">${totals.subtotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-600">IVA:</span>
                  <span className="font-mono font-medium">${totals.tax.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-600 font-bold">TOTAL:</span>
                  <span className="font-mono font-bold text-lg">${totals.total.toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>

            {selectedDocument && <DocumentDetailPanel document={selectedDocument} />}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
