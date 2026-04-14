import { useState, useMemo } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useSales } from '@/hooks/useSales';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Edit2, Trash2, User, ShoppingBag, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
  name: '',
  document: '',
  documentType: 'CC',
  phone: '',
  email: '',
  address: '',
  city: '',
  creditLimit: 0,
  balance: 0,
  notes: '',
  isActive: true,
};

export default function Customers() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { sales } = useSales();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.document || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }, [customers, searchTerm]);

  const getCustomerSales = (customerId: string) => {
    return sales.filter(s =>
      s.customerId === customerId ||
      (s.customerDocument && customers.find(c => c.id === customerId)?.document === s.customerDocument)
    );
  };

  const openNew = () => {
    setEditingCustomer(null);
    setForm({ ...emptyForm });
    setIsFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      document: customer.document || '',
      documentType: customer.documentType || 'CC',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      creditLimit: customer.creditLimit || 0,
      balance: customer.balance || 0,
      notes: customer.notes || '',
      isActive: customer.isActive,
    });
    setIsFormOpen(true);
  };

  const openHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsHistoryOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, form);
      toast.success('Cliente actualizado');
    } else {
      addCustomer(form);
      toast.success('Cliente creado');
    }
    setIsFormOpen(false);
  };

  const handleDelete = (customer: Customer) => {
    if (!confirm(`¿Eliminar al cliente "${customer.name}"?`)) return;
    deleteCustomer(customer.id);
    toast.success('Cliente eliminado');
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('es-CO');

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.isActive).length;
  const totalBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">Gestión de clientes y su historial de compras</p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><User className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total clientes</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><User className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Activos</p>
                <p className="text-2xl font-bold">{activeCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><CreditCard className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Saldo a favor total</p>
                <p className="text-2xl font-bold">{fmt(totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nombre, documento o teléfono..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabla */}
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-400">
                    {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(customer => (
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
                        <Button variant="ghost" size="sm" onClick={() => openHistory(customer)} title="Ver historial">
                          <ShoppingBag className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(customer)}>
                          <Edit2 className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(customer)}>
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

      {/* Formulario crear/editar */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" />
            </div>
            <div>
              <Label>Tipo de documento</Label>
              <select
                value={form.documentType}
                onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))}
                className="w-full border rounded p-2 text-sm"
              >
                <option>CC</option>
                <option>NIT</option>
                <option>CE</option>
                <option>Pasaporte</option>
              </select>
            </div>
            <div>
              <Label>Número de documento</Label>
              <Input value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} placeholder="123456789" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="300 000 0000" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
            </div>
            <div className="col-span-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Calle 00 # 00-00" />
            </div>
            <div>
              <Label>Ciudad</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Bogotá" />
            </div>
            <div>
              <Label>Cupo de crédito</Label>
              <Input type="number" min={0} value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <Label>Observaciones</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionales..." />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              />
              <label htmlFor="isActive" className="text-sm">Cliente activo</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {editingCustomer ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Historial de compras */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Historial de compras — {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (() => {
            const customerSales = getCustomerSales(selectedCustomer.id);
            const totalSpent = customerSales.reduce((sum, s) => sum + s.total, 0);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{customerSales.length}</p>
                    <p className="text-xs text-gray-500">Compras realizadas</p>
                  </div>
                  <div className="bg-green-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{fmt(totalSpent)}</p>
                    <p className="text-xs text-gray-500">Total comprado</p>
                  </div>
                  <div className="bg-purple-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{fmt(selectedCustomer.balance || 0)}</p>
                    <p className="text-xs text-gray-500">Saldo a favor</p>
                  </div>
                </div>
                <ScrollArea className="h-72">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Venta</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Asesor</TableHead>
                        <TableHead>Método pago</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerSales.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-gray-400">Sin compras registradas</TableCell>
                        </TableRow>
                      ) : (
                        customerSales.map(sale => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-mono text-sm">{sale.saleNumber}</TableCell>
                            <TableCell>{fmtDate(sale.createdAt)}</TableCell>
                            <TableCell>{sale.advisorName}</TableCell>
                            <TableCell>{sale.paymentMethod?.name}</TableCell>
                            <TableCell className="text-right font-medium">{fmt(sale.total)}</TableCell>
                            <TableCell>
                              <Badge className={
                                sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                sale.status === 'returned' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {sale.status === 'completed' ? 'Completada' :
                                 sale.status === 'returned' ? 'Devuelta' :
                                 sale.status === 'pending' ? 'Pendiente' : sale.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
