import { apiClient, ApiResponse, PaginatedResponse } from './api';
import { Order, OrderItem } from '../types';

// Interfaces específicas para pedidos
export interface CreateOrderRequest {
  managerName: string;
  channel: 'delivery' | 'local' | 'takeaway';
  paymentMethod: 'cash' | 'yape' | 'card';
  items: OrderItem[];
  total: number;
  cashReceived?: number;
  yapeReturn?: number;
  notes?: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    address?: string;
  };
}

export interface UpdateOrderRequest {
  status?: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  notes?: string;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  channel?: string;
  paymentMethod?: string;
  status?: string;
  managerName?: string;
  search?: string;
}

// Servicio de pedidos
export const ordersService = {
  // Obtener todos los pedidos con filtros
  getOrders: async (filters?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<Order>>('/orders', filters);
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  // Obtener un pedido por ID
  getOrderById: async (orderId: string): Promise<Order> => {
    try {
      const response = await apiClient.get<Order>(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      throw error;
    }
  },

  // Crear un nuevo pedido
  createOrder: async (orderData: CreateOrderRequest): Promise<Order> => {
    try {
      const response = await apiClient.post<Order>('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Actualizar un pedido
  updateOrder: async (orderId: string, updates: UpdateOrderRequest): Promise<Order> => {
    try {
      const response = await apiClient.put<Order>(`/orders/${orderId}`, updates);
      return response.data;
    } catch (error) {
      console.error(`Error updating order ${orderId}:`, error);
      throw error;
    }
  },

  // Eliminar un pedido
  deleteOrder: async (orderId: string): Promise<void> => {
    try {
      await apiClient.delete(`/orders/${orderId}`);
    } catch (error) {
      console.error(`Error deleting order ${orderId}:`, error);
      throw error;
    }
  },

  // Obtener pedidos del día actual
  getTodayOrders: async (): Promise<Order[]> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.get<Order[]>('/orders/today', {
        date: today
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching today orders:', error);
      throw error;
    }
  },

  // Obtener estadísticas de pedidos
  getOrderStats: async (startDate?: string, endDate?: string) => {
    try {
      const response = await apiClient.get('/orders/stats', {
        startDate,
        endDate
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching order stats:', error);
      throw error;
    }
  },

  // Buscar pedidos
  searchOrders: async (searchTerm: string): Promise<Order[]> => {
    try {
      const response = await apiClient.get<Order[]>('/orders/search', {
        q: searchTerm
      });
      return response.data;
    } catch (error) {
      console.error('Error searching orders:', error);
      throw error;
    }
  },

  // Obtener pedidos por empleado
  getOrdersByEmployee: async (employeeName: string, date?: string): Promise<Order[]> => {
    try {
      const response = await apiClient.get<Order[]>(`/orders/employee/${employeeName}`, {
        date
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching orders for employee ${employeeName}:`, error);
      throw error;
    }
  },

  // Processar vuelto Yape
  processYapeReturn: async (orderId: string, amount: number): Promise<void> => {
    try {
      await apiClient.post(`/orders/${orderId}/yape-return`, { amount });
    } catch (error) {
      console.error(`Error processing Yape return for order ${orderId}:`, error);
      throw error;
    }
  },

  // Exportar pedidos a CSV
  exportOrdersCSV: async (filters?: OrderFilters): Promise<Blob> => {
    try {
      const response = await apiClient.get('/orders/export/csv', {
        ...filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting orders to CSV:', error);
      throw error;
    }
  },

  // Obtener resumen por turno
  getShiftSummary: async (shiftId: string) => {
    try {
      const response = await apiClient.get(`/orders/shift/${shiftId}/summary`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching shift summary for ${shiftId}:`, error);
      throw error;
    }
  },

  // Sincronizar pedidos offline (para PWA)
  syncOfflineOrders: async (offlineOrders: CreateOrderRequest[]): Promise<Order[]> => {
    try {
      const response = await apiClient.post<Order[]>('/orders/sync', {
        orders: offlineOrders
      });
      return response.data;
    } catch (error) {
      console.error('Error syncing offline orders:', error);
      throw error;
    }
  },

  // Obtener pedidos pendientes
  getPendingOrders: async (): Promise<Order[]> => {
    try {
      const response = await apiClient.get<Order[]>('/orders/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      throw error;
    }
  },

  // Marcar pedido como completado
  completeOrder: async (orderId: string): Promise<Order> => {
    try {
      const response = await apiClient.patch<Order>(`/orders/${orderId}/complete`);
      return response.data;
    } catch (error) {
      console.error(`Error completing order ${orderId}:`, error);
      throw error;
    }
  },

  // Cancelar pedido
  cancelOrder: async (orderId: string, reason?: string): Promise<Order> => {
    try {
      const response = await apiClient.patch<Order>(`/orders/${orderId}/cancel`, {
        reason
      });
      return response.data;
    } catch (error) {
      console.error(`Error cancelling order ${orderId}:`, error);
      throw error;
    }
  }
};

// Cache local para optimización
class OrdersCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }
}

export const ordersCache = new OrdersCache();

// Versión con cache del servicio de pedidos
export const cachedOrdersService = {
  ...ordersService,

  getOrders: async (filters?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    const cacheKey = `orders_${JSON.stringify(filters || {})}`;
    const cached = ordersCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await ordersService.getOrders(filters);
    ordersCache.set(cacheKey, result);
    return result;
  },

  getTodayOrders: async (): Promise<Order[]> => {
    const cacheKey = 'today_orders';
    const cached = ordersCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await ordersService.getTodayOrders();
    ordersCache.set(cacheKey, result);
    return result;
  },

  createOrder: async (orderData: CreateOrderRequest): Promise<Order> => {
    const result = await ordersService.createOrder(orderData);
    // Invalidar cache relacionado
    ordersCache.invalidatePattern('orders');
    ordersCache.invalidatePattern('today');
    ordersCache.invalidatePattern('stats');
    return result;
  },

  updateOrder: async (orderId: string, updates: UpdateOrderRequest): Promise<Order> => {
    const result = await ordersService.updateOrder(orderId, updates);
    // Invalidar cache relacionado
    ordersCache.invalidatePattern('orders');
    ordersCache.invalidatePattern('today');
    return result;
  },

  deleteOrder: async (orderId: string): Promise<void> => {
    await ordersService.deleteOrder(orderId);
    // Invalidar cache relacionado
    ordersCache.invalidatePattern('orders');
    ordersCache.invalidatePattern('today');
  }
};

export default ordersService;
