import React, { useState, useEffect } from 'react';
import type { Order, PaymentMethod } from '../../types';

interface ProcessPaymentModalProps {
  isOpen: boolean;
  order: Order;
  onClose: () => void;
  onPaymentComplete: (order: Order, paymentInfo: any) => void;
}

const ProcessPaymentModal: React.FC<ProcessPaymentModalProps> = ({
  isOpen,
  order,
  onClose,
  onPaymentComplete
}) => {
  const [paymentStep, setPaymentStep] = useState(1);
  const [paymentInfo, setPaymentInfo] = useState({
    method: 'cash' as PaymentMethod,
    cashAmount: 0,
    yapeAmount: 0,
    cardAmount: 0,
    partialPayment: false
  });

  // 🔥 RESET AL ABRIR MODAL
  useEffect(() => {
    if (isOpen) {
      setPaymentStep(1);
      setPaymentInfo({
        method: 'cash',
        cashAmount: 0,
        yapeAmount: 0,
        cardAmount: 0,
        partialPayment: false
      });
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const remainingAmount = order.total - (order.cashReceived || 0) - (order.yapeAmount || 0) - (order.cardAmount || 0);

  // 🔥 FUNCIÓN CORREGIDA PRINCIPAL
  const handlePaymentComplete = () => {
    const totalPayment = paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount;
    const isFullyPaid = totalPayment >= remainingAmount;
    
    const updatedOrder: Order = {
      ...order,
      paymentMethod: paymentInfo.method,
      cashReceived: (order.cashReceived || 0) + paymentInfo.cashAmount,
      yapeAmount: (order.yapeAmount || 0) + paymentInfo.yapeAmount,
      cardAmount: (order.cardAmount || 0) + paymentInfo.cardAmount,
      paymentStatus: isFullyPaid ? 'paid' : 'partial',
      
      // 🔥 CORRECCIÓN PRINCIPAL: Actualizar estado del pedido
      status: (() => {
        if (isFullyPaid) {
          switch (order.channel) {
            case 'delivery':
            case 'takeaway':
              return order.status === 'pending' ? 'preparing' : order.status;
            case 'local':
              return order.status;
            default:
              return order.status;
          }
        }
        return order.status;
      })(),
      
      // 🔥 AGREGAR TIMESTAMPS
      ...(isFullyPaid && order.status === 'pending' && (order.channel === 'delivery' || order.channel === 'takeaway') && {
        prepStartTime: new Date().toISOString()
      }),
      
      // 🔥 DESHABILITAR MODIFICACIONES SI ESTÁ PAGADO
      canModify: isFullyPaid ? false : (order.canModify !== false)
    };

    // 🔥 INFORMACIÓN DE PAGO DETALLADA
    const paymentDetails = {
      method: paymentInfo.method,
      cashAmount: paymentInfo.cashAmount,
      yapeAmount: paymentInfo.yapeAmount,
      cardAmount: paymentInfo.cardAmount,
      total: totalPayment,
      change: paymentInfo.method === 'cash' && paymentInfo.cashAmount > remainingAmount ? 
               (paymentInfo.cashAmount - remainingAmount) : 0,
      fullyPaid: isFullyPaid,
      timestamp: new Date().toISOString()
    };

    onPaymentComplete(updatedOrder, paymentDetails);
    onClose();
    
    // 🔥 LOG DE CONFIRMACIÓN
    if (isFullyPaid) {
      console.log(`✅ Pedido #${order.id.slice(-6)} pagado completamente - Estado: ${updatedOrder.status}`);
    }
  };

  const PaymentMethodSelection = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-center text-gray-800">Método de Pago</h3>
      
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-center">
          <p className="font-bold text-lg">Total a Pagar: S/ {remainingAmount.toFixed(2)}</p>
          {remainingAmount < order.total && (
            <p className="text-sm text-blue-600 mt-1">
              Ya pagado: S/ {(order.total - remainingAmount).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setPaymentInfo(prev => ({ ...prev, method: 'cash' }));
            setPaymentStep(2);
          }}
          className="p-4 bg-green-500 text-white rounded-xl font-bold text-base hover:bg-green-600 transition-colors shadow-lg"
        >
          💵<br />EFECTIVO
        </button>
        <button
          onClick={() => {
            setPaymentInfo(prev => ({ ...prev, method: 'yape' }));
            setPaymentStep(2);
          }}
          className="p-4 bg-purple-500 text-white rounded-xl font-bold text-base hover:bg-purple-600 transition-colors shadow-lg"
        >
          📱<br />YAPE
        </button>
        <button
          onClick={() => {
            setPaymentInfo(prev => ({ ...prev, method: 'card' }));
            setPaymentStep(2);
          }}
          className="p-4 bg-blue-500 text-white rounded-xl font-bold text-base hover:bg-blue-600 transition-colors shadow-lg"
        >
          💳<br />TARJETA
        </button>
        <button
          onClick={() => {
            setPaymentInfo(prev => ({ ...prev, method: 'mixed' }));
            setPaymentStep(2);
          }}
          className="p-4 bg-orange-500 text-white rounded-xl font-bold text-base hover:bg-orange-600 transition-colors shadow-lg"
        >
          🔄<br />MIXTO
        </button>
      </div>
    </div>
  );

  const PaymentDetails = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-center text-gray-800">
        Procesar Pago - {paymentInfo.method.toUpperCase()}
      </h3>
      
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-center">
          <p className="font-bold text-lg">Monto a Pagar: S/ {remainingAmount.toFixed(2)}</p>
        </div>
      </div>

      {(paymentInfo.method === 'cash' || paymentInfo.method === 'mixed') && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Efectivo recibido:
          </label>
          <input
            type="number"
            value={paymentInfo.cashAmount || ''}
            onChange={(e) => setPaymentInfo(prev => ({ 
              ...prev, 
              cashAmount: parseFloat(e.target.value) || 0 
            }))}
            className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center"
            placeholder="S/ 0.00"
            min="0"
            step="0.50"
          />
          {paymentInfo.cashAmount > 0 && paymentInfo.cashAmount > remainingAmount && (
            <div className="bg-green-50 p-2 rounded text-center">
              <p className="text-green-700 font-medium">
                Vuelto: S/ {(paymentInfo.cashAmount - remainingAmount).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {(paymentInfo.method === 'yape' || paymentInfo.method === 'mixed') && (
        <div className="space-y-3">
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-4xl mb-2">📱</div>
            <p className="text-purple-700 font-medium">
              Mostrar QR de Yape
            </p>
            <p className="text-sm text-purple-600 mt-2">
              Monto: S/ {paymentInfo.method === 'mixed' ? 'Variable' : remainingAmount.toFixed(2)}
            </p>
          </div>
          {paymentInfo.method === 'mixed' && (
            <input
              type="number"
              value={paymentInfo.yapeAmount || ''}
              onChange={(e) => setPaymentInfo(prev => ({ 
                ...prev, 
                yapeAmount: parseFloat(e.target.value) || 0 
              }))}
              className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center"
              placeholder="Monto por Yape"
              min="0"
              step="0.50"
            />
          )}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="yape-confirmed"
              onChange={(e) => {
                if (e.target.checked && paymentInfo.method === 'yape') {
                  setPaymentInfo(prev => ({ ...prev, yapeAmount: remainingAmount }));
                } else if (!e.target.checked) {
                  setPaymentInfo(prev => ({ ...prev, yapeAmount: 0 }));
                }
              }}
              className="w-4 h-4"
            />
            <label htmlFor="yape-confirmed" className="text-sm">
              Pago confirmado por Yape
            </label>
          </div>
        </div>
      )}

      {(paymentInfo.method === 'card' || paymentInfo.method === 'mixed') && (
        <div className="space-y-3">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-4xl mb-2">💳</div>
            <p className="text-blue-700 font-medium">
              Procesar pago con tarjeta
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Monto: S/ {paymentInfo.method === 'mixed' ? 'Variable' : remainingAmount.toFixed(2)}
            </p>
          </div>
          {paymentInfo.method === 'mixed' && (
            <input
              type="number"
              value={paymentInfo.cardAmount || ''}
              onChange={(e) => setPaymentInfo(prev => ({ 
                ...prev, 
                cardAmount: parseFloat(e.target.value) || 0 
              }))}
              className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center"
              placeholder="Monto con tarjeta"
              min="0"
              step="0.50"
            />
          )}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="card-confirmed"
              onChange={(e) => {
                if (e.target.checked && paymentInfo.method === 'card') {
                  setPaymentInfo(prev => ({ ...prev, cardAmount: remainingAmount }));
                } else if (!e.target.checked) {
                  setPaymentInfo(prev => ({ ...prev, cardAmount: 0 }));
                }
              }}
              className="w-4 h-4"
            />
            <label htmlFor="card-confirmed" className="text-sm">
              Pago procesado exitosamente
            </label>
          </div>
        </div>
      )}

      {paymentInfo.method === 'mixed' && (
        <div className="bg-orange-50 p-3 rounded-lg">
          <h4 className="font-medium text-orange-800 mb-2">Resumen de Pago Mixto:</h4>
          <div className="text-sm text-orange-700 space-y-1">
            <p>💵 Efectivo: S/ {paymentInfo.cashAmount.toFixed(2)}</p>
            <p>📱 Yape: S/ {paymentInfo.yapeAmount.toFixed(2)}</p>
            <p>💳 Tarjeta: S/ {paymentInfo.cardAmount.toFixed(2)}</p>
            <p className="border-t pt-1 font-medium">
              Total: S/ {(paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount).toFixed(2)}
            </p>
            <p className="text-xs">
              Restante: S/ {(remainingAmount - (paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount)).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="flex space-x-2 pt-4">
        <button
          onClick={() => setPaymentStep(1)}
          className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          ← Volver
        </button>
        <button
          onClick={() => {
            // Validaciones mejoradas
            const totalPayment = paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount;
            
            if (paymentInfo.method === 'cash' && paymentInfo.cashAmount < remainingAmount) {
              alert('El monto en efectivo debe cubrir el total pendiente');
              return;
            }
            
            if (paymentInfo.method === 'yape' && paymentInfo.yapeAmount === 0) {
              alert('Debe confirmar el pago por Yape');
              return;
            }
            
            if (paymentInfo.method === 'card' && paymentInfo.cardAmount === 0) {
              alert('Debe confirmar el pago con tarjeta');
              return;
            }
            
            if (paymentInfo.method === 'mixed' && totalPayment === 0) {
              alert('Debe ingresar al menos un método de pago');
              return;
            }
            
            setPaymentStep(3);
          }}
          className="flex-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Continuar →
        </button>
      </div>
    </div>
  );

  const PaymentConfirmation = () => {
    const totalPayment = paymentInfo.cashAmount + paymentInfo.yapeAmount + paymentInfo.cardAmount;
    const willBeFullyPaid = totalPayment >= remainingAmount;
    
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-center text-gray-800">
          Confirmar Pago
        </h3>
        
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <h4 className="font-bold">Detalle del Pago:</h4>
          <div className="text-sm space-y-1">
            <p><strong>Pedido:</strong> #{order.id.slice(-6)}</p>
            <p><strong>Cliente:</strong> {order.customerName}</p>
            <p><strong>Canal:</strong> {order.channel}</p>
            <p><strong>Total del Pedido:</strong> S/ {order.total.toFixed(2)}</p>
            <p><strong>Ya Pagado:</strong> S/ {(order.total - remainingAmount).toFixed(2)}</p>
            <p><strong>Pendiente:</strong> S/ {remainingAmount.toFixed(2)}</p>
            <hr className="my-2" />
            <p><strong>Pago Actual:</strong> S/ {totalPayment.toFixed(2)}</p>
            {paymentInfo.cashAmount > 0 && <p>💵 Efectivo: S/ {paymentInfo.cashAmount.toFixed(2)}</p>}
            {paymentInfo.yapeAmount > 0 && <p>📱 Yape: S/ {paymentInfo.yapeAmount.toFixed(2)}</p>}
            {paymentInfo.cardAmount > 0 && <p>💳 Tarjeta: S/ {paymentInfo.cardAmount.toFixed(2)}</p>}
            {paymentInfo.cashAmount > remainingAmount && (
              <p className="text-green-700"><strong>Vuelto:</strong> S/ {(paymentInfo.cashAmount - remainingAmount).toFixed(2)}</p>
            )}
            <hr className="my-2" />
            <p className={`font-bold ${
              willBeFullyPaid ? 'text-green-700' : 'text-orange-700'
            }`}>
              Estado Final: {willBeFullyPaid ? 'Totalmente Pagado' : 'Pago Parcial'}
            </p>
            {willBeFullyPaid && (order.channel === 'delivery' || order.channel === 'takeaway') && (
              <p className="text-blue-600 text-sm font-medium">
                El pedido pasará automáticamente a preparación
              </p>
            )}
            {!willBeFullyPaid && (
              <p className="text-orange-600 text-xs">
                Quedará pendiente: S/ {(remainingAmount - totalPayment).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setPaymentStep(2)}
            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Volver
          </button>
          <button
            onClick={handlePaymentComplete}
            className="flex-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-bold"
          >
            Confirmar Pago
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-green-500 text-white p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold">Procesar Pago</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">
            X
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {paymentStep === 1 && <PaymentMethodSelection />}
          {paymentStep === 2 && <PaymentDetails />}
          {paymentStep === 3 && <PaymentConfirmation />}
        </div>
      </div>
    </div>
  );
};

export default ProcessPaymentModal;