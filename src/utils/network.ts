/**
 * Utilidades para configuración de red y conexión
 */

// Función para obtener la IP local de la máquina
export const getLocalIP = async (): Promise<string | null> => {
  try {
    // Crear una conexión temporal para obtener la IP local
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    const dc = pc.createDataChannel('');
    
    return new Promise((resolve) => {
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve(null);
          return;
        }
        
        const myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(
          ice.candidate.candidate
        );
        
        if (myIP) {
          resolve(myIP[1]);
          pc.close();
        }
      };
      
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      // Timeout después de 3 segundos
      setTimeout(() => {
        pc.close();
        resolve(null);
      }, 3000);
    });
  } catch (error) {
    console.error('Error obteniendo IP local:', error);
    return null;
  }
};

// Función para detectar si estamos en red local o internet
export const detectNetworkEnvironment = (): 'localhost' | 'local-network' | 'internet' => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }
  
  // Rangos de IP privadas
  const privateIPRegex = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.)/;
  
  if (privateIPRegex.test(hostname)) {
    return 'local-network';
  }
  
  return 'internet';
};

// Función para construir URL del backend automáticamente
export const buildBackendURL = (port = 3001): string => {
  const environment = detectNetworkEnvironment();
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  switch (environment) {
    case 'localhost':
      return `http://localhost:${port}`;
      
    case 'local-network':
      return `${protocol}//${hostname}:${port}`;
      
    case 'internet':
      // En internet, asumir HTTPS y mismo dominio
      return `https://${hostname}`;
      
    default:
      return `http://localhost:${port}`;
  }
};

// Función para construir URL de Socket.IO
export const buildSocketURL = (port = 3001): string => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  return buildBackendURL(port);
};

// Función para comprobar si el backend está disponible
export const checkBackendHealth = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Backend no disponible:', error);
    return false;
  }
};

// Hook para mostrar información de conexión (útil para debugging)
export const getConnectionInfo = async () => {
  const environment = detectNetworkEnvironment();
  const backendURL = buildBackendURL();
  const socketURL = buildSocketURL();
  const localIP = await getLocalIP();
  
  return {
    environment,
    hostname: window.location.hostname,
    localIP,
    backendURL,
    socketURL,
    currentURL: window.location.href,
  };
};

// Función para mostrar información de conexión en consola (solo desarrollo)
export const logConnectionInfo = async () => {
  if (import.meta.env.VITE_DEBUG === 'true') {
    const info = await getConnectionInfo();
    console.group('🌐 Información de Conexión Mambos');
    console.log('🏠 Entorno:', info.environment);
    console.log('🖥️  Hostname:', info.hostname);
    console.log('📍 IP Local:', info.localIP);
    console.log('🔙 Backend URL:', info.backendURL);
    console.log('🔌 Socket URL:', info.socketURL);
    console.log('🌍 URL Actual:', info.currentURL);
    console.groupEnd();
  }
};
