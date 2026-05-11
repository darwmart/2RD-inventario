import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockCount } from '@/types';
import { ClipboardList, TrendingUp, TrendingDown, Minus, CheckCircle, Trash2 } from 'lucide-react';
import { fmtDate } from '@/utils/dates';

interface Props {
  stockCounts: StockCount[];
  onDetail: (count: StockCount) => void;
  onApply: (count: StockCount) => void;
  onDelete: (id: string) => void;
}

export default function CountsList({ stockCounts, onDetail, onApply, onDelete }: Props) {
  if (stockCounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hay conteos registrados</p>
          <p className="text-sm">Crea un nuevo conteo para comparar el inventario físico con el sistema</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {stockCounts.map(count => {
        const positives = count.items.filter(i => i.difference > 0).length;
        const negatives = count.items.filter(i => i.difference < 0).length;
        const zeros = count.items.filter(i => i.difference === 0).length;
        return (
          <Card key={count.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-bold font-mono">{count.countNumber}</p>
                    <p className="text-sm text-gray-500">{fmtDate(count.createdAt)}</p>
                  </div>
                  <Badge className={count.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {count.status === 'completed' ? 'Aplicado' : 'Borrador'}
                  </Badge>
                  <div className="flex gap-3 text-sm">
                    <span className="text-green-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" />{positives} sobrantes</span>
                    <span className="text-red-600 flex items-center gap-1"><TrendingDown className="h-3 w-3" />{negatives} faltantes</span>
                    <span className="text-gray-500 flex items-center gap-1"><Minus className="h-3 w-3" />{zeros} iguales</span>
                  </div>
                  {count.notes && <p className="text-sm text-gray-400 italic">"{count.notes}"</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onDetail(count)}>Ver detalle</Button>
                  {count.status === 'draft' && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onApply(count)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Aplicar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onDelete(count.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
