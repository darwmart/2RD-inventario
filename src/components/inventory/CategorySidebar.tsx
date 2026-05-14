import { Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Category {
  id: string;
  name: string;
  description: string;
}

interface Props {
  categories: Category[];
  selectedCategory: string;
  onSelect: (id: string) => void;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  /** 'sidebar' = panel vertical desktop (default) | 'chips' = fila horizontal mobile */
  variant?: 'sidebar' | 'chips';
}

export default function CategorySidebar({
  categories, selectedCategory, onSelect, onEdit, onDelete, variant = 'sidebar',
}: Props) {
  const { isAdmin } = useAuth();

  if (variant === 'chips') {
    return (
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onSelect('all')}
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
          }`}
        >
          Todas
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 border rounded bg-white p-4">
      <h3 className="text-sm font-semibold mb-3 text-gray-700">Sección/familia</h3>
      <div className="space-y-1">
        <div
          className={`px-3 py-2 text-sm rounded cursor-pointer ${
            selectedCategory === 'all' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'
          }`}
          onClick={() => onSelect('all')}
        >
          📋 Todas las categorías
        </div>
        {categories.map(category => (
          <div
            key={category.id}
            className={`group flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer ${
              selectedCategory === category.id ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'
            }`}
            onClick={() => onSelect(category.id)}
          >
            <span>📦 {category.name}</span>
            {isAdmin() && (
              <div className="hidden group-hover:flex gap-1">
                <button
                  className="p-0.5 rounded hover:bg-blue-200 text-blue-600"
                  onClick={(e) => { e.stopPropagation(); onEdit(category); }}
                  title="Editar"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  className="p-0.5 rounded hover:bg-red-200 text-red-600"
                  onClick={(e) => { e.stopPropagation(); onDelete(category); }}
                  title="Eliminar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
