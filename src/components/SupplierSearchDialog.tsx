import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Supplier } from '@/types';
import { Search, Building2 } from 'lucide-react';

type SupplierSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  onSelect: (supplier: Supplier) => void;
  onNewSupplier: () => void;
};

// Modal de búsqueda de proveedores - estilo de software de gestión comercial
export default function SupplierSearchDialog({
  open,
  onOpenChange,
  suppliers,
  onSelect,
  onNewSupplier
}: SupplierSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Filtrar proveedores
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;

    const term = searchTerm.toLowerCase();
    return suppliers.filter(supplier =>
      supplier.code?.toLowerCase().includes(term) ||
      supplier.fiscalName.toLowerCase().includes(term) ||
      supplier.commercialName?.toLowerCase().includes(term) ||
      supplier.taxId.toLowerCase().includes(term) ||
      supplier.phone.toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm]);

  const handleSelect = () => {
    if (selectedSupplier) {
      onSelect(selectedSupplier);
      onOpenChange(false);
      setSearchTerm('');
      setSelectedSupplier(null);
    }
  };

  const handleDoubleClick = (supplier: Supplier) => {
    onSelect(supplier);
    onOpenChange(false);
    setSearchTerm('');
    setSelectedSupplier(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-4 pb-3 border-b">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Fichero de proveedores
          </DialogTitle>
          <p className="text-sm text-gray-600">Administre el fichero de proveedores de su empresa.</p>
        </DialogHeader>

        {/* Buscador */}
        <div className="px-6 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por código, nombre, N.I.T., teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Tabla de proveedores */}
        <div className="overflow-y-auto max-h-[50vh] px-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[80px]">Cód.</TableHead>
                <TableHead>Nombre fiscal</TableHead>
                <TableHead>Nombre comercial</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>N.I.T.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-12 w-12 text-gray-300" />
                      <p className="text-gray-500">
                        {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedSupplier?.id === supplier.id ? 'bg-blue-50 hover:bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedSupplier(supplier)}
                    onDoubleClick={() => handleDoubleClick(supplier)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{supplier.code}</TableCell>
                    <TableCell>{supplier.fiscalName}</TableCell>
                    <TableCell className="text-gray-600">
                      {supplier.commercialName || <span className="text-gray-400 text-xs">-</span>}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{supplier.phone}</TableCell>
                    <TableCell className="font-mono text-sm">{supplier.taxId}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-3 border-t bg-gray-50">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onNewSupplier}>
              Nuevo
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              N° de proveedores mostrados: <strong>{filteredSuppliers.length}</strong>
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button onClick={handleSelect} disabled={!selectedSupplier}>
                Seleccionar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
