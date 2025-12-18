import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // <--- IMPORTAR

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // --- CONFIGURACIÓN PWA ---
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          manifest: {
            name: 'Lidutech Finanzas',
            short_name: 'Finanzas',
            description: 'Control de gastos e ingresos inteligente',
            theme_color: '#0f172a', // Color de fondo (coincide con bg-slate-900)
            background_color: '#0f172a',
            display: 'standalone', // Esto quita la barra del navegador
            orientation: 'portrait',
            icons: [
              {
                src: 'pwa-192x192.png', // Necesitas crear estas imágenes
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png', // Necesitas crear estas imágenes
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ],
      define: {
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        dedupe: ['react', 'react-dom'], 
      },
    };
});