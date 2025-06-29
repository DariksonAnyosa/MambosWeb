/**
 * Utilidades para funcionalidades PWA
 */

// === DETECCIÓN DE PLATAFORMA ===
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

export const isMobile = () => {
  return isIOS() || isAndroid() || /Mobi|Android/i.test(navigator.userAgent);
};

export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://');
};

// === CONFIGURACIÓN DE VIEWPORT ===
export const setViewportMeta = () => {
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    );
  }
};

// === GESTIÓN DE NOTIFICACIONES ===
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    const defaultOptions: NotificationOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: 'mambos-notification',
      renotify: true,
      requireInteraction: false,
      ...options
    };

    return new Notification(title, defaultOptions);
  }
  return null;
};

// === VIBRACIÓN ===
export const vibrate = (pattern: number | number[] = [200]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

// === COMPARTIR NATIVO ===
export const nativeShare = async (data: {
  title?: string;
  text?: string;
  url?: string;
}) => {
  if ('share' in navigator) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.log('Error compartiendo:', error);
      return false;
    }
  }
  
  // Fallback: copiar al clipboard
  if (data.url && 'clipboard' in navigator) {
    try {
      await navigator.clipboard.writeText(data.url);
      return true;
    } catch (error) {
      console.log('Error copiando al clipboard:', error);
      return false;
    }
  }
  
  return false;
};

// === MODO FULLSCREEN ===
export const enterFullscreen = () => {
  const elem = document.documentElement;
  
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if ((elem as any).mozRequestFullScreen) {
    (elem as any).mozRequestFullScreen();
  } else if ((elem as any).webkitRequestFullscreen) {
    (elem as any).webkitRequestFullscreen();
  } else if ((elem as any).msRequestFullscreen) {
    (elem as any).msRequestFullscreen();
  }
};

export const exitFullscreen = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if ((document as any).mozCancelFullScreen) {
    (document as any).mozCancelFullScreen();
  } else if ((document as any).webkitExitFullscreen) {
    (document as any).webkitExitFullscreen();
  } else if ((document as any).msExitFullscreen) {
    (document as any).msExitFullscreen();
  }
};

// === ALMACENAMIENTO LOCAL SEGURO ===
export const secureStorage = {
  set: (key: string, value: any) => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
      return false;
    }
  },
  
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue || null;
      return JSON.parse(item);
    } catch (error) {
      console.error('Error leyendo de localStorage:', error);
      return defaultValue || null;
    }
  },
  
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error eliminando de localStorage:', error);
      return false;
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error limpiando localStorage:', error);
      return false;
    }
  }
};

// === GESTIÓN DE CACHE ===
export const clearAppCache = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
  }
  
  // Limpiar localStorage de la app
  secureStorage.clear();
  
  // Reload la página
  window.location.reload();
};

// === INFORMACIÓN DEL DISPOSITIVO ===
export const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isMobile: isMobile(),
    isStandalone: isStandalone()
  };
};

// === ORIENTACIÓN DE PANTALLA ===
export const lockScreenOrientation = (orientation: OrientationLockType) => {
  if ('orientation' in screen && 'lock' in screen.orientation) {
    return screen.orientation.lock(orientation);
  }
  return Promise.reject('Screen orientation API not supported');
};

export const unlockScreenOrientation = () => {
  if ('orientation' in screen && 'unlock' in screen.orientation) {
    screen.orientation.unlock();
  }
};

// === MODO OSCURO ===
export const isDarkMode = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const watchDarkMode = (callback: (isDark: boolean) => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };
  
  mediaQuery.addEventListener('change', handler);
  
  // Llamar inmediatamente con el estado actual
  callback(mediaQuery.matches);
  
  // Retornar función para limpiar el listener
  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
};

// === ESTADO DE RED ===
export const getNetworkInfo = () => {
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  
  if (connection) {
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }
  
  return null;
};

// === INSTALACIÓN PWA ===
export const checkInstallation = () => {
  // Verificar si ya está instalada
  if (isStandalone()) {
    return { isInstalled: true, canInstall: false };
  }
  
  // Verificar si se puede instalar
  const canInstall = !secureStorage.get('pwa-install-dismissed') && 
                     !secureStorage.get('pwa-installed');
  
  return { isInstalled: false, canInstall };
};

export const markAsInstalled = () => {
  secureStorage.set('pwa-installed', true);
  secureStorage.remove('pwa-install-dismissed');
};

export const dismissInstallPrompt = () => {
  secureStorage.set('pwa-install-dismissed', true);
};

// === LOGS PARA DEBUGGING ===
export const logPWAInfo = () => {
  console.group('📱 PWA Information');
  console.log('Device Info:', getDeviceInfo());
  console.log('Network Info:', getNetworkInfo());
  console.log('Installation Status:', checkInstallation());
  console.log('Dark Mode:', isDarkMode());
  console.groupEnd();
};
