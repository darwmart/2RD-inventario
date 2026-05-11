import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Building2 } from 'lucide-react';
import { Supplier } from '@/types';

interface Props {
  suppliers: Supplier[];
  selectedId: string | null;
  searchTerm: string;
  onSelect: (s: Supplier) => void;
  onDoubleClick: (s: Supplier) => void;
  onNew: () => void;
  onClearSearch: () => void;
}

export default function SuppliersTable({ suppliers, selectedId, searchTerm, onSelect, onDoubleClick, onNew, onClearSearch }: Props) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[80px]">Cód.</TableHead>
            <TableHead>Nombre fiscal</TableHead>
            <TableHead>Nombre comercial</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>N.I.T.</TableHead>
            <TableHead className="w-[100px]">Tipo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <Building2 className="h-12 w-12 text-gray-300" />
                  <p className="text-gray-500 font-medium">
                    {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                  </p>
                  {!searchTerm && (
                    <Button variant="outline" size="sm" onClick={onNew}>
                      <Plus className="h-4 w-4 mr-1" />Crear primer proveedor
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            suppliers.map(supplier => (
              <TableRow
                key={supplier.id}
                className={`cursor-pointer hover:bg-gray-50 ${selectedId === supplier.id ? 'bg-blue-50 hover:bg-blue-50' : ''}`}
                onClick={() => onSelect(supplier)}
                onDoubleClick={() => onDoubleClick(supplier)}
              >
                <TableCell className="font-mono text-sm text-gray-600">{supplier.code || supplier.id.slice(0, 6)}</TableCell>
                <TableCell className="font-medium">{supplier.fiscalName}</TableCell>
                <TableCell className="text-gray-600">{supplier.commercialName || <span className="text-gray-400 text-xs">-</span>}</TableCell>
                <TableCell className="font-mono text-sm">{supplier.phone}</TableCell>
                <TableCell className="font-mono text-sm">{supplier.taxId || <span className="text-gray-400 text-xs">-</span>}</TableCell>
                <TableCell>
                  {supplier.isProvider ? (
                    <Badge variant="default" className="text-xs">Proveedor</Badge>
                  ) : supplier.isCreditor ? (
                    <Badge variant="secondary" className="text-xs">Acreedor</Badge>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="border-t p-3 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="h-4 w-4" />
          <span>N° de proveedores mostrados: <strong>{suppliers.length}</strong></span>
        </div>
        {searchTerm && (
          <Button variant="ghost" size="sm" onClick={onClearSearch}>Limpiar búsqueda</Button>
        )}
      </div>
    </Card>
  );
}
