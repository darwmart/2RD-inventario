import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Trash2, ShoppingBag, Phone, Mail, MapPin } from 'lucide-react';
import { Customer } from '@/types';

interface Props {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onHistory: (customer: Customer) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function CustomerTable({ customers, onEdit, onDelete, onHistory }: Props) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead className="text-right">Saldo a favor</TableHead>
              <TableHead className="text-right">Cupo crédito</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-400">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            ) : (
              customers.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    {customer.documentType && <span className="text-xs text-gray-400 mr-1">{customer.documentType}</span>}
                    {customer.document || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {customer.phone && <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3 text-gray-400" />{customer.phone}</div>}
                      {customer.email && <div className="flex items-center gap-1 text-sm text-gray-500"><Mail className="h-3 w-3 text-gray-400" />{customer.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.city && <div className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3 text-gray-400" />{customer.city}</div>}
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-700">
                    {(customer.balance || 0) > 0 ? fmt(customer.balance || 0) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {(customer.creditLimit || 0) > 0 ? fmt(customer.creditLimit || 0) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={customer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {customer.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onHistory(customer)} title="Ver historial">
                        <ShoppingBag className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(customer)}>
                        <Edit2 className="h-4 w-4 text-gray-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(customer)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
