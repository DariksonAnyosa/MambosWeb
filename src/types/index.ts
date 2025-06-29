// Tipos principales de la aplicación

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface Order {
  id: string;
  timestamp: string;
  managerName: string;
  channel: 'delivery' | 'local' | 'takeaway';
  paymentMethod: 'cash' | 'yape' | 'card' | 'mixed' | 'pending';
  items: OrderItem[];
  total: number;
  cashReceived?: number;
  yapeAmount?: number;
  cardAmount?: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus?: 'pending' | 'partial' | 'paid'; // ✅ OPCIONAL EN CREACION, REQUERIDO EN RUNTIME
  
  // NUEVOS CAMPOS PARA TRACKING
  prepStartTime?: string;    // Cuando empezó a prepararse
  readyTime?: string;        // Cuando estuvo listo
  completedTime?: string;    // Cuando se entregó/salió
  estimatedTime?: number;    // Tiempo estimado en minutos
  paymentCompletedTime?: string; // 🔥 NUEVO: Cuando se completó el pago
  
  // CAMPOS DE CONTACTO
  customerPhone?: string;    // Teléfono del cliente (obligatorio para delivery)
  customerName?: string;     // Nombre del cliente
  deliveryAddress?: string;  // Dirección para delivery
  tableNumber?: string;      // ✅ NUEVO: Número de mesa para local
  
  notes?: string;
  canModify?: boolean;       // ✅ NUEVO: Si se puede modificar el pedido
}

export interface DailyStats {
  totalSales: number;
  totalOrders: number;
  cashAmount: number;
  yapeAmount: number;
  cardAmount: number;
  yapeReturns: number;
  ordersByChannel: {
    delivery: number;
    local: number;
    takeaway: number;
  };
  ordersByPayment: {
    cash: number;
    yape: number;
    card: number;
  };
}

export interface Shift {
  id: string;
  startTime: string;
  endTime?: string;
  employee: string;
  orders: string[];
  totalSales: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  description?: string;
}

export interface YapeReturn {
  id: string;
  orderId: string;
  amount: number;
  timestamp: string;
  processed: boolean;
}

export interface AppState {
  orders: Order[];
  dailyStats: DailyStats;
  currentShift: Shift | null;
  menu: MenuItem[];
  yapeReturns: YapeReturn[];
}

export type PaymentMethod = 'cash' | 'yape' | 'card' | 'mixed' | 'pending';
export type PaymentStatus = 'pending' | 'partial' | 'paid';
export type OrderChannel = 'delivery' | 'local' | 'takeaway';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

// ✅ NUEVOS TIPOS PARA MANEJO DE PAGOS
export interface PaymentInfo {
  method: PaymentMethod;
  cashAmount?: number;
  yapeAmount?: number;
  cardAmount?: number;
  total: number;
  timestamp: string;
  qrCode?: string; // Para pagos con Yape
}

// ✅ PARA MODIFICACIONES DE PEDIDOS
export interface OrderModification {
  orderId: string;
  type: 'add_item' | 'remove_item' | 'update_quantity';
  itemId?: string;
  newQuantity?: number;
  addedItem?: OrderItem;
  timestamp: string;
  reason?: string;
}

// Nuevos tipos para el sistema de seguimiento
export interface OrderTimeline {
  orderId: string;
  events: OrderEvent[];
}

export interface OrderEvent {
  id: string;
  type: 'created' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  timestamp: string;
  duration?: number; // en minutos
  notes?: string;
}

// Estados mejorados con labels específicos por canal - SIMPLIFICADO
export const ORDER_STATUS_LABELS = {
  pending: {
    local: 'Pendiente',
    delivery: 'Pendiente',
    takeaway: 'Pendiente'
  },
  preparing: {
    local: 'Preparando',
    delivery: 'Preparando',
    takeaway: 'Preparando'
  },
  ready: {
    local: 'Listo para Servir',
    delivery: 'Listo para Envío',
    takeaway: 'Listo para Recoger'
  },
  completed: {
    local: 'Entregado',
    delivery: 'Pedido Salió',
    takeaway: 'Retirado'
  },
  cancelled: {
    local: 'Cancelado',
    delivery: 'Cancelado',
    takeaway: 'Cancelado'
  }
};

export const CHANNEL_LABELS = {
  local: 'Local',
  delivery: 'Delivery',
  takeaway: 'Para llevar'
};
