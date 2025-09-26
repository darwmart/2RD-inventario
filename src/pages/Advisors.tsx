import { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Users, Mail, Phone, TrendingUp } from 'lucide-react';
import { Advisor } from '@/types';
import { toast } from 'sonner';

export default function Advisors() {
  const { advisors, addAdvisor, sales, getSalesByAdvisor } = useSales();
  const [expenses] = useLocalStorage<Expense[]>("expenses", []);

  
  const [isAddingAdvisor, setIsAddingAdvisor] = useState(false);
  const [advisorForm, setAdvisorForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const handleAddAdvisor = () => {
    if (!advisorForm.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    addAdvisor({
      name: advisorForm.name.trim(),
      email: advisorForm.email.trim(),
      phone: advisorForm.phone.trim(),
      isActive: true
    });

    toast.success('Asesor agregado exitosamente');
    
    setAdvisorForm({
      name: '',
      email: '',
      phone: ''
    });
    setIsAddingAdvisor(false);
  };

  const getAdvisorStats = (advisor: Advisor) => {
    const advisorSales = getSalesByAdvisor(advisor.id).filter(sale => sale.status === 'completed');
    const totalSales = advisorSales.length;
    const totalRevenue = advisorSales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Ventas del mes actual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlySales = advisorSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });
    const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + sale.total, 0);

      // Prestamos del asesor
  const advisorLoans = expenses.filter(
    e => e.advisor === advisor.name && e.type === "prestamo"
  );

  // Prestamos solo del mes actual
  const loansThisMonth = advisorLoans.filter(e => {
    const d = new Date(e.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((sum, e) => sum + e.amount, 0);

  // Deuda total acumulada de este asesor
  const totalDebt = advisorLoans.reduce((sum, e) => sum + Number(e.amount), 0);


    return {
      totalSales,
      totalRevenue,
      monthlySales: monthlySales.length,
      monthlyRevenue, 
      loansThisMonth,
      totalDebt
    };
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asesores de Venta</h1>
          <p className="mt-2 text-gray-600">
            Gestiona el equipo de ventas y sus estadísticas
          </p>
        </div>
        <Dialog open={isAddingAdvisor} onOpenChange={setIsAddingAdvisor}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Asesor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Asesor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={advisorForm.name}
                  onChange={(e) => setAdvisorForm({...advisorForm, name: e.target.value})}
                  placeholder="Nombre del asesor"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={advisorForm.email}
                  onChange={(e) => setAdvisorForm({...advisorForm, email: e.target.value})}
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={advisorForm.phone}
                  onChange={(e) => setAdvisorForm({...advisorForm, phone: e.target.value})}
                  placeholder="300 123 4567"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingAdvisor(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddAdvisor}>
                  Agregar Asesor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {advisors.map((advisor) => {
          const stats = getAdvisorStats(advisor);
          
          return (
            <Card key={advisor.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{advisor.name}</CardTitle>
                      <Badge variant={advisor.isActive ? "default" : "secondary"}>
                        {advisor.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Información de contacto */}
                <div className="space-y-2">
                  {advisor.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      {advisor.email}
                    </div>
                  )}
                  {advisor.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      {advisor.phone}
                    </div>
                  )}
                </div>

                {/* Estadísticas */}
               <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-bold text-lg text-blue-600">
                    {stats.loansThisMonth}
                  </div>
                  <div className="text-xs text-gray-600">Préstamos del Mes</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-bold text-lg text-red-600">
                    ${stats.totalDebt.toLocaleString('es-CO')}
                  </div>
                  <div className="text-xs text-gray-600">Deuda Total</div>
                </div>
              </div>
                  <div className="border-t pt-3">
                    <div className="text-xs text-gray-600 mb-2">Este Mes</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="font-bold text-blue-600">{stats.monthlySales}</div>
                        <div className="text-xs text-gray-600">Ventas</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="font-bold text-blue-600">
                          ${stats.monthlyRevenue.toLocaleString('es-CO')}
                        </div>
                        <div className="text-xs text-gray-600">Ingresos</div>
                      </div>
                    </div>
                  </div>
                  
                <div className="text-xs text-gray-500 border-t pt-2">
                  Registrado: {new Date(advisor.createdAt).toLocaleDateString('es-CO')}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {advisors.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay asesores registrados
          </h3>
          <p className="text-gray-500">
            Comienza agregando tu primer asesor de ventas
          </p>
        </div>
      )}
    </div>
  );
}