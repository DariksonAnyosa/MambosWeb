import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getQuery, runQuery } from '../database/connection.js';
import { generateToken } from '../middleware/auth.js';
import {
  hashPassword,
  comparePassword,
  validatePassword,
  sanitizeUserInput,
  obfuscateSensitiveData,
  authenticateToken,
  createRateLimit,
  constantTimeResponse,
  auditLog
} from '../middleware/security.js';

const router = express.Router();

// Rate limiting para rutas de autenticación
const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por IP
  message: 'Demasiados intentos de login. Intenta en 15 minutos'
});

// Rate limiting para registro
const registerLimiter = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por IP por hora
  message: 'Demasiados registros. Intenta en 1 hora'
});

// Contador de intentos fallidos por IP
const failedAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar datos de entrada
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son obligatorios'
      });
    }

    // Buscar usuario en la base de datos
    const user = await getQuery(
      'SELECT id, username, name, password_hash, role, is_active FROM users WHERE username = ?',
      [username]
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
        message: 'Usuario desactivado'
      });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }

    // Actualizar último login
    await runQuery(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Generar token
    const token = generateToken(user);

    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          lastLogin: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/register - Registro SEGURO
router.post('/register', registerLimiter, async (req, res) => {
  const clientIP = req.ip;
  
  try {
    let { username, password, name, email, role = 'employee' } = req.body;

    // Sanitizar inputs
    username = sanitizeUserInput(username);
    name = sanitizeUserInput(name);
    email = sanitizeUserInput(email);
    role = sanitizeUserInput(role);

    // Validar datos requeridos
    if (!username || !password || !name) {
      auditLog('REGISTER_ATTEMPT_FAILED', {
        reason: 'Datos faltantes',
        username: username || 'unknown',
        ip: clientIP
      });
      
      return res.status(400).json({
        success: false,
        message: 'Usuario, contraseña y nombre son obligatorios'
      });
    }

    // Validar contraseña segura
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      auditLog('REGISTER_ATTEMPT_FAILED', {
        reason: 'Contraseña débil',
        username,
        ip: clientIP
      });
      
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await getQuery(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      auditLog('REGISTER_ATTEMPT_FAILED', {
        reason: 'Usuario ya existe',
        username,
        ip: clientIP
      });
      
      return res.status(409).json({
        success: false,
        message: 'Usuario o email ya existe'
      });
    }

    // Hash de la contraseña
    const passwordHash = await hashPassword(password);

    // Crear usuario
    const result = await runQuery(
      `INSERT INTO users (username, password_hash, name, email, role, is_active, created_at) 
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
      [username, passwordHash, name, email, role]
    );

    auditLog('USER_REGISTERED', {
      username,
      userId: result.lastID,
      role,
      ip: clientIP
    });

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: result.lastID,
          username,
          name,
          email,
          role
        }
      }
    });

  } catch (error) {
    console.error('Error en registro:', obfuscateSensitiveData(error));
    
    auditLog('REGISTER_ERROR', {
      error: error.message,
      ip: clientIP
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});
// POST /api/auth/logout - Cerrar sesión SEGURO
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    auditLog('USER_LOGOUT', {
      userId: req.user.id,
      username: req.user.username,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Logout exitoso'
    });

  } catch (error) {
    console.error('Error en logout:', obfuscateSensitiveData(error));
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getQuery(
      'SELECT id, username, name, role, is_active, created_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          isActive: user.is_active,
          createdAt: user.created_at,
          lastLogin: user.last_login
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo información del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/refresh - Renovar token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generar nuevo token
    const token = generateToken(req.user);

    res.json({
      success: true,
      data: { token }
    });

  } catch (error) {
    console.error('Error renovando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;
