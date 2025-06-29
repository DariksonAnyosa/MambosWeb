import { runQuery, getQuery, allQuery } from '../database/connection.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mambos-secret-key-very-secure-2024';

// Configuración de Socket.IO
export const setupSocketIO = (io) => {
  
  // Middleware de autenticación para Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Token requerido'));
      }

      // Verificar token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Buscar usuario
      const user = await getQuery(
        'SELECT id, username, name, role, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (!user || !user.is_active) {
        return next(new Error('Usuario no válido'));
      }

      // Agregar usuario al socket
      socket.user = user;
      next();

    } catch (error) {
      console.error('Error en autenticación Socket.IO:', error);
      next(new Error('Token inválido'));
    }
  });

  // Manejo de conexiones
  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`✅ Usuario conectado: ${user.name} (${user.role}) - Socket: ${socket.id}`);

    try {
      // Registrar sesión activa en la base de datos
      await runQuery(`
        INSERT INTO active_sessions (user_id, socket_id, connected_at, last_activity)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [user.id, socket.id]);

      // Unir usuario a sala basada en su rol
      socket.join(`role_${user.role}`);
      socket.join('all_users');

      // Enviar información inicial al cliente
      socket.emit('connection_confirmed', {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        },
        timestamp: new Date().toISOString()
      });

      // Enviar lista de usuarios conectados a todos
      const activeUsers = await getActiveUsers();
      io.to('all_users').emit('users_online', activeUsers);

      // === EVENTOS DE PEDIDOS ===

      // Solicitar todos los pedidos
      socket.on('get_orders', async (callback) => {
        try {
          const orders = await getAllOrdersForSocket();
          callback({ success: true, data: orders });
        } catch (error) {
          console.error('Error obteniendo pedidos:', error);
          callback({ success: false, message: 'Error obteniendo pedidos' });
        }
      });

      // Crear pedido
      socket.on('create_order', async (orderData, callback) => {
        try {
          // Validar permisos
          if (!hasPermission(user.role, 'orders', 'create')) {
            return callback({ 
              success: false, 
              message: 'Sin permisos para crear pedidos' 
            });
          }

          // Aquí iría la lógica de creación del pedido
          // Por ahora, simplemente emitimos el evento
          io.to('all_users').emit('order_created', orderData);
          
          callback({ success: true, message: 'Pedido creado' });
          
        } catch (error) {
          console.error('Error creando pedido:', error);
          callback({ success: false, message: 'Error creando pedido' });
        }
      });

      // Actualizar estado de pedido
      socket.on('update_order_status', async (data, callback) => {
        try {
          const { orderId, newStatus } = data;
          
          // Validar permisos
          if (!hasPermission(user.role, 'orders', 'modify_status')) {
            return callback({ 
              success: false, 
              message: 'Sin permisos para modificar estados' 
            });
          }

          // Emitir a todos los usuarios
          io.to('all_users').emit('order_status_changed', {
            orderId,
            newStatus,
            changedBy: user.name,
            timestamp: new Date().toISOString()
          });
          
          callback({ success: true });
          
        } catch (error) {
          console.error('Error actualizando estado:', error);
          callback({ success: false, message: 'Error actualizando estado' });
        }
      });

      // === EVENTOS DE MENÚ ===

      // Solicitar menú
      socket.on('get_menu', async (callback) => {
        try {
          const menu = await getAllMenuItemsForSocket();
          callback({ success: true, data: menu });
        } catch (error) {
          console.error('Error obteniendo menú:', error);
          callback({ success: false, message: 'Error obteniendo menú' });
        }
      });

      // Actualizar disponibilidad de item del menú
      socket.on('toggle_menu_item', async (data, callback) => {
        try {
          const { itemId, available } = data;
          
          // Solo admin puede modificar menú
          if (user.role !== 'admin') {
            return callback({ 
              success: false, 
              message: 'Solo administradores pueden modificar el menú' 
            });
          }

          // Emitir a todos los usuarios
          io.to('all_users').emit('menu_item_updated', {
            itemId,
            available,
            updatedBy: user.name,
            timestamp: new Date().toISOString()
          });
          
          callback({ success: true });
          
        } catch (error) {
          console.error('Error actualizando menú:', error);
          callback({ success: false, message: 'Error actualizando menú' });
        }
      });

      // === EVENTOS DE SISTEMA ===

      // Heartbeat para mantener la conexión activa
      socket.on('heartbeat', async () => {
        await runQuery(
          'UPDATE active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE socket_id = ?',
          [socket.id]
        );
        socket.emit('heartbeat_ack');
      });

      // Solicitar usuarios conectados
      socket.on('get_online_users', async (callback) => {
        try {
          const activeUsers = await getActiveUsers();
          callback({ success: true, data: activeUsers });
        } catch (error) {
          console.error('Error obteniendo usuarios activos:', error);
          callback({ success: false, message: 'Error obteniendo usuarios' });
        }
      });

      // Enviar notificación a usuarios específicos
      socket.on('send_notification', (data) => {
        const { targetRole, message, type = 'info' } = data;
        
        if (targetRole) {
          io.to(`role_${targetRole}`).emit('notification', {
            type,
            message,
            from: user.name,
            timestamp: new Date().toISOString()
          });
        } else {
          io.to('all_users').emit('notification', {
            type,
            message,
            from: user.name,
            timestamp: new Date().toISOString()
          });
        }
      });

    } catch (error) {
      console.error('Error en setup de conexión:', error);
    }

    // === MANEJO DE DESCONEXIÓN ===
    socket.on('disconnect', async (reason) => {
      console.log(`❌ Usuario desconectado: ${user.name} - Razón: ${reason}`);
      
      try {
        // Eliminar sesión activa
        await runQuery(
          'DELETE FROM active_sessions WHERE socket_id = ?',
          [socket.id]
        );

        // Notificar a otros usuarios
        const activeUsers = await getActiveUsers();
        io.to('all_users').emit('users_online', activeUsers);
        
        io.to('all_users').emit('user_disconnected', {
          user: {
            id: user.id,
            name: user.name,
            role: user.role
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error en desconexión:', error);
      }
    });

    // Manejo de errores del socket
    socket.on('error', (error) => {
      console.error(`Error en socket ${socket.id}:`, error);
    });
  });

  // Limpiar sesiones inactivas cada 5 minutos
  setInterval(async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await runQuery(
        'DELETE FROM active_sessions WHERE last_activity < ?',
        [fiveMinutesAgo.toISOString()]
      );
    } catch (error) {
      console.error('Error limpiando sesiones inactivas:', error);
    }
  }, 5 * 60 * 1000);

  console.log('🔌 Socket.IO configurado correctamente');
};

// === FUNCIONES AUXILIARES ===

// Obtener usuarios activos
const getActiveUsers = async () => {
  try {
    const users = await allQuery(`
      SELECT DISTINCT u.id, u.username, u.name, u.role, s.connected_at
      FROM users u
      JOIN active_sessions s ON u.id = s.user_id
      WHERE u.is_active = 1
      ORDER BY s.connected_at DESC
    `);
    
    return users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      connectedAt: user.connected_at
    }));
  } catch (error) {
    console.error('Error obteniendo usuarios activos:', error);
    return [];
  }
};

// Obtener todos los pedidos para Socket.IO
const getAllOrdersForSocket = async () => {
  try {
    const orders = await allQuery(`
      SELECT o.*, 
             GROUP_CONCAT(
               oi.name || ':' || oi.quantity || ':' || oi.price || ':' || oi.category, 
               '|'
             ) as items_data
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.timestamp DESC
      LIMIT 100
    `);
    
    return orders.map(order => {
      const items = [];
      if (order.items_data) {
        const itemsArray = order.items_data.split('|');
        itemsArray.forEach(itemData => {
          const [name, quantity, price, category] = itemData.split(':');
          items.push({
            id: `${order.id}-${items.length}`,
            name,
            quantity: parseInt(quantity),
            price: parseFloat(price),
            category
          });
        });
      }
      
      return {
        id: order.id,
        timestamp: order.timestamp,
        managerName: order.manager_name,
        channel: order.channel,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        items,
        total: parseFloat(order.total),
        status: order.status,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        tableNumber: order.table_number,
        notes: order.notes
      };
    });
  } catch (error) {
    console.error('Error obteniendo pedidos para socket:', error);
    return [];
  }
};

// Obtener todos los items del menú para Socket.IO
const getAllMenuItemsForSocket = async () => {
  try {
    const items = await allQuery('SELECT * FROM menu_items ORDER BY category, name');
    
    return items.map(item => ({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
      category: item.category,
      description: item.description,
      available: Boolean(item.available)
    }));
  } catch (error) {
    console.error('Error obteniendo menú para socket:', error);
    return [];
  }
};

// Verificar permisos (misma lógica que el frontend)
const hasPermission = (role, resource, action) => {
  const permissions = {
    admin: {
      orders: ['create', 'read', 'update', 'delete', 'modify_status'],
      menu: ['create', 'read', 'update', 'delete', 'modify_prices'],
      reports: ['read', 'export', 'view_all_periods'],
      settings: ['read', 'update', 'manage_users'],
      system: ['manage_shifts', 'view_logs'],
      financial: ['view_sales', 'view_detailed_stats']
    },
    personal: {
      orders: ['create', 'read', 'update', 'modify_status'],
      menu: ['read'],
      reports: ['read', 'view_daily']
    }
  };

  const userPermissions = permissions[role];
  return userPermissions && userPermissions[resource] && userPermissions[resource].includes(action);
};

export default setupSocketIO;