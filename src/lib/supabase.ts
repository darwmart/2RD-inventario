import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as SupabaseClient);

/**
 * Asegura que la sesión esté activa y el token sea válido.
 * Llama esto antes de operaciones críticas (crear venta, etc.).
 * Lanza un error con mensaje amigable si la sesión expiró.
 */
export async function ensureFreshSession(): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('Tu sesión ha expirado. Por favor vuelve a iniciar sesión.');
  }
}

// Función para subir imagen a Supabase Storage
export async function uploadProductImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicUrl;
}

// Función para eliminar imagen de Supabase Storage
export async function deleteProductImage(imageUrl: string): Promise<void> {
  // Extraer el path del archivo de la URL
  const urlParts = imageUrl.split('/product-images/');
  if (urlParts.length < 2) return;

  const filePath = `products/${urlParts[1]}`;

  const { error } = await supabase.storage
    .from('product-images')
    .remove([filePath]);

  if (error) {
    console.error('Error al eliminar imagen:', error);
  }
}
