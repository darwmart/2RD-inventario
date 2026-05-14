import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './pwa/registerSW';

// Registrar Service Worker (solo en producción — vite.config.ts lo deshabilita en dev)
registerServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
