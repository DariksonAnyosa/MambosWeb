import { io, Socket } from 'socket.io-client';
import { buildSocketURL } from '../utils/network';

// Configuración del cliente Socket.IO
class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const socketURL = buildSocketURL();
    
    console.log('🔌 Conectando a Socket.IO:', socketURL);

    this.socket = io(socketURL, {
      // Configuración básica
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      
      // Transports
      transports: ['websocket', 'polling'],
      
      // Configuración para funcionar a través de internet
      forceNew: false,
      multiplex: true,
      timeout: 20000,
      
      // CORS
      withCredentials: false,
      
      // Configuración adicional para conexiones remotas
      upgrade: true,
      rememberUpgrade: true,
    });

    this.setupEventListeners();
    
    return this.socket;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO conectado:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Máximo de intentos de reconexión alcanzado');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconectado tras', attemptNumber, 'intentos');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Intento de reconexión', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Error en reconexión:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconexión fallida definitivamente');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket no conectado, no se puede emitir:', event);
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Método para reconectar manualmente
  reconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    } else {
      this.connect();
    }
  }
}

// Instancia singleton
const socketService = new SocketService();

export default socketService;

// Exports adicionales para uso directo
export { Socket } from 'socket.io-client';
export const socket = socketService;
