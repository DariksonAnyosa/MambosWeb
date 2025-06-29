import type { OrderChannel, OrderStatus, PaymentMethod } from '../types';

// Constantes de la aplicación
export const APP_CONFIG = {
  name: 'Mambos Web',
  version: '1.0.0',
  company: 'Mambos Restaurant',
  maxOrderDelayMinutes: 30,
  autoRefreshInterval: 30000, // 30 segundos
  currency: 'PEN',
  locale: 'es-PE',
  timezone: 'America/Lima'
} as const;

// Labels para UI
export const ORDER_STATUS_LABELS: Record<OrderStatus, Record<OrderChannel, string>> = {
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
} as const;

export const CHANNEL_LABELS: Record<OrderChannel, string> = {
  local: 'Local',
  delivery: 'Delivery',
  takeaway: 'Para llevar'
} as const;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  yape: 'Yape',
  card: 'Tarjeta',
  mixed: 'Mixto', // 🔥 ACTUALIZADO
  pending: 'Pagar después' // 🔥 NUEVO
} as const;

// Colores para estados
export const STATUS_COLORS = {
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200'
  },
  preparing: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  ready: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200'
  },
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200'
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200'
  }
} as const;

// Colores para canales
export const CHANNEL_COLORS = {
  local: {
    bg: 'bg-blue-500',
    text: 'text-white',
    hover: 'hover:bg-blue-600'
  },
  delivery: {
    bg: 'bg-green-500',
    text: 'text-white',
    hover: 'hover:bg-green-600'
  },
  takeaway: {
    bg: 'bg-orange-500',
    text: 'text-white',
    hover: 'hover:bg-orange-600'
  }
} as const;

// Configuración del menú de Mambos
export const MENU_CONFIG = {
  alitas: {
    clasicas: {
      6: { price: 22, sauces: 1, name: '6 Alitas Clásicas' },
      8: { price: 26, sauces: 1, name: '8 Alitas Clásicas' },
      10: { price: 30, sauces: 2, name: '10 Alitas Clásicas' },
      20: { price: 54, sauces: 2, name: '20 Alitas Clásicas' },
      30: { price: 76, sauces: 3, name: '30 Alitas Clásicas' },
      40: { price: 98, sauces: 3, name: '40 Alitas Clásicas' }
    },
    broaster: {
      6: { price: 24, sauces: 1, name: '6 Alitas Broaster' },
      8: { price: 28, sauces: 1, name: '8 Alitas Broaster' },
      10: { price: 32, sauces: 2, name: '10 Alitas Broaster' },
      20: { price: 58, sauces: 2, name: '20 Alitas Broaster' },
      30: { price: 82, sauces: 3, name: '30 Alitas Broaster' },
      40: { price: 106, sauces: 3, name: '40 Alitas Broaster' }
    }
  },
  salsas: [
    'Acebichada', 'BBQ', 'Maracuyá', 'Búfalo', 'Honey Mustard', 
    'BBQ Picante', 'Coreana', 'Anticuchera', 'Chimichurri'
  ],
  salchipapas: [
    { name: 'Salchipapa Clásica', price: 10, id: 'salchi_clasica' },
    { name: 'Choripapa', price: 13, id: 'choripapa' },
    { name: 'Salchipapa Dorada', price: 15, id: 'salchi_dorada' },
    { name: 'Pollo Broaster 1/8', price: 15, id: 'pollo_broaster' }
  ],
  extras: [
    { name: 'Porción de Papa', price: 7, id: 'papa' },
    { name: 'Porción de Arroz', price: 4, id: 'arroz' },
    { name: 'Arroz Chaufa', price: 10, id: 'chaufa' },
    { name: 'Huevo Frito', price: 2, id: 'huevo' },
    { name: 'Tapers Descartable', price: 1, id: 'taper' }
  ],
  bebidas: [
    { name: 'Vaso de Chicha/Maracuyá', price: 6, id: 'vaso_chicha' },
    { name: 'Jarra de Chicha 1L', price: 17, id: 'jarra_chicha' },
    { name: 'Jarra de Maracuyá 1L', price: 15, id: 'jarra_maracuya' },
    { name: 'Inka Cola/Coca Cola 1L', price: 8, id: 'gaseosa_1l' },
    { name: 'Agua Mineral', price: 3, id: 'agua' },
    { name: 'Sporade', price: 4, id: 'sporade' },
    { name: 'Té', price: 3, id: 'te' },
    { name: 'Anís', price: 3, id: 'anis' },
    { name: 'Manzanilla', price: 3, id: 'manzanilla' },
    { name: 'Pilsen 305ml', price: 8, id: 'pilsen' },
    { name: 'Cusqueña 330ml', price: 10, id: 'cusquena' },
    { name: 'Corona 355ml', price: 10, id: 'corona' }
  ]
} as const;

// Configuración de almacenamiento
export const STORAGE_CONFIG = {
  keys: {
    orders: 'mambos-orders',
    menu: 'mambos-menu',
    settings: 'mambos-settings',
    shift: 'mambos-current-shift'
  },
  version: '1.0.0'
} as const;

// Configuración de notificaciones
export const NOTIFICATION_CONFIG = {
  orderDelayMinutes: 30,
  lowStockThreshold: 5,
  autoHideDuration: 5000 // 5 segundos
} as const;
