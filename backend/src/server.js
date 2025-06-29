import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createTables } from './database/init.js';
import { setupSocketIO } from './socket/socketHandlers.js';

// Importar middleware de seguridad
import {
  securityHeaders,
  createRateLimit,
  secureLogger,
  validateOrigin,
  auditLog
} from './middleware/security.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import menuRoutes from './routes/menu.js';

// Configurar variables de entorno
dotenv.config();

const app = express();
const server = createServer(app);

// Configurar Socket.IO con CORS para internet
const allowedOrigins = process.env.FRONTEND_URL === '*' 
  ? true // Permitir cualquier origen (solo para desarrollo)
  : process.env.FRONTEND_URL.split(',').map(url => url.trim());

const io = new SocketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true // Compatibilidad con versiones anteriores
});

// Configuración del servidor
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// === MIDDLEWARES DE SEGURIDAD ===

// Headers de seguridad
app.use(securityHeaders);

// Validación de origen
app.use(validateOrigin);

// CORS para internet
const corsOrigins = process.env.FRONTEND_URL === '*' 
  ? true // Permitir cualquier origen (cuidado en producción)
  : process.env.FRONTEND_URL.split(',').map(url => url.trim());

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Rate limiting seguro
const limiter = createRateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: NODE_ENV === 'production' ? 100 : 1000,
  message: 'Demasiadas solicitudes, intenta más tarde'
});
app.use('/api/', limiter);

// Parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para agregar io a las requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Logging seguro de requests
app.use(secureLogger);

// === RUTAS ===

// Ruta de salud del servidor
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor Mambos funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);

// Ruta para estadísticas del servidor (solo desarrollo)
if (NODE_ENV === 'development') {
  app.get('/api/stats', (req, res) => {
    res.json({
      success: true,
      data: {
        connectedClients: io.engine.clientsCount,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  });
}

// === MANEJO DE ERRORES ===

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : error.message,
    ...(NODE_ENV === 'development' && { stack: error.stack })
  });
});

// === INICIALIZACIÓN DEL SERVIDOR ===

const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor Mambos...');
    
    // Inicializar base de datos
    console.log('📦 Inicializando base de datos...');
    await createTables();
    
    // Configurar Socket.IO
    console.log('🔌 Configurando Socket.IO...');
    setupSocketIO(io);
    
    // Iniciar servidor en todas las interfaces
    const HOST = process.env.HOST || '0.0.0.0';
    server.listen(PORT, HOST, () => {
      console.log('✅ ==========================================');
      console.log(`✅ 🎉 Servidor Mambos iniciado exitosamente`);
      console.log(`✅ 🌐 URL Local: http://localhost:${PORT}`);
      console.log(`✅ 🌍 URL Red: http://${HOST}:${PORT}`);
      console.log(`✅ 🔗 API: http://localhost:${PORT}/api`);
      console.log(`✅ 💚 Health: http://localhost:${PORT}/health`);
      console.log(`✅ 🔌 Socket.IO: Habilitado`);
      console.log(`✅ 🛡️  Entorno: ${NODE_ENV}`);
      console.log(`✅ 📅 Hora: ${new Date().toLocaleString('es-PE')}`);
      console.log('✅ ==========================================');
    });

    // Manejar señales del sistema
    process.on('SIGTERM', () => {
      console.log('📴 Recibida señal SIGTERM, cerrando servidor...');
      server.close(() => {
        console.log('🔐 Servidor cerrado correctamente');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📴 Recibida señal SIGINT (Ctrl+C), cerrando servidor...');
      server.close(() => {
        console.log('🔐 Servidor cerrado correctamente');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error fatal iniciando servidor:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesa rechazada no manejada:', reason);
  console.error('En promesa:', promise);
  process.exit(1);
});

// Iniciar servidor
startServer();

export default app;