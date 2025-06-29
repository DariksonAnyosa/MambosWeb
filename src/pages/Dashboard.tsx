import React from 'react';
import { useApp } from '../context/AppContext';
import { useOrders } from '../context/OrderContext';
import { useAuth, RoleDisplay, PermissionGuard } from '../auth';
import { OrderTimer } from '../components/orders/OrderTimer';
import { formatCurrency, formatTime } from '../utils/formatters';
import { ORDER_STATUS_LABELS, CHANNEL_LABELS, PAYMENT_METHOD_LABELS } from '../constants';
import { LoadingState } from '../components/common/Loading';

const Dashboard: React.FC = () => {
  const { state: appState, startShift, endShift } = useApp();
  const { getTodayOrders, getDailyStats, state: orderState } = useOrders();
  const { state: authState, isAdmin, getCurrentUser } = useAuth();
  
  const { currentShift } = appState;
  const { loading, error } = orderState;
  const todayOrders = getTodayOrders().slice(-5); // Últimos 5 pedidos
  const dailyStats = getDailyStats();

  const getChannelLabel = (channel: string) => {
    return CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS] || channel;
  };

  const getPaymentMethodLabel = (method: string) => {
    return PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] || method;
  };

  const handleShiftAction = () => {
    if (currentShift?.isActive) {
      endShift();
    } else {
      const employee = prompt('Ingrese el nombre del empleado:');
      if (employee && employee.trim()) {
        startShift(employee.trim());
      }
    }
  };

  return (
    <LoadingState 
      isLoading={loading} 
      error={error}
      loadingMessage="Cargando dashboard..."
    >
      <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Resumen de operaciones del día
            <RoleDisplay allowedRoles={['admin', 'personal']}>
              <span className="ml-2 text-sm">
                • Sesión: {getCurrentUser()?.name} ({isAdmin() ? 'Administrador' : 'Personal'})
              </span>
            </RoleDisplay>
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <PermissionGuard resource="system" action="manage_shifts">
            <button 
              onClick={handleShiftAction}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentShift?.isActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {currentShift?.isActive ? 'Finalizar Turno' : 'Iniciar Turno'}
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Turno Actual */}
      {currentShift?.isActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-blue-600 rounded"></div>
            <div>
              <p className="font-medium text-blue-900">Turno Activo</p>
              <p className="text-blue-700">
                {currentShift.employee} - Desde {formatTime(currentShift.startTime)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas del Día */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <div className="w-6 h-6 bg-green-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ventas del Día</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dailyStats.totalSales)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pedidos</p>
              <p className="text-2xl font-bold text-gray-900">
                {dailyStats.totalOrders}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <div className="w-6 h-6 bg-orange-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dailyStats.totalOrders > 0 ? dailyStats.totalSales / dailyStats.totalOrders : 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <div className="w-6 h-6 bg-purple-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Última Venta</p>
              <p className="text-lg font-bold text-gray-900">
                {todayOrders.length > 0 ? formatTime(todayOrders[todayOrders.length - 1].timestamp) : '--:--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Métodos de Pago */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Métodos de Pago</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-green-600 rounded"></div>
                <span className="font-medium">Efectivo</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(dailyStats.cashAmount)}</p>
                <p className="text-sm text-gray-600">{dailyStats.ordersByPayment.cash} pedidos</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-blue-600 rounded"></div>
                <span className="font-medium">Yape</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(dailyStats.yapeAmount)}</p>
                <p className="text-sm text-gray-600">{dailyStats.ordersByPayment.yape} pedidos</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-purple-600 rounded"></div>
                <span className="font-medium">Tarjeta</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(dailyStats.cardAmount)}</p>
                <p className="text-sm text-gray-600">{dailyStats.ordersByPayment.card} pedidos</p>
              </div>
            </div>

            {dailyStats.yapeReturns > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-red-600">
                  <span className="font-medium">Vueltos Yape</span>
                  <span className="font-bold">-{formatCurrency(dailyStats.yapeReturns)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canales de Venta */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Canales de Venta</h3>
          </div>
          <div className="p-6 space-y-4">
            {Object.entries(dailyStats.ordersByChannel).map(([channel, count]) => (
              <div key={channel} className="flex items-center justify-between">
                <span className="font-medium">{getChannelLabel(channel)}</span>
                <div className="text-right">
                  <span className="font-bold">{count} pedidos</span>
                  <div className="text-sm text-gray-600">
                    {dailyStats.totalOrders > 0 
                      ? Math.round((count / dailyStats.totalOrders) * 100) 
                      : 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Últimos Pedidos */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Últimos Pedidos</h3>
        </div>
        <div className="p-6">
          {todayOrders.length > 0 ? (
            <div className="space-y-4">
              {todayOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{order.managerName}</p>
                        <p className="text-sm text-gray-600">
                          {getChannelLabel(order.channel)} • {getPaymentMethodLabel(order.paymentMethod)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                        <OrderTimer 
                          startTime={order.timestamp} 
                          status={order.status}
                          className="justify-end"
                        />
                      </div>
                    </div>
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <div className="mt-2">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'ready' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {ORDER_STATUS_LABELS[order.status][order.channel]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-400 rounded mx-auto mb-4"></div>
              <p className="text-gray-600">No hay pedidos registrados hoy</p>
              <button 
                onClick={() => window.location.href = '/orders'}
                className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Ver Todos los Pedidos
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </LoadingState>
  );
};

export default Dashboard;
