import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useStockRecalculation } from '@/hooks/useStockRecalculation';

export default function SystemInfoSection() {
  const { recalculate, isRunning } = useStockRecalculation();
  const [confirmed, setConfirmed] = useState(false);

  const handleRecalculate = async () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setConfirmed(false);
    const { applied, errors } = await recalculate();
    if (errors > 0) {
      toast.warning(`Stock recalculado: ${applied} productos actualizados, ${errors} errores.`);
    } else {
      toast.success(`Stock recalculado correctamente en ${applied} productos.`);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Información del Sistema</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-6 bg-gray-50 rounded-lg border">
          <p className="font-medium text-gray-600 mb-2">Versión</p>
          <p className="text-3xl font-bold text-blue-600">1.0.0</p>
        </div>
        <div className="text-center p-6 bg-gray-50 rounded-lg border">
          <p className="font-medium text-gray-600 mb-2">Almacenamiento</p>
          <p className="text-3xl font-bold text-green-600">Local</p>
        </div>
        <div className="text-center p-6 bg-gray-50 rounded-lg border">
          <p className="font-medium text-gray-600 mb-2">Estado</p>
          <p className="text-3xl font-bold text-green-600">Activo</p>
        </div>
      </div>
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Este sistema utiliza almacenamiento local del navegador.
          Los datos se mantienen en tu dispositivo de forma segura.
        </p>
      </div>

      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <h3 className="font-semibold text-amber-900 mb-1">Recalcular Stock desde Historial</h3>
        <p className="text-sm text-amber-800 mb-3">
          Aplica las cantidades de todas las facturas de compra y ventas existentes al stock actual.
          <strong> Solo ejecutar una vez</strong> para sincronizar datos históricos que no actualizaron el stock.
        </p>
        {confirmed && (
          <p className="text-sm font-semibold text-red-700 mb-2">
            Confirma: esto sumara/restara los deltas de todas las facturas al stock actual. Presiona de nuevo para continuar.
          </p>
        )}
        <Button
          variant={confirmed ? 'destructive' : 'outline'}
          size="sm"
          onClick={handleRecalculate}
          disabled={isRunning}
          className="border-amber-400 text-amber-900 hover:bg-amber-100"
        >
          {isRunning ? 'Recalculando...' : confirmed ? 'Confirmar recalculacion' : 'Recalcular Stock'}
        </Button>
      </div>
    </div>
  );
}
