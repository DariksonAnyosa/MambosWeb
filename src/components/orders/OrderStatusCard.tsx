import React from 'react';
import { OrderTimer } from './OrderTimer';
import { usePermission, PermissionButton, PermissionGuard } from '../../auth';

// Tipos locales para evitar problemas de importación
interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

interface Order {
  id: string;
  timestamp: string;
  managerName: string;
  channel: 'delivery' | 'local' | 'takeaway';
  paymentMethod: 'cash' | 'yape' | 'card' | 'mixed' | 'pending'; // 🔥 Agregado 'pending'
  items: OrderItem[];
  total: number;
  cashReceived?: number;
  yapeAmount?: number;
  cardAmount?: number; // 🔥 NUEVO
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus?: 'pending' | 'partial' | 'paid'; // 🔥 NUEVO
  prepStartTime?: string;
  readyTime?: string;
  completedTime?: string;
  estimatedTime?: number;
  customerPhone?: string;
  customerName?: string;
  deliveryAddress?: string;
  tableNumber?: string; // 🔥 NUEVO
  canModify?: boolean; // 🔥 NUEVO
  notes?: string;
}

// Constantes locales
const ORDER_STATUS_LABELS = {
  pending: { local: 'Pendiente', delivery: 'Pendiente', takeaway: 'Pendiente' },
  preparing: { local: 'Preparando', delivery: 'Preparando', takeaway: 'Preparando' },
  ready: { local: 'Listo para Servir', delivery: 'Listo para Envío', takeaway: 'Listo para Recoger' },
  completed: { local: 'Entregado', delivery: 'Pedido Salió', takeaway: 'Retirado' },
  cancelled: { local: 'Cancelado', delivery: 'Cancelado', takeaway: 'Cancelado' }
};

const CHANNEL_LABELS = {
  local: 'Local',
  delivery: 'Delivery',
  takeaway: 'Para llevar'
};

interface OrderStatusCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, newStatus: Order['status']) => void;
  onProcessPayment?: (order: Order) => void; // 🔥 NUEVO
  onAddItems?: (order: Order) => void; // 🔥 NUEVO
  onEditOrder?: (order: Order) => void; // 🔥 NUEVO PARA EDITAR
}

export const OrderStatusCard: React.FC<OrderStatusCardProps> = ({ 
  order, 
  onUpdateStatus,
  onProcessPayment,
  onAddItems,
  onEditOrder
}) => {
  const { canDeleteOrders, canUpdateOrders, isAdmin } = usePermission();
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'preparing': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'ready': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getNextAction = () => {
    switch (order.status) {
      case 'pending':
        return {
          label: 'Iniciar Preparación',
          nextStatus: 'preparing' as const,
          bgColor: 'bg-blue-500 hover:bg-blue-600'
        };
      case 'preparing':
        return {
          label: ORDER_STATUS_LABELS.ready[order.channel],
          nextStatus: 'ready' as const,
          bgColor: 'bg-yellow-500 hover:bg-yellow-600'
        };
      case 'ready':
        return {
          label: ORDER_STATUS_LABELS.completed[order.channel],
          nextStatus: 'completed' as const,
          bgColor: 'bg-green-500 hover:bg-green-600'
        };
      default:
        return null;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      yape: 'Yape',
      card: 'Tarjeta',
      mixed: 'Mixto',
      pending: 'Pagar después' // 🔥 NUEVO
    };
    return labels[method] || method;
  };

  // 🔥 NUEVA FUNCIÓN: Verificar si necesita pago
  const needsPayment = () => {
    return order.paymentMethod === 'pending' || 
           (order.paymentStatus && (order.paymentStatus === 'pending' || order.paymentStatus === 'partial'));
  };

  // 🔥 NUEVA FUNCIÓN: Verificar si se puede agregar items
  const canAddItems = () => {
    // Se puede agregar items a cualquier pedido que NO esté completado o cancelado
    return order.status === 'pending' || order.status === 'preparing';
  };

  // 🔥 NUEVA FUNCIÓN: Calcular monto pendiente
  const getPendingAmount = () => {
    const received = (order.cashReceived || 0) + (order.yapeAmount || 0) + (order.cardAmount || 0);
    return order.total - received;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount);
  };

  const nextAction = getNextAction();
  const statusLabel = ORDER_STATUS_LABELS[order.status][order.channel];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header con Info Básica */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-gray-900">{order.managerName}</h3>
            <span className="text-sm text-gray-500">#{order.id.slice(-6)}</span>
          </div>
          
          {/* Información del Cliente */}
          {(order.customerName || order.customerPhone) && (
            <div className="mb-2 p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-blue-600 font-medium">Cliente:</span>
                <div>
                  {order.customerName && (
                    <p className="font-medium text-blue-900">{order.customerName}</p>
                  )}
                  {order.customerPhone && (
                    <a 
                      href={`tel:${order.customerPhone}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Tel: {order.customerPhone}
                    </a>
                  )}
                  {order.deliveryAddress && (
                    <p className="text-blue-700 text-xs mt-1">
                      Dir: {order.deliveryAddress}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {CHANNEL_LABELS[order.channel]}
              {order.tableNumber && ` - Mesa ${order.tableNumber}`}
            </span>
            <span className="text-sm text-gray-600">
              {getPaymentMethodLabel(order.paymentMethod)}
            </span>
          </div>
          
          {/* 🔥 NUEVA SECCIÓN: Estado de Pago */}
          {needsPayment() && (
            <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 text-sm font-medium">
                Pendiente de pago: {formatCurrency(getPendingAmount())}
              </p>
              {order.paymentStatus === 'partial' && (
                <p className="text-red-600 text-xs">
                  Pagado: {formatCurrency(order.total - getPendingAmount())}
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="text-right ml-4">
          <p className="font-bold text-lg">{formatCurrency(order.total)}</p>
          <OrderTimer 
            startTime={order.timestamp} 
            status={order.status}
            className="justify-end"
          />
        </div>
      </div>

      {/* Estado Actual */}
      <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)} mb-3`}>
        {statusLabel}
      </div>

      {/* Productos */}
      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Productos:</h4>
        <ul className="space-y-1">
          {order.items.map((item, index) => (
            <li key={index} className="text-sm text-gray-600">
              {item.quantity}x {item.name}
            </li>
          ))}
        </ul>
        {order.notes && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Notas:</span> {order.notes}
            </p>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="space-y-2">
        {/* Botón de Editar - Solo con permisos */}
        <PermissionGuard resource="orders" action="update">
          {onEditOrder && (
            <button
              onClick={() => onEditOrder(order)}
              className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center space-x-2"
            >
              <span>✏️</span>
              <span>Editar Pedido</span>
            </button>
          )}
        </PermissionGuard>
        
        {/* Botones de Pago y Agregar Items */}
        {(needsPayment() || canAddItems()) && (
          <div className="flex space-x-2">
            {needsPayment() && onProcessPayment && (
              <PermissionGuard resource="orders" action="update">
                <button
                  onClick={() => onProcessPayment(order)}
                  className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Procesar Pago
                </button>
              </PermissionGuard>
            )}
            {canAddItems() && onAddItems && (
              <PermissionGuard resource="orders" action="update">
                <button
                  onClick={() => onAddItems(order)}
                  className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Agregar Items
                </button>
              </PermissionGuard>
            )}
          </div>
        )}
        
        {/* Fila principal de acciones */}
        <div className="flex space-x-2">
          {nextAction && (
            <button
              onClick={() => onUpdateStatus(order.id, nextAction.nextStatus)}
              className={`flex-1 px-4 py-2 text-white font-medium rounded-lg transition-colors ${nextAction.bgColor}`}
            >
              {nextAction.label}
            </button>
          )}
          
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <PermissionGuard 
              resource="orders" 
              action="delete"
              fallback={
                canUpdateOrders() ? (
                  <button
                    onClick={() => onUpdateStatus(order.id, 'cancelled')}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                ) : null
              }
            >
              <button
                onClick={() => onUpdateStatus(order.id, 'cancelled')}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              >
                {isAdmin() ? 'Eliminar' : 'Cancelar'}
              </button>
            </PermissionGuard>
          )}
        </div>
      </div>
    </div>
  );
};
