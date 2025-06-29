/**
 * Service Worker para Mambos Web
 * Permite funcionalidad offline y caching inteligente
 */

const CACHE_NAME = 'mambos-v1.0.0';
const STATIC_CACHE = 'mambos-static-v1';
const DYNAMIC_CACHE = 'mambos-dynamic-v1';

// Archivos esenciales para cache
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Se añadirán automáticamente durante el build
];

// URLs de la API que se pueden cachear
const CACHEABLE_API_ROUTES = [
  '/api/menu',
  '/api/auth/me'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('📦 SW: Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 SW: Cacheando archivos estáticos...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ SW: Service Worker instalado correctamente');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ SW: Error instalando:', error);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Activando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ SW: Eliminando cache obsoleto:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ SW: Service Worker activado');
        return self.clients.claim();
      })
  );
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  // Solo interceptar GET requests
  if (method !== 'GET') {
    return;
  }

  // Estrategia de cache según el tipo de recurso
  if (url.includes('/api/')) {
    // API requests - Network First con cache fallback
    event.respondWith(networkFirstWithCache(request));
  } else if (url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.jpg')) {
    // Assets estáticos - Cache First
    event.respondWith(cacheFirstWithNetwork(request));
  } else {
    // HTML pages - Network First con cache fallback
    event.respondWith(networkFirstWithCache(request));
  }
});

// Estrategia: Network First con Cache Fallback
async function networkFirstWithCache(request) {
  try {
    // Intentar red primero
    const networkResponse = await fetch(request);
    
    // Si es exitoso, actualizar cache
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🔄 SW: Red no disponible, usando cache para:', request.url);
    
    // Si falla la red, usar cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no hay cache, mostrar página offline
    if (request.destination === 'document') {
      return await caches.match('/offline.html') || new Response(
        getOfflineHTML(),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    throw error;
  }
}

// Estrategia: Cache First con Network Fallback
async function cacheFirstWithNetwork(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ SW: Error obteniendo recurso:', request.url);
    throw error;
  }
}

// HTML básico para modo offline
function getOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mambos - Sin Conexión</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 20px;
        }
        .offline-container {
          background: rgba(255, 255, 255, 0.1);
          padding: 2rem;
          border-radius: 1rem;
          backdrop-filter: blur(10px);
          max-width: 400px;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .retry-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          margin-top: 1rem;
          font-size: 1rem;
        }
        .retry-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="icon">📱</div>
        <h1>Sin Conexión</h1>
        <p>No se puede conectar al servidor de Mambos. Verifica tu conexión a internet.</p>
        <button class="retry-btn" onclick="window.location.reload()">
          🔄 Reintentar
        </button>
      </div>
    </body>
    </html>
  `;
}

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notificación de actualización disponible
self.addEventListener('updatefound', () => {
  console.log('🔄 SW: Nueva versión disponible');
});
