// Exportaciones principales de autenticación
export { AuthProvider, useAuth } from './AuthContext';
export { default as LoginForm } from './components/LoginForm';
export { default as ProtectedRoute } from './components/ProtectedRoute';
export { 
  default as PermissionGuard, 
  PermissionButton, 
  RoleDisplay, 
  usePermission 
} from './components/PermissionGuard';

// Exportar tipos
export type { 
  User, 
  UserRole, 
  LoginCredentials, 
  AuthState, 
  Permission 
} from './types';

// Exportar utilidades
export { hasPermission, PERMISSIONS, DEFAULT_USERS } from './types';
