import jwt from 'jsonwebtoken';
import { getQuery } from '../database/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mambos-secret-key-very-secure-2024';

// Middleware de autenticación
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de acceso requerido' 
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar usuario en la base de datos
    const user = await getQuery(
      'SELECT id, username, name, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    if (!user.is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario inactivo' 
      });
    }

    // Agregar usuario a la request
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Token expirado' 
      });
    }

    console.error('Error en autenticación:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Middleware para verificar rol de administrador
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Se requieren permisos de administrador' 
    });
  }
  next();
};

// Middleware para verificar permisos específicos
export const requirePermission = (resource, action) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    
    // Definir permisos (igual que en el frontend)
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

    const userPermissions = permissions[userRole];
    if (!userPermissions || !userPermissions[resource] || !userPermissions[resource].includes(action)) {
      return res.status(403).json({ 
        success: false, 
        message: `No tienes permisos para ${action} en ${resource}` 
      });
    }

    next();
  };
};

// Generar token JWT
export const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token válido por 7 días
  );
};

export default {
  authenticateToken,
  requireAdmin,
  requirePermission,
  generateToken
};
