import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Order } from '../types';
import { validateOrder, calculateOrderStats } from '../utils/validators';
import { STORAGE_CONFIG } from '../constants';

// Estado del contexto de pedidos
interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

// Acciones para pedidos
type OrderAction = 
  | { type: 'LOAD_ORDERS_START' }
  | { type: 'LOAD_ORDERS_SUCCESS'; payload: Order[] }
  | { type: 'LOAD_ORDERS_ERROR'; payload: string }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: { id: string; updates: Partial<Order> } }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'CLEAR_ERROR' };

// Estado inicial
const initialOrderState: OrderState = {
  orders: [],
  loading: false,
  error: null
};

// Reducer para pedidos
function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'LOAD_ORDERS_START':
      return { ...state, loading: true, error: null };
    
    case 'LOAD_ORDERS_SUCCESS':
      return { ...state, loading: false, orders: action.payload };
    
    case 'LOAD_ORDERS_ERROR':
      return { ...state, loading: false, error: action.payload };
    
    case 'ADD_ORDER':
      return {
        ...state,
        orders: [...state.orders, action.payload],
        error: null
      };
    
    case 'UPDATE_ORDER': {
      const updatedOrders = state.orders.map(order =>
        order.id === action.payload.id
          ? { ...order, ...action.payload.updates }
          : order
      );
      return { ...state, orders: updatedOrders };
    }
    
    case 'DELETE_ORDER':
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload)
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

// Contexto de pedidos
interface OrderContextType {
  state: OrderState;
  // Acciones principales
  addOrder: (orderData: Omit<Order, 'id' | 'timestamp'>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, newStatus: Order['status']) => Promise<void>;
  // Selectores
  getOrderById: (id: string) => Order | undefined;
  getOrdersByStatus: (status: Order['status']) => Order[];
  getOrdersByChannel: (channel: Order['channel']) => Order[];
  getTodayOrders: () => Order[];
  getActiveOrders: () => Order[];
  // Estadísticas
  getDailyStats: () => ReturnType<typeof calculateOrderStats>;
  clearError: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Hook para usar el contexto
export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders debe ser usado dentro de OrderProvider');
  }
  return context;
}

// Provider del contexto
interface OrderProviderProps {
  children: React.ReactNode;
}

export function OrderProvider({ children }: OrderProviderProps) {
  const [state, dispatch] = useReducer(orderReducer, initialOrderState);

  // Cargar pedidos del localStorage al iniciar
  useEffect(() => {
    const loadOrders = async () => {
      try {
        dispatch({ type: 'LOAD_ORDERS_START' });
        
        const savedOrders = localStorage.getItem(STORAGE_CONFIG.keys.orders);
        if (savedOrders) {
          const orders = JSON.parse(savedOrders);
          if (Array.isArray(orders)) {
            dispatch({ type: 'LOAD_ORDERS_SUCCESS', payload: orders });
          } else {
            throw new Error('Formato de datos inválido');
          }
        } else {
          // Cargar datos de ejemplo si no hay datos guardados
          dispatch({ type: 'LOAD_ORDERS_SUCCESS', payload: getExampleOrders() });
        }
      } catch (error) {
        console.error('Error cargando pedidos:', error);
        dispatch({ type: 'LOAD_ORDERS_ERROR', payload: 'Error al cargar los pedidos' });
        // Cargar datos de ejemplo en caso de error
        dispatch({ type: 'LOAD_ORDERS_SUCCESS', payload: getExampleOrders() });
      }
    };

    loadOrders();
  }, []);

  // Guardar pedidos en localStorage cuando cambien
  useEffect(() => {
    if (state.orders.length > 0) {
      try {
        localStorage.setItem(STORAGE_CONFIG.keys.orders, JSON.stringify(state.orders));
      } catch (error) {
        console.error('Error guardando pedidos:', error);
      }
    }
  }, [state.orders]);

  // Funciones del contexto
  const addOrder = async (orderData: Omit<Order, 'id' | 'timestamp'>) => {
    try {
      // Validar el pedido
      const errors = validateOrder(orderData);
      if (errors.length > 0) {
        throw new Error(`Errores de validación: ${errors.join(', ')}`);
      }

      const newOrder: Order = {
        ...orderData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: orderData.status || 'pending',
        // ✅ VALORES PREDETERMINADOS PARA NUEVOS CAMPOS
        paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === 'pending' ? 'pending' : 'paid'),
        canModify: orderData.canModify !== false, // Por defecto true, a menos que se especifique false
        cashReceived: orderData.cashReceived || 0,
        yapeAmount: orderData.yapeAmount || 0,
        cardAmount: orderData.cardAmount || 0
      };

      dispatch({ type: 'ADD_ORDER', payload: newOrder });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al agregar pedido';
      dispatch({ type: 'LOAD_ORDERS_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      dispatch({ type: 'UPDATE_ORDER', payload: { id, updates } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar pedido';
      dispatch({ type: 'LOAD_ORDERS_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      dispatch({ type: 'DELETE_ORDER', payload: id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar pedido';
      dispatch({ type: 'LOAD_ORDERS_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const updateOrderStatus = async (id: string, newStatus: Order['status']) => {
    try {
      const now = new Date().toISOString();
      const updates: Partial<Order> = { 
        status: newStatus,
        // Registrar timestamps según el estado
        ...(newStatus === 'preparing' && { prepStartTime: now }),
        ...(newStatus === 'ready' && { readyTime: now }),
        ...(newStatus === 'completed' && { completedTime: now })
      };
      
      dispatch({ type: 'UPDATE_ORDER', payload: { id, updates } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar estado';
      dispatch({ type: 'LOAD_ORDERS_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Selectores
  const getOrderById = (id: string): Order | undefined => {
    return state.orders.find(order => order.id === id);
  };

  const getOrdersByStatus = (status: Order['status']): Order[] => {
    return state.orders.filter(order => order.status === status);
  };

  const getOrdersByChannel = (channel: Order['channel']): Order[] => {
    return state.orders.filter(order => order.channel === channel);
  };

  const getTodayOrders = (): Order[] => {
    const today = new Date().toDateString();
    return state.orders.filter(order => 
      new Date(order.timestamp).toDateString() === today
    );
  };

  const getActiveOrders = (): Order[] => {
    return state.orders.filter(order => 
      order.status !== 'completed' && order.status !== 'cancelled'
    );
  };

  const getDailyStats = () => {
    return calculateOrderStats(state.orders);
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: OrderContextType = {
    state,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    getOrderById,
    getOrdersByStatus,
    getOrdersByChannel,
    getTodayOrders,
    getActiveOrders,
    getDailyStats,
    clearError
  };

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
}

// Datos de ejemplo para testing
function getExampleOrders(): Order[] {
  return [
    {
      id: '1719158400000',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      managerName: 'Ana García',
      channel: 'local',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      items: [
        { id: '1', name: 'Hamburguesa Clásica', price: 15.00, quantity: 1, category: 'hamburguesas' },
        { id: '4', name: 'Papas Fritas', price: 8.00, quantity: 1, category: 'acompañamientos' }
      ],
      total: 23.00,
      cashReceived: 25.00,
      status: 'preparing',
      prepStartTime: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      tableNumber: '5',
      canModify: false,
      notes: 'Sin cebolla'
    },
    {
      id: '1719158500000',
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      managerName: 'Carlos López',
      channel: 'delivery',
      paymentMethod: 'pending',
      paymentStatus: 'pending',
      items: [
        { id: '2', name: 'Hamburguesa Royal', price: 18.00, quantity: 2, category: 'hamburguesas' },
        { id: '5', name: 'Gaseosa 500ml', price: 5.00, quantity: 2, category: 'bebidas' }
      ],
      total: 46.00,
      status: 'ready',
      prepStartTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      readyTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      customerPhone: '987654321',
      customerName: 'Carlos Ramírez',
      deliveryAddress: 'Av. Larco 123, Miraflores',
      canModify: true,
      notes: 'Llamar al llegar'
    },
    {
      id: '1719158600000',
      timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      managerName: 'María Torres',
      channel: 'takeaway',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      items: [
        { id: '3', name: 'Pollo Broaster', price: 12.00, quantity: 1, category: 'pollos' },
        { id: '4', name: 'Papas Fritas', price: 8.00, quantity: 1, category: 'acompañamientos' }
      ],
      total: 20.00,
      cardAmount: 20.00,
      status: 'preparing',
      prepStartTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      customerPhone: '912345678',
      customerName: 'Ana Silva',
      canModify: false,
      notes: 'Extra crispy - Llamar cuando esté listo'
    },
    {
      id: '1719158700000',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      managerName: 'Pedro Martín',
      channel: 'local',
      paymentMethod: 'pending',
      paymentStatus: 'pending',
      items: [
        { id: '6', name: '10 Alitas Clásicas', price: 30.00, quantity: 1, category: 'alitas' },
        { id: '7', name: 'Arroz Chaufa', price: 10.00, quantity: 1, category: 'extras' }
      ],
      total: 40.00,
      status: 'pending',
      tableNumber: '3',
      customerName: 'Mesa 3',
      canModify: true,
      notes: 'Salsas: BBQ y Maracuyá'
    },
    {
      id: '1719158800000',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      managerName: 'Juan Pérez',
      channel: 'local',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      items: [
        { id: '1', name: 'Hamburguesa Clásica', price: 15.00, quantity: 1, category: 'hamburguesas' },
        { id: '5', name: 'Gaseosa 500ml', price: 5.00, quantity: 1, category: 'bebidas' }
      ],
      total: 20.00,
      cashReceived: 20.00,
      status: 'completed',
      prepStartTime: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      readyTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      completedTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      tableNumber: '1',
      canModify: false
    }
  ];
}
