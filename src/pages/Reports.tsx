import React, { useState, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { usePermission, PermissionGuard, RoleDisplay } from '../auth';

const Reports: React.FC = () => {
  const { state: orderState, getTodayOrders } = useOrders();
  const { orders } = orderState;
  const { canViewFinancialDetails, canExportData, isAdmin, isPersonal } = usePermission();
  
  const [reportType, setReportType] = useState<'daily' | 'employee' | 'period'>('daily');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Obtener empleados únicos
  const employees = Array.from(new Set(orders.map(order => order.managerName))).sort();

  // Filtrar órdenes según el tipo de reporte
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    switch (reportType) {
      case 'daily': {
        const selectedDateObj = new Date(selectedDate + 'T12:00:00');
        const selectedDateStr = selectedDateObj.toDateString();
        
        return orders.filter(order => {
          const orderDateStr = new Date(order.timestamp).toDateString();
          return orderDateStr === selectedDateStr;
        });
      }
      
      case 'employee': {
        const selectedDateObj = new Date(selectedDate + 'T12:00:00');
        const selectedDateStr = selectedDateObj.toDateString();
        
        return orders.filter(order => {
          const matchesEmployee = selectedEmployee === 'all' || order.managerName === selectedEmployee;
          const orderDateStr = new Date(order.timestamp).toDateString();
          const matchesDate = orderDateStr === selectedDateStr;
          return matchesEmployee && matchesDate;
        });
      }
      
      case 'period': {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        
        return orders.filter(order => {
          const orderDate = new Date(order.timestamp);
          return orderDate >= start && orderDate <= end;
        });
      }
      
      default:
        return getTodayOrders();
    }
  }, [orders, reportType, selectedDate, selectedEmployee, startDate, endDate, getTodayOrders]);
  
  // Calcular estadísticas
  const stats = useMemo(() => {
    const calculateStats = (ordersToAnalyze: typeof filteredOrders) => {
      if (!ordersToAnalyze || ordersToAnalyze.length === 0) {
        return {
          totalSales: 0,
          totalOrders: 0,
          averageOrder: 0,
          channelStats: {},
          channelSales: {},
          paymentStats: {},
          paymentSales: {},
          employeeStats: {}
        };
      }

      // Solo pedidos completados para ventas totales
      const completedOrders = ordersToAnalyze.filter(order => order.status === 'completed');
      const totalSales = completedOrders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = ordersToAnalyze.length;
      
      // Agrupar por canal - todos los pedidos
      const channelStats = ordersToAnalyze.reduce((acc, order) => {
        acc[order.channel] = (acc[order.channel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Calcular ventas por canal - solo completados
      const channelSales = completedOrders.reduce((acc, order) => {
        acc[order.channel] = (acc[order.channel] || 0) + order.total;
        return acc;
      }, {} as Record<string, number>);
      
      // Agrupar por método de pago - todos los pedidos
      const paymentStats = ordersToAnalyze.reduce((acc, order) => {
        acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Calcular ventas por método de pago - solo completados
      const paymentSales = completedOrders.reduce((acc, order) => {
        if (order.paymentMethod === 'mixed') {
          // Para pagos mixtos, dividir
          acc['cash'] = (acc['cash'] || 0) + (order.cashReceived || 0);
          acc['yape'] = (acc['yape'] || 0) + (order.yapeAmount || 0);
        } else {
          acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + order.total;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Agrupar por empleado - solo completados para ventas
      const employeeStats = ordersToAnalyze.reduce((acc, order) => {
        if (!acc[order.managerName]) {
          acc[order.managerName] = { count: 0, total: 0 };
        }
        acc[order.managerName].count += 1;
        if (order.status === 'completed') {
          acc[order.managerName].total += order.total;
        }
        return acc;
      }, {} as Record<string, { count: number; total: number }>);

      return {
        totalSales,
        totalOrders,
        averageOrder: totalSales > 0 ? totalSales / completedOrders.length : 0,
        channelStats,
        channelSales,
        paymentStats,
        paymentSales,
        employeeStats
      };
    };
    
    return calculateStats(filteredOrders);
  }, [filteredOrders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChannelLabel = (channel: string) => {
    const labels: Record<string, string> = {
      delivery: 'Delivery',
      local: 'Local',
      takeaway: 'Para llevar'
    };
    return labels[channel] || channel;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      yape: 'Yape',
      card: 'Tarjeta',
      mixed: 'Mixto (Efectivo + Yape)'
    };
    return labels[method] || method;
  };

  const exportToCsv = () => {
    const headers = ['Fecha', 'Hora', 'Encargado', 'Canal', 'Método de Pago', 'Total', 'Productos'];
    const rows = filteredOrders.map(order => [
      formatDate(order.timestamp),
      formatTime(order.timestamp),
      order.managerName,
      getChannelLabel(order.channel),
      getPaymentMethodLabel(order.paymentMethod),
      order.total.toFixed(2),
      order.items.map(item => `${item.quantity}x ${item.name}`).join('; ')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-mambos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600">
            {isAdmin() ? 'Análisis completo de ventas y rendimiento' : 'Resumen básico de ventas'} - 
            <span className="text-green-600 font-medium">
              Datos actualizados: {orders.length} pedidos
            </span>
          </p>
        </div>
        <PermissionGuard resource="reports" action="export">
          <button 
            onClick={exportToCsv}
            disabled={filteredOrders.length === 0}
            className="mt-4 sm:mt-0 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Exportar CSV
          </button>
        </PermissionGuard>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Reporte</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Reporte
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="daily">Reporte Diario</option>
              <option value="employee">Por Empleado</option>
              <option value="period">Por Período</option>
            </select>
          </div>

          {reportType === 'daily' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {reportType === 'employee' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empleado
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">Todos los empleados</option>
                  {employees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </>
          )}

          {reportType === 'period' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <div className="w-6 h-6 bg-green-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalSales)}
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
              <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalOrders}
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
              <p className="text-sm font-medium text-gray-600">Promedio/Pedido</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.averageOrder)}
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
              <p className="text-sm font-medium text-gray-600">Empleados Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(stats.employeeStats).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas Detalladas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Por Canal */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Ventas por Canal</h3>
          </div>
          <div className="p-6">
            {Object.keys(stats.channelStats).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(stats.channelStats).map(([channel, count]) => (
                  <div key={channel} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{getChannelLabel(channel)}</p>
                      <p className="text-sm text-gray-600">{count} pedidos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(stats.channelSales[channel] || 0)}</p>
                      <p className="text-sm text-gray-600">
                        {stats.totalSales > 0 
                          ? Math.round(((stats.channelSales[channel] || 0) / stats.totalSales) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No hay datos</p>
            )}
          </div>
        </div>

        {/* Por Método de Pago */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Métodos de Pago</h3>
          </div>
          <div className="p-6">
            {Object.keys(stats.paymentStats).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(stats.paymentStats).map(([method, count]) => (
                  <div key={method} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{getPaymentMethodLabel(method)}</p>
                      <p className="text-sm text-gray-600">{count} pedidos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(stats.paymentSales[method] || 0)}</p>
                      <p className="text-sm text-gray-600">
                        {stats.totalSales > 0 
                          ? Math.round(((stats.paymentSales[method] || 0) / stats.totalSales) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No hay datos</p>
            )}
          </div>
        </div>

        {/* Por Empleado */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Rendimiento por Empleado</h3>
          </div>
          <div className="p-6">
            {Object.keys(stats.employeeStats).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(stats.employeeStats)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .map(([employee, data]) => (
                  <div key={employee} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{employee}</p>
                      <p className="text-sm text-gray-600">{data.count} pedidos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(data.total)}</p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(data.count > 0 ? data.total / data.count : 0)} prom.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No hay datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Detalle de Pedidos */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Detalle de Pedidos ({filteredOrders.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          {filteredOrders.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Encargado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Canal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{formatDate(order.timestamp)}</div>
                        <div className="text-gray-500">{formatTime(order.timestamp)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.managerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getChannelLabel(order.channel)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getPaymentMethodLabel(order.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      <div className="truncate">
                        {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No hay pedidos para mostrar con los filtros seleccionados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;