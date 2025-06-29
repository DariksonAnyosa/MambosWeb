import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

/**
 * Inicializa la base de datos con datos de ejemplo
 * NO incluye datos reales de producción
 */

const createTablesAndSampleData = async () => {
  const dbPath = process.env.DB_PATH || './data/mambos.db';
  const dbDir = path.dirname(dbPath);

  // Crear directorio si no existe
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log('📦 Inicializando base de datos...');
  console.log('📁 Ruta:', dbPath);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    // === TABLA DE USUARIOS ===
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        role TEXT DEFAULT 'employee',
        is_active BOOLEAN DEFAULT 1,
        failed_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // === TABLA DE MENÚ ===
    await db.exec(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        available BOOLEAN DEFAULT 1,
        image_url TEXT,
        encrypted_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // === TABLA DE PEDIDOS ===
    await db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        table_number INTEGER,
        customer_name TEXT,
        items TEXT NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    // === TABLA DE SESIONES ACTIVAS (SOCKET.IO) ===
    await db.exec(`
      CREATE TABLE IF NOT EXISTS active_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        socket_id TEXT NOT NULL,
        connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // === DATOS DE EJEMPLO ===
    console.log('👤 Creando usuario administrador de ejemplo...');
    
    // Usuario admin de ejemplo (cambiar en producción)
    const adminPassword = await bcrypt.hash('admin123', 12);
    await db.run(`
      INSERT OR IGNORE INTO users (username, password_hash, name, email, role)
      VALUES (?, ?, ?, ?, ?)
    `, ['admin', adminPassword, 'Administrador', 'admin@example.com', 'admin']);

    // Usuario empleado de ejemplo
    const employeePassword = await bcrypt.hash('emp123', 12);
    await db.run(`
      INSERT OR IGNORE INTO users (username, password_hash, name, email, role)
      VALUES (?, ?, ?, ?, ?)
    `, ['empleado', employeePassword, 'Empleado Ejemplo', 'empleado@example.com', 'employee']);

    console.log('🍽️ Creando menú de ejemplo...');
    
    // Menú de ejemplo
    const menuItems = [
      {
        id: 'appetizer-001',
        name: 'Entrada Ejemplo',
        price: 12.50,
        category: 'Entradas',
        description: 'Deliciosa entrada de ejemplo'
      },
      {
        id: 'main-001', 
        name: 'Plato Principal Ejemplo',
        price: 25.00,
        category: 'Platos Principales',
        description: 'Exquisito plato principal de ejemplo'
      },
      {
        id: 'dessert-001',
        name: 'Postre Ejemplo',
        price: 8.75,
        category: 'Postres',
        description: 'Dulce postre de ejemplo'
      },
      {
        id: 'beverage-001',
        name: 'Bebida Ejemplo',
        price: 5.00,
        category: 'Bebidas',
        description: 'Refrescante bebida de ejemplo'
      }
    ];

    for (const item of menuItems) {
      await db.run(`
        INSERT OR IGNORE INTO menu_items (id, name, price, category, description)
        VALUES (?, ?, ?, ?, ?)
      `, [item.id, item.name, item.price, item.category, item.description]);
    }

    console.log('✅ Base de datos inicializada correctamente');
    console.log('');
    console.log('🔑 CREDENCIALES DE EJEMPLO:');
    console.log('   👤 Admin: admin / admin123');
    console.log('   👤 Empleado: empleado / emp123');
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambiar estas credenciales en producción');

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  } finally {
    await db.close();
  }
};

export { createTablesAndSampleData as createTables };

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createTablesAndSampleData().catch(console.error);
}
