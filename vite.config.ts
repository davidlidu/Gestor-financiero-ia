import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Carga las variables de entorno para que Vite las vea durante el build
    // (Esto es necesario para que el Dockerfile le pase los valores)
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Eliminamos el bloque 'define' complicado. 
      // Vite expondrá automáticamente cualquier variable que empiece con VITE_
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});