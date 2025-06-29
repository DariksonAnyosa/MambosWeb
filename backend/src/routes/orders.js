import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getQuery, allQuery } from '../database/connection.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// GET /api/orders - Obtener todos los pedidos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, status, channel, limit = 100 } = req.query;
    
    let sql = `
      SELECT o.*, 
             GROUP_CONCAT(
               oi.name || ':' || oi.quantity || ':' || oi.price || ':' || oi.category, 
               '|'
             ) as items_data
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filtros opcionales
    if (date) {
      sql += ` AND DATE(o.timestamp) = DATE(?)`;
      params.push(date);
    }
    
    if (status) {
      sql += ` AND o.status = ?`;
      params.push(status);
    }
    
    if (channel) {
      sql += ` AND o.channel = ?`;
      params.push(channel);
    }
    
    sql += ` GROUP BY o.id ORDER BY o.timestamp DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const orders = await allQuery(sql, params);
    
    // Procesar items de cada pedido
    const processedOrders = orders.map(order => {
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
        cashReceived: parseFloat(order.cash_received || 0),
        yapeAmount: parseFloat(order.yape_amount || 0),
        cardAmount: parseFloat(order.card_amount || 0),
        status: order.status,
        prepStartTime: order.prep_start_time,
        readyTime: order.ready_time,
        completedTime: order.completed_time,
        paymentCompletedTime: order.payment_completed_time,
        estimatedTime: order.estimated_time,
        customerPhone: order.customer_phone,
        customerName: order.customer_name,
        deliveryAddress: order.delivery_address,
        tableNumber: order.table_number,
        notes: order.notes,
        canModify: Boolean(order.can_modify)
      };
    });

    res.json({
      success: true,
      data: processedOrders
    });

  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/orders/:id - Obtener un pedido específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener pedido
    const order = await getQuery(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }
    
    // Obtener items del pedido
    const items = await allQuery(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );
    
    const processedOrder = {
      id: order.id,
      timestamp: order.timestamp,
      managerName: order.manager_name,
      channel: order.channel,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      items: items.map(item => ({
        id: item.id.toString(),
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price),
        category: item.category
      })),
      total: parseFloat(order.total),
      cashReceived: parseFloat(order.cash_received || 0),
      yapeAmount: parseFloat(order.yape_amount || 0),
      cardAmount: parseFloat(order.card_amount || 0),
      status: order.status,
      prepStartTime: order.prep_start_time,
      readyTime: order.ready_time,
      completedTime: order.completed_time,
      paymentCompletedTime: order.payment_completed_time,
      estimatedTime: order.estimated_time,
      customerPhone: order.customer_phone,
      customerName: order.customer_name,
      deliveryAddress: order.delivery_address,
      tableNumber: order.table_number,
      notes: order.notes,
      canModify: Boolean(order.can_modify)
    };

    res.json({
      success: true,
      data: processedOrder
    });

  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/orders - Crear nuevo pedido
router.post('/', authenticateToken, requirePermission('orders', 'create'), async (req, res) => {
  try {
    const {
      managerName,
      channel,
      paymentMethod,
      paymentStatus = 'pending',
      items,
      total,
      cashReceived = 0,
      yapeAmount = 0,
      cardAmount = 0,
      customerPhone,
      customerName,
      deliveryAddress,
      tableNumber,
      notes,
      estimatedTime
    } = req.body;

    // Validaciones básicas
    if (!managerName || !channel || !paymentMethod || !items || !Array.isArray(items) || items.length === 0 || !total) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos para crear el pedido'
      });
    }

    // Generar ID único
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Insertar pedido
    await runQuery(`
      INSERT INTO orders (
        id, timestamp, manager_name, user_id, channel, payment_method, payment_status,
        total, cash_received, yape_amount, card_amount, status, estimated_time,
        customer_phone, customer_name, delivery_address, table_number, notes, can_modify
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 1)
    `, [
      orderId, timestamp, managerName, req.user.id, channel, paymentMethod, paymentStatus,
      total, cashReceived, yapeAmount, cardAmount, estimatedTime,
      customerPhone, customerName, deliveryAddress, tableNumber, notes
    ]);

    // Insertar items del pedido
    for (const item of items) {
      await runQuery(`
        INSERT INTO order_items (order_id, name, price, quantity, category)
        VALUES (?, ?, ?, ?, ?)
      `, [orderId, item.name, item.price, item.quantity, item.category]);
    }

    // Obtener el pedido completo creado
    const newOrder = await getQuery('SELECT * FROM orders WHERE id = ?', [orderId]);
    const orderItems = await allQuery('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    const responseOrder = {
      id: newOrder.id,
      timestamp: newOrder.timestamp,
      managerName: newOrder.manager_name,
      channel: newOrder.channel,
      paymentMethod: newOrder.payment_method,
      paymentStatus: newOrder.payment_status,
      items: orderItems.map(item => ({
        id: item.id.toString(),
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price),
        category: item.category
      })),
      total: parseFloat(newOrder.total),
      cashReceived: parseFloat(newOrder.cash_received || 0),
      yapeAmount: parseFloat(newOrder.yape_amount || 0),
      cardAmount: parseFloat(newOrder.card_amount || 0),
      status: newOrder.status,
      customerPhone: newOrder.customer_phone,
      customerName: newOrder.customer_name,
      deliveryAddress: newOrder.delivery_address,
      tableNumber: newOrder.table_number,
      notes: newOrder.notes,
      canModify: Boolean(newOrder.can_modify)
    };

    // Emitir evento de Socket.IO para sincronización en tiempo real
    req.io.emit('order_created', responseOrder);

    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      data: responseOrder
    });

  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/orders/:id - Actualizar pedido
router.put('/:id', authenticateToken, requirePermission('orders', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que el pedido existe
    const existingOrder = await getQuery('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Construir query de actualización dinámicamente
    const allowedFields = [
      'manager_name', 'channel', 'payment_method', 'payment_status', 'total',
      'cash_received', 'yape_amount', 'card_amount', 'status', 'prep_start_time',
      'ready_time', 'completed_time', 'payment_completed_time', 'estimated_time',
      'customer_phone', 'customer_name', 'delivery_address', 'table_number',
      'notes', 'can_modify'
    ];

    const updateFields = [];
    const updateValues = [];

    Object.keys(updates).forEach(key => {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = ?`);
        updateValues.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos válidos para actualizar'
      });
    }

    // Agregar timestamp de actualización
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const sql = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;
    await runQuery(sql, updateValues);

    // Obtener pedido actualizado
    const updatedOrder = await getQuery('SELECT * FROM orders WHERE id = ?', [id]);
    const orderItems = await allQuery('SELECT * FROM order_items WHERE order_id = ?', [id]);

    const responseOrder = {
      id: updatedOrder.id,
      timestamp: updatedOrder.timestamp,
      managerName: updatedOrder.manager_name,
      channel: updatedOrder.channel,
      paymentMethod: updatedOrder.payment_method,
      paymentStatus: updatedOrder.payment_status,
      items: orderItems.map(item => ({
        id: item.id.toString(),
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price),
        category: item.category
      })),
      total: parseFloat(updatedOrder.total),
      cashReceived: parseFloat(updatedOrder.cash_received || 0),
      yapeAmount: parseFloat(updatedOrder.yape_amount || 0),
      cardAmount: parseFloat(updatedOrder.card_amount || 0),
      status: updatedOrder.status,
      prepStartTime: updatedOrder.prep_start_time,
      readyTime: updatedOrder.ready_time,
      completedTime: updatedOrder.completed_time,
      paymentCompletedTime: updatedOrder.payment_completed_time,
      estimatedTime: updatedOrder.estimated_time,
      customerPhone: updatedOrder.customer_phone,
      customerName: updatedOrder.customer_name,
      deliveryAddress: updatedOrder.delivery_address,
      tableNumber: updatedOrder.table_number,
      notes: updatedOrder.notes,
      canModify: Boolean(updatedOrder.can_modify)
    };

    // Emitir evento de Socket.IO
    req.io.emit('order_updated', responseOrder);

    res.json({
      success: true,
      message: 'Pedido actualizado exitosamente',
      data: responseOrder
    });

  } catch (error) {
    console.error('Error actualizando pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/orders/:id - Eliminar pedido (solo admin)
router.delete('/:id', authenticateToken, requirePermission('orders', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el pedido existe
    const existingOrder = await getQuery('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Eliminar items del pedido primero (por la foreign key)
    await runQuery('DELETE FROM order_items WHERE order_id = ?', [id]);
    
    // Eliminar el pedido
    await runQuery('DELETE FROM orders WHERE id = ?', [id]);

    // Emitir evento de Socket.IO
    req.io.emit('order_deleted', { id });

    res.json({
      success: true,
      message: 'Pedido eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/orders/:id/status - Cambiar estado del pedido
router.post('/:id/status', authenticateToken, requirePermission('orders', 'modify_status'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }

    // Verificar que el pedido existe
    const existingOrder = await getQuery('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Preparar campos de timestamp según el estado
    const now = new Date().toISOString();
    const updates = { status };

    switch (status) {
      case 'preparing':
        updates.prep_start_time = now;
        break;
      case 'ready':
        updates.ready_time = now;
        break;
      case 'completed':
        updates.completed_time = now;
        break;
    }

    // Construir query de actualización
    const updateFields = Object.keys(updates).map(key => {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      return `${dbField} = ?`;
    });
    const updateValues = Object.values(updates);
    updateValues.push(id);

    const sql = `UPDATE orders SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await runQuery(sql, updateValues);

    // Obtener pedido actualizado
    const updatedOrder = await getQuery('SELECT * FROM orders WHERE id = ?', [id]);
    const orderItems = await allQuery('SELECT * FROM order_items WHERE order_id = ?', [id]);

    const responseOrder = {
      id: updatedOrder.id,
      timestamp: updatedOrder.timestamp,
      managerName: updatedOrder.manager_name,
      channel: updatedOrder.channel,
      paymentMethod: updatedOrder.payment_method,
      paymentStatus: updatedOrder.payment_status,
      items: orderItems.map(item => ({
        id: item.id.toString(),
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price),
        category: item.category
      })),
      total: parseFloat(updatedOrder.total),
      status: updatedOrder.status,
      prepStartTime: updatedOrder.prep_start_time,
      readyTime: updatedOrder.ready_time,
      completedTime: updatedOrder.completed_time,
      customerPhone: updatedOrder.customer_phone,
      customerName: updatedOrder.customer_name,
      deliveryAddress: updatedOrder.delivery_address,
      tableNumber: updatedOrder.table_number,
      notes: updatedOrder.notes,
      canModify: Boolean(updatedOrder.can_modify)
    };

    // Emitir evento de Socket.IO
    req.io.emit('order_status_changed', { id, status, order: responseOrder });

    res.json({
      success: true,
      message: `Estado cambiado a ${status}`,
      data: responseOrder
    });

  } catch (error) {
    console.error('Error cambiando estado del pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;