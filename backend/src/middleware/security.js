import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * Middleware de seguridad avanzado para Mambos
 * Protege contraseñas, datos sensibles y previene ataques
 */

// === CONFIGURACIÓN DE ENCRIPTACIÓN ===
const ENCRYPTION_KEY = process.env.CRYPTO_KEY || crypto.randomBytes(32);
const ALGORITHM = process.env.AES_ALGORITHM || 'aes-256-gcm';

// === FUNCIONES DE ENCRIPTACIÓN ===
export const encrypt = (text) => {
  if (!text) return null;
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Error encriptando:', error);
    return null;
  }
};

export const decrypt = (encryptedData) => {
  if (!encryptedData || !encryptedData.encrypted) return null;
  
  try {
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error desencriptando:', error);
    return null;
  }
};

// === HASH DE CONTRASEÑAS SEGURO ===
export const hashPassword = async (password) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcryptjs.hash(password, rounds);
};

export const comparePassword = async (password, hash) => {
  return await bcryptjs.compare(password, hash);
};

// === VALIDACIÓN DE CONTRASEÑAS FUERTES ===
export const validatePassword = (password) => {
  const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;
  const requireStrong = process.env.REQUIRE_STRONG_PASSWORD === 'true';
  
  if (password.length < minLength) {
    return {
      valid: false,
      message: `La contraseña debe tener al menos ${minLength} caracteres`
    };
  }
  
  if (requireStrong) {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpper || !hasLower || !hasNumbers || !hasSpecial) {
      return {
        valid: false,
        message: 'La contraseña debe contener mayúsculas, minúsculas, números y símbolos'
      };
    }
  }
  
  return { valid: true };
};

// === SANITIZACIÓN DE DATOS ===
export const sanitizeUserInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+\s*=/gi, '') // Remover event handlers
    .trim();
};

// === OFUSCACIÓN DE DATOS SENSIBLES ===
export const obfuscateSensitiveData = (data) => {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'pin', 'ssn', 
    'creditCard', 'cvv', 'accountNumber', 'taxId'
  ];
  
  if (typeof data !== 'object' || data === null) return data;
  
  const obfuscated = { ...data };
  
  Object.keys(obfuscated).forEach(key => {
    const lowercaseKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => 
      lowercaseKey.includes(field.toLowerCase())
    );
    
    if (isSensitive && obfuscated[key]) {
      if (typeof obfuscated[key] === 'string') {
        obfuscated[key] = '*'.repeat(obfuscated[key].length);
      } else {
        obfuscated[key] = '[HIDDEN]';
      }
    }
  });
  
  return obfuscated;
};

// === MIDDLEWARE DE AUTENTICACIÓN SEGURA ===
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Log de acceso seguro (sin datos sensibles)
    console.log(`Acceso autorizado - Usuario: ${decoded.id} - IP: ${req.ip}`);
    
    next();
  } catch (error) {
    console.error('Token inválido:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

// === MIDDLEWARE DE ROLES Y PERMISOS ===
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`Acceso denegado - Usuario: ${req.user.id} - Rol: ${req.user.role} - Requerido: ${allowedRoles}`);
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes'
      });
    }
    
    next();
  };
};

// === RATE LIMITING AVANZADO ===
export const createRateLimit = (options = {}) => {
  const {
    windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message = 'Demasiadas solicitudes, intenta más tarde',
    skipSuccessfulRequests = process.env.RATE_LIMIT_SKIP_SUCCESS === 'true'
  } = options;
  
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // Rate limit por IP y usuario si está logueado
    keyGenerator: (req) => {
      return req.user ? `${req.ip}-${req.user.id}` : req.ip;
    }
  });
};

// === HELMET CONFIGURACIÓN SEGURA ===
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// === LOGGING SEGURO ===
export const secureLogger = (req, res, next) => {
  if (process.env.LOG_SENSITIVE_DATA !== 'true') {
    // Crear copia de req sin datos sensibles
    const safeReq = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    // Agregar usuario si está autenticado (sin datos sensibles)
    if (req.user) {
      safeReq.user = {
        id: req.user.id,
        role: req.user.role
      };
    }
    
    console.log('Request:', safeReq);
  }
  
  next();
};

// === VALIDACIÓN DE ORIGEN ===
export const validateOrigin = (req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  const origin = req.get('Origin');
  
  if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin)) {
    console.warn(`Origen no permitido: ${origin} - IP: ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido'
    });
  }
  
  next();
};

// === PROTECCIÓN CONTRA ATAQUES DE TIMING ===
export const constantTimeResponse = async (actualCheck, dummyCheck) => {
  const [result1, result2] = await Promise.all([
    actualCheck(),
    dummyCheck()
  ]);
  
  return result1;
};

// === AUDIT LOG ===
export const auditLog = (action, details) => {
  if (process.env.AUDIT_LOG_ENABLED === 'true') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details: obfuscateSensitiveData(details),
      ip: details.ip || 'unknown'
    };
    
    // En producción, esto se enviaría a un servicio de logging
    console.log('AUDIT:', logEntry);
  }
};

export default {
  encrypt,
  decrypt,
  hashPassword,
  comparePassword,
  validatePassword,
  sanitizeUserInput,
  obfuscateSensitiveData,
  authenticateToken,
  requireRole,
  createRateLimit,
  securityHeaders,
  secureLogger,
  validateOrigin,
  constantTimeResponse,
  auditLog
};
