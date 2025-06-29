import React from 'react';
import { useAuth } from '../AuthContext';

interface PermissionGuardProps {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  role?: 'admin' | 'personal';
}

// Componente para proteger elementos basado en permisos
const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  resource, 
  action, 
  children, 
  fallback = null,
  role 
}) => {
  const { hasPermission, state } = useAuth();

  // Si se especifica un rol, verificar que el usuario lo tenga
  if (role && state.user?.role !== role) {
    return <>{fallback}</>;
  }

  // Verificar permisos específicos
  if (!hasPermission(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook personalizado para verificar permisos en componentes
export const usePermission = () => {
  const { hasPermission, isAdmin, isPersonal, getCurrentUser } = useAuth();

  return {
    hasPermission,
    isAdmin,
    isPersonal,
    getCurrentUser,
    // Helpers específicos para recursos comunes
    canDeleteOrders: () => hasPermission('orders', 'delete'),
    canModifyPrices: () => hasPermission('menu', 'modify_prices'),
    canViewReports: () => hasPermission('reports', 'read'),
    canManageSettings: () => hasPermission('settings', 'update'),
    canManageUsers: () => hasPermission('settings', 'manage_users'),
    canViewFinancialDetails: () => hasPermission('financial', 'view_detailed_stats'),
    canExportData: () => hasPermission('reports', 'export'),
    canManageMenu: () => hasPermission('menu', 'update'),
    canCreateOrders: () => hasPermission('orders', 'create'),
    canUpdateOrders: () => hasPermission('orders', 'update'),
    canViewOrders: () => hasPermission('orders', 'read')
  };
};

// Componente de botón con permisos
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  resource,
  action,
  children,
  fallback = null,
  className = '',
  ...buttonProps
}) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(resource, action)) {
    return <>{fallback}</>;
  }

  return (
    <button className={className} {...buttonProps}>
      {children}
    </button>
  );
};

// Componente para mostrar información solo a ciertos roles
interface RoleDisplayProps {
  allowedRoles: ('admin' | 'personal')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleDisplay: React.FC<RoleDisplayProps> = ({
  allowedRoles,
  children,
  fallback = null
}) => {
  const { state } = useAuth();

  if (!state.user || !allowedRoles.includes(state.user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
