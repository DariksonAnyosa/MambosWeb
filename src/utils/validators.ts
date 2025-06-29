import type { Order, OrderItem, DailyStats } from '../types';

// Validaciones de pedidos
export const validateOrder = (orderData: Partial<Order>): string[] => {
  const errors: string[] = [];

  // Validar datos básicos
  if (!orderData.managerName?.trim()) {
    errors.push('El nombre del responsable es obligatorio');
  }

  if (!orderData.channel) {
    errors.push('El canal de venta es obligatorio');
  }

  if (!orderData.paymentMethod) {
    errors.push('El método de pago es obligatorio');
  }

  // Validar items
  if (!orderData.items || orderData.items.length === 0) {
    errors.push('Debe agregar al menos un item al pedido');
  }

  if (orderData.items) {
    orderData.items.forEach((item, index) => {
      if (!item.name?.trim()) {
        errors.push(`Item ${index + 1}: Nombre es obligatorio`);
      }
      if (!item.price || item.price <= 0) {
        errors.push(`Item ${index + 1}: Precio debe ser mayor a 0`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Cantidad debe ser mayor a 0`);
      }
    });
  }

  // Validar total
  if (!orderData.total || orderData.total <= 0) {
    errors.push('El total debe ser mayor a 0');
  }

  // Validar coherencia del total
  if (orderData.items && orderData.total) {
    const calculatedTotal = calculateOrderTotal(orderData.items);
    if (Math.abs(calculatedTotal - orderData.total) > 0.01) {
      errors.push(`El total no coincide con la suma de items (calculado: ${calculatedTotal}, recibido: ${orderData.total})`);
    }
  }

  // Validaciones específicas por canal
  if (orderData.channel === 'delivery') {
    if (!orderData.customerPhone?.trim()) {
      errors.push('Para delivery es obligatorio el teléfono del cliente');
    }
    if (!orderData.deliveryAddress?.trim()) {
      errors.push('Para delivery es obligatoria la dirección');
    }
  }

  // Validaciones de pago mixto
  if (orderData.paymentMethod === 'mixed') {
    if (!orderData.cashReceived || orderData.cashReceived <= 0) {
      errors.push('Para pago mixto debe especificar el monto en efectivo');
    }
    if (!orderData.yapeAmount || orderData.yapeAmount <= 0) {
      errors.push('Para pago mixto debe especificar el monto en Yape');
    }
    if (orderData.total && orderData.cashReceived && orderData.yapeAmount) {
      const totalPayments = orderData.cashReceived + orderData.yapeAmount;
      if (Math.abs(totalPayments - orderData.total) > 0.01) {
        errors.push('La suma de efectivo y Yape debe igual al total');
      }
    }
  }

  return errors;
};

// Calcular total de un pedido
export const calculateOrderTotal = (items: OrderItem[]): number => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Validar item de pedido
export const validateOrderItem = (item: Partial<OrderItem>): string[] => {
  const errors: string[] = [];

  if (!item.name?.trim()) {
    errors.push('El nombre del item es obligatorio');
  }

  if (!item.price || item.price <= 0) {
    errors.push('El precio debe ser mayor a 0');
  }

  if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
    errors.push('La cantidad debe ser un número entero mayor a 0');
  }

  if (!item.category?.trim()) {
    errors.push('La categoría es obligatoria');
  }

  return errors;
};

// Calcular estadísticas de pedidos
export const calculateOrderStats = (orders: Order[]): DailyStats => {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(order => 
    new Date(order.timestamp).toDateString() === today
  );

  const stats: DailyStats = {
    totalSales: 0,
    totalOrders: todayOrders.length,
    cashAmount: 0,
    yapeAmount: 0,
    cardAmount: 0,
    yapeReturns: 0,
    ordersByChannel: {
      delivery: 0,
      local: 0,
      takeaway: 0
    },
    ordersByPayment: {
      cash: 0,
      yape: 0,
      card: 0
    }
  };

  todayOrders.forEach(order => {
    // Solo contar pedidos completados en las ventas totales
    if (order.status === 'completed') {
      stats.totalSales += order.total;
    }
    
    // Contar todos los pedidos por método de pago
    if (order.paymentMethod !== 'mixed') {
      stats.ordersByPayment[order.paymentMethod]++;
    } else {
      // Para pagos mixtos, contar como efectivo y yape
      stats.ordersByPayment.cash++;
      stats.ordersByPayment.yape++;
    }
    
    // Contar por canal
    stats.ordersByChannel[order.channel]++;
    
    // Sumar montos por método de pago solo si está completado
    if (order.status === 'completed') {
      switch (order.paymentMethod) {
        case 'cash':
          stats.cashAmount += order.total;
          break;
        case 'yape':
          stats.yapeAmount += order.total;
          break;
        case 'card':
          stats.cardAmount += order.total;
          break;
        case 'mixed':
          // En pago mixto, dividir entre efectivo y yape
          if (order.cashReceived) {
            stats.cashAmount += order.cashReceived;
          }
          if (order.yapeAmount) {
            stats.yapeAmount += order.yapeAmount;
          }
          break;
      }
    }
  });

  return stats;
};

// Calcular tiempo de preparación
export const calculatePrepTime = (order: Order): number | null => {
  if (!order.prepStartTime) return null;
  
  const endTime = order.readyTime || new Date().toISOString();
  const startTime = new Date(order.prepStartTime).getTime();
  const finishTime = new Date(endTime).getTime();
  
  return Math.round((finishTime - startTime) / 1000 / 60); // en minutos
};

// Determinar si un pedido está retrasado
export const isOrderDelayed = (order: Order, maxMinutes: number = 30): boolean => {
  if (order.status === 'completed' || order.status === 'cancelled') {
    return false;
  }
  
  const now = new Date().getTime();
  const orderTime = new Date(order.timestamp).getTime();
  const elapsedMinutes = (now - orderTime) / 1000 / 60;
  
  return elapsedMinutes > maxMinutes;
};
