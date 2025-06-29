import { useEffect, useState } from 'react';

/**
 * Hook para manejar funcionalidades PWA
 */
export const usePWA = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Listener para estado de conexión
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listener para prompt de instalación
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
      return true;
    }
    
    return false;
  };

  return {
    isOnline,
    isInstallable,
    installApp
  };
};

/**
 * Componente de banner para instalación PWA
 */
export const PWAInstallBanner = () => {
  const { isInstallable, installApp } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (!dismissed && isInstallable) {
      // Mostrar banner después de 10 segundos
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    const installed = await installApp();
    if (installed) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  if (!isVisible || !isInstallable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="text-xl mr-2">📱</span>
            <span className="font-semibold">Instalar Mambos</span>
          </div>
          <p className="text-sm text-gray-300">
            Accede más rápido como una aplicación
          </p>
        </div>
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={handleInstall}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente de estado de conexión
 */
export const ConnectionStatus = () => {
  const { isOnline } = usePWA();
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOffline(true);
    } else {
      // Ocultar después de 3 segundos cuando vuelve la conexión
      const timer = setTimeout(() => {
        setShowOffline(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showOffline) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-4 right-4 p-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${
      isOnline 
        ? 'bg-green-600 text-white' 
        : 'bg-red-600 text-white'
    }`}>
      <div className="flex items-center justify-center">
        <span className="mr-2">
          {isOnline ? '🟢' : '🔴'}
        </span>
        <span className="font-medium">
          {isOnline 
            ? 'Conexión restaurada' 
            : 'Sin conexión a internet'
          }
        </span>
      </div>
    </div>
  );
};

/**
 * Componente para actualización de la PWA
 */
export const PWAUpdatePrompt = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newSW = registration.installing;
          if (newSW) {
            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                setNewWorker(newSW);
                setShowUpdate(true);
              }
            });
          }
        });
      });
    }
  }, []);

  const updateApp = () => {
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const dismissUpdate = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="text-xl mr-2">🔄</span>
            <span className="font-semibold">Actualización disponible</span>
          </div>
          <p className="text-sm text-blue-100">
            Nueva versión de Mambos disponible
          </p>
        </div>
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={updateApp}
            className="bg-white text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Actualizar
          </button>
          <button
            onClick={dismissUpdate}
            className="text-blue-200 hover:text-white text-sm"
          >
            Después
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Provider PWA principal
 */
export const PWAProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <PWAInstallBanner />
      <ConnectionStatus />
      <PWAUpdatePrompt />
    </>
  );
};
