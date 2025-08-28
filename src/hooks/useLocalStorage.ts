import { useState, useEffect } from 'react'; // Importa los hooks useState y useEffect de React.

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Hook personalizado para manejar el estado sincronizado con localStorage.

  const [storedValue, setStoredValue] = useState<T>(() => {
    // Estado que almacena el valor actual asociado a la clave en localStorage.
    try {
      const item = window.localStorage.getItem(key); // Intenta obtener el valor de localStorage.
      return item ? JSON.parse(item) : initialValue; // Si existe, lo parsea; si no, usa el valor inicial.
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error); // Muestra un error si ocurre.
      return initialValue; // Retorna el valor inicial en caso de error.
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    // Función para actualizar el valor en el estado y en localStorage.
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value; // Si el valor es una función, la ejecuta.
      setStoredValue(valueToStore); // Actualiza el estado con el nuevo valor.
      window.localStorage.setItem(key, JSON.stringify(valueToStore)); // Guarda el nuevo valor en localStorage.
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error); // Muestra un error si ocurre.
    }
  };

  return [storedValue, setValue] as const; 
  // Retorna el valor almacenado y la función para actualizarlo como una tupla inmutable.
}