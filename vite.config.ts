import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  // Configuración del servidor de desarrollo
  server: {
    host: '0.0.0.0', // Permitir conexiones desde la red local
    port: 5173,
    strictPort: false,
    open: false, // No abrir automáticamente el navegador
  },
  
  // Configuración para preview (producción local)
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: false,
  },
  
  // Configuración de build para PWA
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          utils: ['axios'],
          socket: ['socket.io-client']
        }
      }
    },
    // Optimizaciones para móviles
    cssCodeSplit: true,
    assetsInlineLimit: 4096
  },
  
  // PWA y Service Worker
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__PWA_VERSION__': JSON.stringify(process.env.npm_package_version || '1.0.0')
  },
  
  // Variables de entorno
  envPrefix: 'VITE_',
  
  // Optimizaciones
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
