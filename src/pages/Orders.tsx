import React, { useState, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { useNotificationContext } from '../context/NotificationContext';
import { usePermission, PermissionGuard, RoleDisplay } from '../auth';
import { OrderStatusCard } from '../components/orders/OrderStatusCard';
import MambosOrderSystem from '../components/orders/MambosOrderSystem';
import ProcessPaymentModal from '../components/orders/ProcessPaymentModal'; // 🔥 NUEVO
import ModifyOrderModal from '../components/orders/ModifyOrderModal'; // 🔥 NUEVO
import EditOrderModal from '../components/orders/EditOrderModal'; // 🔥 NUEVO
import { LoadingState } from '../components/common/Loading';
import type { Order } from '../types'; // 🔥 NUEVO

const Orders: React.FC = () => {
  const { state, updateOrderStatus, addOrder, updateOrder, getTodayOrders } = useOrders();
  const { success, error: showError } = useNotificationContext();
  const { canDeleteOrders, canCreateOrders, canUpdateOrders, isAdmin, getCurrentUser } = usePermission();
  const { orders, loading, error } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showOrderSystem, setShowOrderSystem] = useState(false);
  
  // 🔥 NUEVOS ESTADOS PARA MODALES
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); // 🔥 NUEVO
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAddingItemsMode, setIsAddingItemsMode] = useState(false); // 🔥 NUEVO

  // Filtrar pedidos
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    return orders.filter(order => {
      const matchesSearch = order.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.id.includes(searchTerm);
      
      const matchesChannel = channelFilter === 'all' || order.channel === channelFilter;
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && !['completed', 'cancelled'].includes(order.status)) ||
                           (statusFilter === 'completed' && ['completed', 'cancelled'].includes(order.status));
      
      return matchesSearch && matchesChannel && matchesStatus;
    }).sort((a, b) => {
      // Ordenar por estado y luego por tiempo
      const statusOrder = { pending: 0, preparing: 1, ready: 2, completed: 3, cancelled: 4 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [orders, searchTerm, channelFilter, statusFilter]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        total: 0,
        pending: 0,
        preparing: 0,
        ready: 0,
        completed: 0
      };
    }
    
    const todayOrders = getTodayOrders();

    return {
      total: todayOrders.length,
      pending: todayOrders.filter(o => o.status === 'pending').length,
      preparing: todayOrders.filter(o => o.status === 'preparing').length,
      ready: todayOrders.filter(o => o.status === 'ready').length,
      completed: todayOrders.filter(o => o.status === 'completed').length,
    };
  }, [orders, getTodayOrders]);

  const handleCreateOrder = () => {
    setIsAddingItemsMode(false);
    setSelectedOrder(null);
    setShowOrderSystem(true);
  };

  const handleOrderComplete = async (orderData: any) => {
    try {
      if (isAddingItemsMode && selectedOrder) {
        // 🔥 AGREGAR ITEMS A PEDIDO EXISTENTE
        console.log('DEBUG - Agregando items al pedido existente:', orderData);
        
        const newItems = [...selectedOrder.items, ...orderData.items];
        const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // 🔥 CALCULAR NUEVO ESTADO DE PAGO
        let updatedOrder: Order;
        
        if (orderData.additionalPayment) {
          // Si hay pago adicional, actualizar montos
          const additionalPayment = orderData.additionalPayment;
          const currentCash = selectedOrder.cashReceived || 0;
          const currentYape = selectedOrder.yapeAmount || 0;
          const currentCard = selectedOrder.cardAmount || 0;
          
          updatedOrder = {
            ...selectedOrder,
            items: newItems,
            total: newTotal,
            // 🔥 ACUMULAR PAGOS
            cashReceived: currentCash + (additionalPayment.cashAmount || 0),
            yapeAmount: currentYape + (additionalPayment.yapeAmount || 0),
            cardAmount: currentCard + (additionalPayment.cardAmount || 0),
            // 🔥 ACTUALIZAR MÉTODO DE PAGO SI ES NECESARIO
            paymentMethod: additionalPayment.method === 'mixed' || 
                          (currentCash > 0 && additionalPayment.yapeAmount > 0) || 
                          (currentYape > 0 && additionalPayment.cashAmount > 0) ||
                          (currentCard > 0 && (additionalPayment.cashAmount > 0 || additionalPayment.yapeAmount > 0))
                          ? 'mixed' : additionalPayment.method,
            // 🔥 VERIFICAR SI ESTÁ COMPLETAMENTE PAGADO
            paymentStatus: (currentCash + currentYape + currentCard + 
                          (additionalPayment.cashAmount || 0) + 
                          (additionalPayment.yapeAmount || 0) + 
                          (additionalPayment.cardAmount || 0)) >= newTotal 
                          ? 'paid' : 'partial'
          };
        } else {
          // Si no hay pago adicional, solo agregar items
          updatedOrder = {
            ...selectedOrder,
            items: newItems,
            total: newTotal,
            // Mantener el pedido modificable si estaba pendiente de pago
            canModify: selectedOrder.paymentStatus === 'pending' || selectedOrder.paymentStatus === 'partial'
          };
        }
        
        await updateOrder(selectedOrder.id, updatedOrder);
        
        if (orderData.additionalPayment) {
          success('¡Items y pago agregados!', 
            `Se agregaron ${orderData.items.length} item(s) y S/ ${orderData.additionalPayment.total} al pedido #${selectedOrder.id.slice(-6)}`);
        } else {
          success('¡Items agregados!', `Se agregaron ${orderData.items.length} item(s) al pedido #${selectedOrder.id.slice(-6)}`);
        }
        
        // 🔥 CERRAR MODAL DESPUÉS DE AGREGAR EXITOSAMENTE
        setShowOrderSystem(false);
        setIsAddingItemsMode(false);
        setSelectedOrder(null);
      } else {
        // 🔥 CREAR NUEVO PEDIDO
        console.log('DEBUG - Creando nuevo pedido:', orderData);
        await addOrder(orderData);
        success('¡Pedido creado!', 'El pedido se ha registrado exitosamente');
        
        setShowOrderSystem(false);
        setIsAddingItemsMode(false);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error al procesar pedido:', error);
      showError('Error', error instanceof Error ? error.message : 'No se pudo procesar el pedido');
    }
  };

  // 🔥 NUEVAS FUNCIONES PARA MANEJAR MODALES
  const handleProcessPayment = (order: Order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handleAddItems = (order: Order) => {
    setSelectedOrder(order);
    setIsAddingItemsMode(true);
    setShowOrderSystem(true); // 🔥 Abrir sistema de pedidos en modo agregar
  };

  // 🔥 NUEVA FUNCIÓN PARA EDITAR
  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handlePaymentComplete = async (updatedOrder: Order, paymentInfo: any) => {
    try {
      await updateOrder(updatedOrder.id, updatedOrder);
      setShowPaymentModal(false);
      setSelectedOrder(null);
      
      if (updatedOrder.paymentStatus === 'paid') {
        success('¡Pago procesado!', `Pedido #${updatedOrder.id.slice(-6)} pagado completamente`);
      } else {
        success('Pago parcial registrado', `Pedido #${updatedOrder.id.slice(-6)}`);
      }
    } catch (error) {
      console.error('Error procesando pago:', error);
      showError('Error', error instanceof Error ? error.message : 'No se pudo procesar el pago');
    }
  };

  const handleOrderUpdate = async (updatedOrder: Order) => {
    try {
      await updateOrder(updatedOrder.id, updatedOrder);
      setShowModifyModal(false);
      setSelectedOrder(null);
      success('¡Pedido actualizado!', `Items agregados al pedido #${updatedOrder.id.slice(-6)}`);
    } catch (error) {
      console.error('Error actualizando pedido:', error);
      showError('Error', error instanceof Error ? error.message : 'No se pudo actualizar el pedido');
    }
  };

  // 🔥 NUEVA FUNCIÓN PARA ACTUALIZAR DESDE EDICIÓN
  const handleEditOrderUpdate = async (updatedOrder: Order) => {
    try {
      await updateOrder(updatedOrder.id, updatedOrder);
      setShowEditModal(false);
      setSelectedOrder(null);
      success('¡Pedido editado!', `Información del pedido #${updatedOrder.id.slice(-6)} actualizada`);
    } catch (error) {
      console.error('Error editando pedido:', error);
      showError('Error', error instanceof Error ? error.message : 'No se pudo editar el pedido');
    }
  };

  const closeAllModals = () => {
    setShowOrderSystem(false);
    setShowPaymentModal(false);
    setShowModifyModal(false);
    setShowEditModal(false); // 🔥 NUEVO
    setSelectedOrder(null);
    setIsAddingItemsMode(false); // 🔥 NUEVO
  };

  return (
    <LoadingState 
      isLoading={loading} 
      error={error} 
      isEmpty={!orders || orders.length === 0}
      emptyMessage="No hay pedidos registrados"
    >
      <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600">Gestiona todos los pedidos del restaurante</p>
        </div>
        <PermissionGuard resource="orders" action="create">
          <button 
            onClick={handleCreateOrder}
            className="mt-4 sm:mt-0 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            + Nuevo Pedido
          </button>
        </PermissionGuard>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-3 rounded-lg shadow-sm text-center border-l-4 border-gray-400">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-600">Total Hoy</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm text-center border-l-4 border-gray-400">
          <p className="text-2xl font-bold text-gray-500">{stats.pending}</p>
          <p className="text-sm text-gray-600">Pendientes</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm text-center border-l-4 border-blue-400">
          <p className="text-2xl font-bold text-blue-600">{stats.preparing}</p>
          <p className="text-sm text-gray-600">Preparando</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm text-center border-l-4 border-yellow-400">
          <p className="text-2xl font-bold text-yellow-600">{stats.ready}</p>
          <p className="text-sm text-gray-600">Listos</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm text-center border-l-4 border-green-400">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-sm text-gray-600">Completados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">Todos los canales</option>
            <option value="local">Local</option>
            <option value="delivery">Delivery</option>
            <option value="takeaway">Para llevar</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="active">Pedidos Activos</option>
            <option value="completed">Completados</option>
            <option value="all">Todos los estados</option>
          </select>

          <button 
            onClick={() => {
              setSearchTerm('');
              setChannelFilter('all');
              setStatusFilter('active');
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Lista de Pedidos - Organización por Columnas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Pedidos ({filteredOrders.length})
          </h3>
          {statusFilter === 'active' && stats.ready > 0 && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg text-sm font-medium">
              {stats.ready} pedido{stats.ready > 1 ? 's' : ''} listo{stats.ready > 1 ? 's' : ''} para entregar
            </div>
          )}
        </div>
        
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna 1: Pendientes y Preparando */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-l-4 border-blue-500 pl-3">
                En Proceso
              </h4>
              {filteredOrders
                .filter(order => ['pending', 'preparing'].includes(order.status))
                .map((order) => (
                  <OrderStatusCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={updateOrderStatus}
                    onProcessPayment={handleProcessPayment} // 🔥 NUEVO
                    onAddItems={handleAddItems} // 🔥 NUEVO
                    onEditOrder={handleEditOrder} // 🔥 NUEVO
                  />
                ))
              }
              {filteredOrders.filter(order => ['pending', 'preparing'].includes(order.status)).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay pedidos en proceso
                </div>
              )}
            </div>
            
            {/* Columna 2: Listos */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-l-4 border-yellow-500 pl-3">
                Listos para Entregar
              </h4>
              {filteredOrders
                .filter(order => order.status === 'ready')
                .map((order) => (
                  <OrderStatusCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={updateOrderStatus}
                    onProcessPayment={handleProcessPayment} // 🔥 NUEVO
                    onAddItems={handleAddItems} // 🔥 NUEVO
                    onEditOrder={handleEditOrder} // 🔥 NUEVO
                  />
                ))
              }
              {filteredOrders.filter(order => order.status === 'ready').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay pedidos listos
                </div>
              )}
            </div>
            
            {/* Columna 3: Completados y Cancelados */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-l-4 border-green-500 pl-3">
                Completados
              </h4>
              {filteredOrders
                .filter(order => ['completed', 'cancelled'].includes(order.status))
                .slice(0, 5) // Solo mostrar los últimos 5
                .map((order) => (
                  <OrderStatusCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={updateOrderStatus}
                    onProcessPayment={handleProcessPayment} // 🔥 NUEVO
                    onAddItems={handleAddItems} // 🔥 NUEVO
                    onEditOrder={handleEditOrder} // 🔥 NUEVO
                  />
                ))
              }
              {filteredOrders.filter(order => ['completed', 'cancelled'].includes(order.status)).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay pedidos completados hoy
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="w-16 h-16 bg-gray-400 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-2xl">📋</span>
            </div>
            <p className="text-gray-600 mb-4">
              {searchTerm || channelFilter !== 'all' || statusFilter !== 'active' 
                ? 'No se encontraron pedidos con los filtros aplicados' 
                : 'No hay pedidos registrados hoy'
              }
            </p>
            <div className="space-x-2">
              <button 
                onClick={handleCreateOrder}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Crear Nuevo Pedido
              </button>
              {(searchTerm || channelFilter !== 'all' || statusFilter !== 'active') && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setChannelFilter('all');
                    setStatusFilter('active');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Ver Todos
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notificaciones flotantes para pedidos que llevan mucho tiempo */}
      {filteredOrders.some(order => {
        const elapsed = Math.floor((new Date().getTime() - new Date(order.timestamp).getTime()) / 1000 / 60);
        return elapsed > 30 && !['completed', 'cancelled'].includes(order.status);
      }) && (
        <div className="fixed bottom-20 md:bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <h4 className="font-bold">⚠️ Atención</h4>
          <p className="text-sm mt-1">
            Hay pedidos que llevan más de 30 minutos en preparación
          </p>
        </div>
      )}

      {/* Sistema de Pedidos de Mambo's */}
      <MambosOrderSystem
        isOpen={showOrderSystem}
        onClose={closeAllModals}
        onOrderComplete={handleOrderComplete}
        editingOrder={isAddingItemsMode ? selectedOrder : null} // 🔥 NUEVO
        mode={isAddingItemsMode ? 'edit' : 'create'} // 🔥 NUEVO
      />
      
      {/* 🔥 NUEVOS MODALES */}
      {selectedOrder && (
        <>
          <ProcessPaymentModal
            isOpen={showPaymentModal}
            order={selectedOrder}
            onClose={closeAllModals}
            onPaymentComplete={handlePaymentComplete}
          />
          
          <ModifyOrderModal
            isOpen={showModifyModal}
            order={selectedOrder}
            onClose={closeAllModals}
            onUpdateOrder={handleOrderUpdate}
            onAddItem={(order) => {
              // Para agregar items adicionales
              setSelectedOrder(order);
            }}
          />
          
          <EditOrderModal
            isOpen={showEditModal}
            order={selectedOrder}
            onClose={closeAllModals}
            onUpdateOrder={handleEditOrderUpdate}
            onAddItems={handleAddItems} // 🔥 NUEVO: Para agregar items desde edición
          />
        </>
      )}
      </div>
    </LoadingState>
  );
};

export default Orders;
