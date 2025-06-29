import express from 'express';
import { runQuery, getQuery, allQuery } from '../database/connection.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import {
  sanitizeUserInput,
  obfuscateSensitiveData,
  encrypt,
  decrypt,
  requireRole,
  createRateLimit,
  auditLog
} from '../middleware/security.js';

const router = express.Router();

// Rate limiting para operaciones del menú
const menuReadLimiter = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 requests por minuto para lectura
  message: 'Demasiadas consultas al menú'
});

const menuWriteLimiter = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 operaciones de escritura por 5 minutos
  message: 'Demasiadas modificaciones al menú'
});

// Función para encriptar datos sensibles del menú
const encryptMenuData = (item) => {
  const sensitiveData = {
    cost: item.cost || 0, // Costo real del producto (privado)
    supplier: item.supplier || '', // Proveedor (privado)
    margin: item.margin || 0, // Margen de ganancia (privado)
    internalNotes: item.internal_notes || '' // Notas internas (privado)
  };
  
  return {
    ...item,
    encrypted_data: encrypt(JSON.stringify(sensitiveData))
  };
};

// Función para mostrar solo datos públicos del menú
const getPublicMenuData = (item, userRole) => {
  const publicData = {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    available: Boolean(item.available),
    image_url: item.image_url || null
  };
  
  // Solo mostrar precio a usuarios autenticados
  if (userRole) {
    publicData.price = parseFloat(item.price);
  }
  
  // Solo mostrar datos administrativos a admin/manager
  if (userRole === 'admin' || userRole === 'manager') {
    publicData.updated_at = item.updated_at;
    publicData.created_at = item.created_at;
    
    // Desencriptar datos sensibles para administradores
    if (item.encrypted_data) {
      try {
        const decryptedData = decrypt(JSON.parse(item.encrypted_data));
        if (decryptedData) {
          const sensitiveInfo = JSON.parse(decryptedData);
          publicData.cost = sensitiveInfo.cost;
          publicData.supplier = sensitiveInfo.supplier;
          publicData.margin = sensitiveInfo.margin;
          publicData.internal_notes = sensitiveInfo.internalNotes;
        }
      } catch (error) {
        console.error('Error desencriptando datos del menú:', error);
      }
    }
  }
  
  return publicData;
};

// GET /api/menu - Obtener todos los items del menú SEGURO
router.get('/', menuReadLimiter, authenticateToken, async (req, res) => {
  try {
    let { category, available } = req.query;
    
    // Sanitizar inputs
    category = category ? sanitizeUserInput(category) : null;
    
    let sql = 'SELECT * FROM menu_items WHERE 1=1';
    const params = [];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    if (available !== undefined) {
      sql += ' AND available = ?';
      params.push(available === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY category, name';
    
    const items = await allQuery(sql, params);
    
    // Filtrar datos según el rol del usuario
    const processedItems = items.map(item => 
      getPublicMenuData(item, req.user.role)
    );

    auditLog('MENU_ACCESSED', {
      userId: req.user.id,
      itemCount: processedItems.length,
      filters: { category, available },
      ip: req.ip
    });

    res.json({
      success: true,
      data: processedItems
    });

  } catch (error) {
    console.error('Error obteniendo menú:', obfuscateSensitiveData(error));
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/menu/categories - Obtener categorías únicas
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await allQuery(
      'SELECT DISTINCT category FROM menu_items ORDER BY category'
    );

    res.json({
      success: true,
      data: categories.map(row => row.category)
    });

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/menu/:id - Obtener item específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await getQuery(
      'SELECT * FROM menu_items WHERE id = ?',
      [id]
    );
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        category: item.category,
        description: item.description,
        available: Boolean(item.available)
      }
    });

  } catch (error) {
    console.error('Error obteniendo item del menú:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/menu - Crear nuevo item (solo admin)
router.post('/', authenticateToken, requirePermission('menu', 'create'), async (req, res) => {
  try {
    const { name, price, category, description, available = true } = req.body;

    // Validaciones
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, precio y categoría son obligatorios'
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio debe ser mayor a 0'
      });
    }

    // Generar ID único
    const id = `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    await runQuery(`
      INSERT INTO menu_items (id, name, price, category, description, available)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, name, price, category, description, available ? 1 : 0]);

    const newItem = {
      id,
      name,
      price: parseFloat(price),
      category,
      description,
      available
    };

    // Emitir evento de Socket.IO
    req.io.emit('menu_item_created', newItem);

    res.status(201).json({
      success: true,
      message: 'Item creado exitosamente',
      data: newItem
    });

  } catch (error) {
    console.error('Error creando item del menú:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({
        success: false,
        message: 'Ya existe un item con ese ID'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
});

// PUT /api/menu/:id - Actualizar item
router.put('/:id', authenticateToken, requirePermission('menu', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, description, available } = req.body;

    // Verificar que el item existe
    const existingItem = await getQuery('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
    }

    // Validaciones
    if (price !== undefined && price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio debe ser mayor a 0'
      });
    }

    // Construir query de actualización dinámicamente
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (available !== undefined) updates.available = available ? 1 : 0;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    const updateFields = Object.keys(updates).map(key => `${key} = ?`);
    const updateValues = Object.values(updates);
    updateValues.push(id);

    const sql = `UPDATE menu_items SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await runQuery(sql, updateValues);

    // Obtener item actualizado
    const updatedItem = await getQuery('SELECT * FROM menu_items WHERE id = ?', [id]);
    
    const responseItem = {
      id: updatedItem.id,
      name: updatedItem.name,
      price: parseFloat(updatedItem.price),
      category: updatedItem.category,
      description: updatedItem.description,
      available: Boolean(updatedItem.available)
    };

    // Emitir evento de Socket.IO
    req.io.emit('menu_item_updated', responseItem);

    res.json({
      success: true,
      message: 'Item actualizado exitosamente',
      data: responseItem
    });

  } catch (error) {
    console.error('Error actualizando item del menú:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/menu/:id - Eliminar item (solo admin)
router.delete('/:id', authenticateToken, requirePermission('menu', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el item existe
    const existingItem = await getQuery('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
    }

    // Eliminar el item
    await runQuery('DELETE FROM menu_items WHERE id = ?', [id]);

    // Emitir evento de Socket.IO
    req.io.emit('menu_item_deleted', { id });

    res.json({
      success: true,
      message: 'Item eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando item del menú:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/menu/:id/toggle - Cambiar disponibilidad del item
router.post('/:id/toggle', authenticateToken, requirePermission('menu', 'update'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el item existe
    const existingItem = await getQuery('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
    }

    // Cambiar disponibilidad
    const newAvailability = !existingItem.available;
    await runQuery(
      'UPDATE menu_items SET available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newAvailability ? 1 : 0, id]
    );

    // Obtener item actualizado
    const updatedItem = await getQuery('SELECT * FROM menu_items WHERE id = ?', [id]);
    
    const responseItem = {
      id: updatedItem.id,
      name: updatedItem.name,
      price: parseFloat(updatedItem.price),
      category: updatedItem.category,
      description: updatedItem.description,
      available: Boolean(updatedItem.available)
    };

    // Emitir evento de Socket.IO
    req.io.emit('menu_item_updated', responseItem);

    res.json({
      success: true,
      message: `Item ${newAvailability ? 'activado' : 'desactivado'} exitosamente`,
      data: responseItem
    });

  } catch (error) {
    console.error('Error cambiando disponibilidad del item:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;