import React, { useState, useEffect } from 'react';
import type { Order } from '../../types';

interface EditOrderModalProps {
  isOpen: boolean;
  order: Order;
  onClose: () => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  onAddItems?: (order: Order) => void; // 🔥 NUEVO: Para agregar items
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onUpdateOrder,
  onAddItems // 🔥 NUEVO
}) => {
  const [editedOrder, setEditedOrder] = useState<Order>(order);

  useEffect(() => {
    if (isOpen && order) {
      setEditedOrder(order);
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Validaciones segun el canal
    if (editedOrder.channel === 'delivery') {
      if (!editedOrder.customerName?.trim()) {
        alert('Para delivery es obligatorio el nombre del cliente');
        return;
      }
      if (!editedOrder.customerPhone?.trim()) {
        alert('Para delivery es obligatorio el telefono del cliente');
        return;
      }
    }
    
    if (editedOrder.channel === 'takeaway') {
      if (!editedOrder.customerName?.trim()) {
        alert('Para pedidos para llevar es obligatorio el nombre del cliente');
        return;
      }
    }

    onUpdateOrder(editedOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-600 text-white p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold">Editar Pedido #{order.id.slice(-6)}</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Canal */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canal de Venta:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setEditedOrder(prev => ({ ...prev, channel: 'local' }))}
                className={`p-2 rounded-lg font-medium text-sm ${
                  editedOrder.channel === 'local' ? 'bg-orange-500 text-white' : 'bg-gray-200'
                }`}
              >
                Local
              </button>
              <button
                onClick={() => setEditedOrder(prev => ({ ...prev, channel: 'delivery' }))}
                className={`p-2 rounded-lg font-medium text-sm ${
                  editedOrder.channel === 'delivery' ? 'bg-orange-500 text-white' : 'bg-gray-200'
                }`}
              >
                Delivery
              </button>
              <button
                onClick={() => setEditedOrder(prev => ({ ...prev, channel: 'takeaway' }))}
                className={`p-2 rounded-lg font-medium text-sm ${
                  editedOrder.channel === 'takeaway' ? 'bg-orange-500 text-white' : 'bg-gray-200'
                }`}
              >
                Para Llevar
              </button>
            </div>
          </div>

          {/* Nombre del Cliente */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Cliente:
              {(editedOrder.channel === 'delivery' || editedOrder.channel === 'takeaway') && (
                <span className="text-red-500"> *</span>
              )}
            </label>
            <input
              type="text"
              value={editedOrder.customerName || ''}
              onChange={(e) => setEditedOrder(prev => ({ 
                ...prev, 
                customerName: e.target.value,
                managerName: e.target.value // Mantener sincronizado
              }))}
              className={`w-full p-3 border rounded-lg ${
                (editedOrder.channel === 'delivery' || editedOrder.channel === 'takeaway') && !editedOrder.customerName?.trim()
                  ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Ingrese el nombre del cliente"
            />
          </div>

          {/* Telefono */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefono:
              {editedOrder.channel === 'delivery' && (
                <span className="text-red-500"> *</span>
              )}
              {editedOrder.channel !== 'delivery' && (
                <span className="text-gray-500"> (opcional)</span>
              )}
            </label>
            <input
              type="text"
              value={editedOrder.customerPhone || ''}
              onChange={(e) => setEditedOrder(prev => ({ 
                ...prev, 
                customerPhone: e.target.value
              }))}
              className={`w-full p-3 border rounded-lg ${
                editedOrder.channel === 'delivery' && !editedOrder.customerPhone?.trim()
                  ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Ingrese el telefono"
            />
          </div>

          {/* Direccion (solo para delivery) */}
          {editedOrder.channel === 'delivery' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Direccion de Entrega:
                <span className="text-gray-500"> (opcional)</span>
              </label>
              <textarea
                value={editedOrder.deliveryAddress || ''}
                onChange={(e) => setEditedOrder(prev => ({ 
                  ...prev, 
                  deliveryAddress: e.target.value
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Ingrese la direccion de entrega"
                rows={3}
              />
            </div>
          )}

          {/* Numero de Mesa (solo para local) */}
          {editedOrder.channel === 'local' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numero de Mesa:
                <span className="text-gray-500"> (opcional)</span>
              </label>
              <input
                type="text"
                value={editedOrder.tableNumber || ''}
                onChange={(e) => setEditedOrder(prev => ({ 
                  ...prev, 
                  tableNumber: e.target.value
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Ej: Mesa 5"
              />
            </div>
          )}

          {/* Notas */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas Adicionales:
            </label>
            <textarea
              value={editedOrder.notes || ''}
              onChange={(e) => setEditedOrder(prev => ({ 
                ...prev, 
                notes: e.target.value
              }))}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="Agregar notas o comentarios especiales"
              rows={3}
            />
          </div>

          {/* 🔥 NUEVA SECCIÓN: Items del Pedido */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Items del Pedido:
              </label>
              <span className="text-sm font-bold text-orange-600">
                Total: S/ {editedOrder.total.toFixed(2)}
              </span>
            </div>
            
            {/* Lista de items actuales */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-32 overflow-y-auto">
              {editedOrder.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-1 text-sm">
                  <span className="flex-1">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium">
                    S/ {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              {editedOrder.items.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-2">
                  No hay items en este pedido
                </p>
              )}
            </div>
            
            {/* Botón para agregar items */}
            {onAddItems && (
              <button
                onClick={() => {
                  // Primero guardar los cambios de información, luego abrir agregar items
                  onUpdateOrder(editedOrder);
                  onClose(); // Cerrar modal de edición
                  onAddItems(editedOrder); // Abrir sistema de pedidos
                }}
                className="w-full p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
              >
                <span>🛒</span>
                <span>Agregar Más Items al Pedido</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex space-x-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 p-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 p-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            💾 Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
