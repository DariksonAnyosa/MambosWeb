import React from 'react';
import type { Order } from '../../types';

interface ModifyOrderModalProps {
  isOpen: boolean;
  order: Order;
  onClose: () => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  onAddItem: (order: Order) => void;
}

const ModifyOrderModal: React.FC<ModifyOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onUpdateOrder,
  onAddItem
}) => {
  if (!isOpen) return null;

  const canModify = order.paymentStatus === 'pending' || order.canModify;

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = order.items.filter(item => item.id !== itemId);
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const updatedOrder: Order = {
      ...order,
      items: updatedItems,
      total: newTotal
    };
    
    onUpdateOrder(updatedOrder);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    const updatedItems = order.items.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const updatedOrder: Order = {
      ...order,
      items: updatedItems,
      total: newTotal
    };
    
    onUpdateOrder(updatedOrder);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-500 text-white p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold">Modificar Pedido #{order.id.slice(-6)}</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Order Info */}
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <h3 className="font-bold text-sm text-gray-800 mb-2">Información del Pedido</h3>
            <div className="text-xs space-y-1">
              <p><strong>Cliente:</strong> {order.customerName}</p>
              <p><strong>Canal:</strong> {order.channel}</p>
              <p><strong>Estado de Pago:</strong> 
                <span className={`ml-1 px-2 py-1 rounded text-xs ${
                  order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                  order.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {order.paymentStatus === 'paid' ? 'Pagado' :
                   order.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente'}
                </span>
              </p>
              {order.tableNumber && <p><strong>Mesa:</strong> {order.tableNumber}</p>}
            </div>
          </div>

          {!canModify && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
              <p className="text-red-700 text-sm font-medium">
                ⚠️ Este pedido ya no se puede modificar (ya fue pagado)
              </p>
            </div>
          )}

          {/* Items List */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800">Items del Pedido:</h3>
            
            {order.items.map(item => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <p className="text-xs text-gray-600">S/ {item.price} c/u</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {canModify && (
                      <>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          disabled={!canModify}
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                          disabled={!canModify}
                        >
                          +
                        </button>
                      </>
                    )}
                    
                    {!canModify && (
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                    )}
                    
                    <div className="text-right min-w-[60px]">
                      <p className="text-sm font-bold">S/ {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    
                    {canModify && (
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-gray-50 p-3 rounded-lg mt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Total:</span>
              <span className="font-bold text-lg">S/ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 space-y-3 flex-shrink-0">
          {canModify && (
            <button
              onClick={() => onAddItem(order)}
              className="w-full p-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              ➕ Agregar Más Items
            </button>
          )}
          
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="flex-1 p-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Cerrar
            </button>
            
            {canModify && (
              <button
              onClick={() => {
              console.log('Boton Procesar Pago clickeado');
              // Cerrar el modal de modificación y abrir el de pago
                onClose();
                // Esta función debería ser pasada desde Orders.tsx
                  if (order.paymentStatus === 'pending' || order.paymentStatus === 'partial') {
                  // Simular click en procesar pago
                    setTimeout(() => {
                    console.log('Intentando abrir modal de pago...');
                  }, 100);
                }
              }}
              className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              💳 Procesar Pago
            </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModifyOrderModal;
