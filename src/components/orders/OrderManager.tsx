import React, { useState } from 'react';
import { Order } from '../../types';
import MambosOrderSystem from './MambosOrderSystem';
import ModifyOrderModal from './ModifyOrderModal';
import ProcessPaymentModal from './ProcessPaymentModal';

interface OrderManagerProps {
  orders: Order[];
  onUpdateOrder: (order: Order) => void;
  onCreateOrder: (orderData: any) => void;
}

const OrderManager: React.FC<OrderManagerProps> = ({
  orders,
  onUpdateOrder,
  onCreateOrder
}) => {
  const [modals, setModals] = useState({
    createOrder: false,
    modifyOrder: false,
    processPayment: false
  });
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'payment'>('create');

  // 🔥 FILTROS MEJORADOS
  const pendingPaymentOrders = orders.filter(order => 
    (order.paymentStatus === 'pending' || order.paymentStatus === 'partial') &&
    order.status !== 'completed' && 
    order.status !== 'cancelled'
  );
  
  const modifiableOrders = orders.filter(order => 
    order.canModify && 
    (order.status === 'pending' || order.status === 'preparing') &&
    order.paymentStatus !== 'paid'
  );

  const handleCreateOrder = () => {
    setModalMode('create');
    setSelectedOrder(null);
    setModals(prev => ({ ...prev, createOrder: true }));
  };

  const handleModifyOrder = (order: Order) => {
    setSelectedOrder(order);
    setModals(prev => ({ ...prev, modifyOrder: true }));
  };

  const handleProcessPayment = (order: Order) => {
    setSelectedOrder(order);
    setModals(prev => ({ ...prev, processPayment: true }));
  };

  const handleAddItemToOrder = (order: Order) => {
    setSelectedOrder(order);
    setModalMode('edit');
    setModals({ modifyOrder: false, createOrder: true, processPayment: false });
  };

  const closeAllModals = () => {
    setModals({ createOrder: false, modifyOrder: false, processPayment: false });
    setSelectedOrder(null);
    setModalMode('create');
  };

  const handleOrderComplete = (orderData: any) => {
    try {
      if (modalMode === 'edit' && selectedOrder) {
        // Actualizar pedido existente con nuevos items
        const updatedOrder: Order = {
          ...selectedOrder,
          items: [...selectedOrder.items, ...orderData.items],
          total: selectedOrder.total + orderData.total,
          notes: selectedOrder.notes ? 
            `${selectedOrder.notes}; ${orderData.notes || ''}` : 
            orderData.notes || ''
        };
        
        onUpdateOrder(updatedOrder);
        console.log(`✅ Pedido #${selectedOrder.id.slice(-6)} actualizado exitosamente`);
      } else {
        // Crear nuevo pedido
        onCreateOrder(orderData);
        console.log('✅ Nuevo pedido creado exitosamente');
      }
      closeAllModals();
    } catch (error) {
      console.error('Error al completar pedido:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // 🔥 FUNCIÓN CORREGIDA PARA MANEJAR PAGOS
  const handlePaymentComplete = (updatedOrder: Order, paymentInfo: any) => {
    try {
      // 🔥 ACTUALIZAR ORDEN CON LOS NUEVOS DATOS
      onUpdateOrder(updatedOrder);
      
      // 🔥 LÓGICA MEJORADA POST-PAGO
      if (updatedOrder.paymentStatus === 'paid') {
        console.log(`💰 Pago procesado exitosamente: Pedido #${updatedOrder.id.slice(-6)} - S/ ${paymentInfo.total?.toFixed(2) || 'N/A'}`);
        
        // Si es delivery o takeaway y está pagado, confirmar que pasó a preparing
        if ((updatedOrder.channel === 'delivery' || updatedOrder.channel === 'takeaway') && 
            updatedOrder.status === 'preparing') {
          console.log(`🍳 Pedido #${updatedOrder.id.slice(-6)} enviado a cocina automáticamente`);
        }
        
        // Mostrar mensaje de éxito
        if (paymentInfo.change && paymentInfo.change > 0) {
          console.log(`💵 Vuelto: S/ ${paymentInfo.change.toFixed(2)}`);
        }
        
        // Mensaje según el canal
        switch (updatedOrder.channel) {
          case 'delivery':
            console.log(`🚚 Delivery - Pedido listo para preparar y enviar`);
            break;
          case 'takeaway':
            console.log(`🥡 Para Llevar - Cliente puede venir a recoger una vez listo`);
            break;
          case 'local':
            console.log(`🏪 Mesa ${updatedOrder.tableNumber || 'N/A'} - Pedido pagado`);
            break;
        }
      } else {
        console.log(`💳 Pago parcial registrado: Pedido #${updatedOrder.id.slice(-6)}`);
        console.log(`⏳ Pendiente: S/ ${(updatedOrder.total - (updatedOrder.cashReceived || 0) - (updatedOrder.yapeAmount || 0) - (updatedOrder.cardAmount || 0)).toFixed(2)}`);
      }
      
      // Cerrar modal
      closeAllModals();
    } catch (error) {
      console.error('Error procesando pago:', error);
      alert(`Error procesando pago: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Botones principales */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleCreateOrder}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-lg"
        >
          ➕ Nuevo Pedido
        </button>
        
        {/* 🔥 ESTADÍSTICAS RÁPIDAS */}
        <div className="flex space-x-4 text-sm bg-gray-100 rounded-lg px-4 py-2">
          <span>📊 Hoy:</span>
          <span className="font-bold">{orders.length} pedidos</span>
          <span>•</span>
          <span className="font-bold text-green-600">
            S/ {orders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(2)}
          </span>
          <span>•</span>
          <span className="font-bold text-red-500">
            {pendingPaymentOrders.length} pendientes
          </span>
        </div>
      </div>

      {/* 🔥 ALERTAS CRÍTICAS MEJORADAS */}
      {pendingPaymentOrders.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="font-bold text-red-800">
                {pendingPaymentOrders.length} Pedidos Pendientes de Pago
              </h3>
              <p className="text-red-700 text-sm">
                Total pendiente: S/ {pendingPaymentOrders.reduce((sum, order) => {
                  const remaining = order.total - (order.cashReceived || 0) - (order.yapeAmount || 0) - (order.cardAmount || 0);
                  return sum + remaining;
                }, 0).toFixed(2)}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            {pendingPaymentOrders.map(order => {
              const remainingAmount = order.total - (order.cashReceived || 0) - (order.yapeAmount || 0) - (order.cardAmount || 0);
              
              return (
                <div key={order.id} className="bg-white border border-red-200 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-red-900">
                      #{order.id.slice(-6)} - {order.customerName || 'Sin nombre'}
                    </p>
                    <p className="text-sm text-red-600">
                      {order.channel === 'local' && order.tableNumber && `Mesa: ${order.tableNumber} • `}
                      {order.channel.toUpperCase()} • Pendiente: S/ {remainingAmount.toFixed(2)} de S/ {order.total.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {order.canModify && (
                      <button
                        onClick={() => handleModifyOrder(order)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        ✏️ Modificar
                      </button>
                    )}
                    <button
                      onClick={() => handleProcessPayment(order)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors"
                    >
                      💳 PAGAR AHORA
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pedidos modificables */}
      {modifiableOrders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-800 mb-3">
            ✏️ Pedidos Modificables ({modifiableOrders.length})
          </h3>
          <div className="space-y-2">
            {modifiableOrders.map(order => (
              <div key={order.id} className="bg-white border border-blue-300 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    #{order.id.slice(-6)} - {order.customerName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {order.channel === 'local' && order.tableNumber && `Mesa: ${order.tableNumber} • `}
                    {order.items.length} items • S/ {order.total.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => handleModifyOrder(order)}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  ✏️ Modificar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de todos los pedidos */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b">
          <h3 className="font-bold text-gray-800">Todos los Pedidos ({orders.length})</h3>
        </div>
        <div className="p-4 space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay pedidos registrados</p>
              <p className="text-sm">Crea tu primer pedido con el botón "➕ Nuevo Pedido"</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">#{order.id.slice(-6)}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        order.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.paymentStatus === 'paid' ? 'Pagado' :
                         order.paymentStatus === 'partial' ? 'Pago Parcial' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.customerName} • {order.channel.toUpperCase()}
                      {order.tableNumber && ` • Mesa: ${order.tableNumber}`}
                      • S/ {order.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {order.items.length} items • {new Date(order.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    {order.canModify && (
                      <button
                        onClick={() => handleModifyOrder(order)}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        title="Modificar pedido"
                      >
                        ✏️
                      </button>
                    )}
                    {(order.paymentStatus === 'pending' || order.paymentStatus === 'partial') && (
                      <button
                        onClick={() => handleProcessPayment(order)}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        title="Procesar pago"
                      >
                        💳
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modales */}
      <MambosOrderSystem
        isOpen={modals.createOrder}
        onClose={closeAllModals}
        onOrderComplete={handleOrderComplete}
        editingOrder={modalMode === 'edit' ? selectedOrder : null}
        mode={modalMode}
      />

      {selectedOrder && (
        <>
          <ModifyOrderModal
            isOpen={modals.modifyOrder}
            order={selectedOrder}
            onClose={closeAllModals}
            onUpdateOrder={onUpdateOrder}
            onAddItem={handleAddItemToOrder}
          />

          <ProcessPaymentModal
            isOpen={modals.processPayment}
            order={selectedOrder}
            onClose={closeAllModals}
            onPaymentComplete={handlePaymentComplete}
          />
        </>
      )}
    </div>
  );
};

export default OrderManager;