// Tipos de autenticación y roles
export type UserRole = 'admin' | 'personal';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Permisos detallados por rol
export interface Permission {
  resource: string;
  actions: string[];
}

export const PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Pedidos - Control total
    { resource: 'orders', actions: ['create', 'read', 'update', 'delete', 'modify_status'] },
    
    // Menú - Control total
    { resource: 'menu', actions: ['create', 'read', 'update', 'delete', 'modify_prices', 'toggle_availability'] },
    
    // Reportes - Acceso completo
    { resource: 'reports', actions: ['read', 'export', 'view_all_periods', 'view_employee_performance'] },
    
    // Configuración - Solo admin
    { resource: 'settings', actions: ['read', 'update', 'manage_users', 'backup_restore'] },
    
    // Sistema - Solo admin
    { resource: 'system', actions: ['manage_shifts', 'view_logs', 'system_config'] },
    
    // Datos financieros - Solo admin
    { resource: 'financial', actions: ['view_sales', 'manage_payments', 'view_detailed_stats'] }
  ],
  
  personal: [
    // Pedidos - Solo operaciones básicas
    { resource: 'orders', actions: ['create', 'read', 'update', 'modify_status'] },
    
    // Menú - Solo lectura
    { resource: 'menu', actions: ['read'] },
    
    // Reportes - Básicos
    { resource: 'reports', actions: ['read', 'view_daily'] },
    
    // Sin acceso a configuración, sistema o datos financieros detallados
  ]
};

// Función helper para verificar permisos
export const hasPermission = (userRole: UserRole, resource: string, action: string): boolean => {
  const rolePermissions = PERMISSIONS[userRole];
  const resourcePermission = rolePermissions.find(p => p.resource === resource);
  return resourcePermission?.actions.includes(action) || false;
};

// Datos de usuarios predefinidos (en producción vendrían de la base de datos)
export const DEFAULT_USERS: User[] = [
  {
    id: 'admin-001',
    username: 'gerente',
    name: 'Gerente General',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'personal-001',
    username: 'personal',
    name: 'Personal de Caja',
    role: 'personal',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Credenciales predefinidas (en producción se encriptarían)
export const DEFAULT_CREDENTIALS = {
  'gerente': 'admin123',
  'personal': 'mambos123'
};
