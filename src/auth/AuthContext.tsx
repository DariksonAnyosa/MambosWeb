import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { User, AuthState, LoginCredentials, UserRole } from './types';
import { DEFAULT_USERS, DEFAULT_CREDENTIALS, hasPermission } from './types';

// Acciones del reducer
type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// Estado inicial
const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

// Reducer de autenticación
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
      
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
      
    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
      
    case 'LOGOUT':
      return {
        ...initialAuthState
      };
      
    case 'CLEAR_ERROR':
      return { ...state, error: null };
      
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      };
      
    default:
      return state;
  }
}

// Contexto de autenticación
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  hasPermission: (resource: string, action: string) => boolean;
  isAdmin: () => boolean;
  isPersonal: () => boolean;
  getCurrentUser: () => User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}

// Provider del contexto
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Cargar usuario guardado al iniciar
  useEffect(() => {
    const loadSavedUser = () => {
      try {
        const savedAuth = localStorage.getItem('mambos-auth');
        if (savedAuth) {
          const authData = JSON.parse(savedAuth);
          const user = DEFAULT_USERS.find(u => u.id === authData.userId);
          
          if (user && authData.timestamp && 
              Date.now() - authData.timestamp < 24 * 60 * 60 * 1000) { // 24 horas
            dispatch({ type: 'LOGIN_SUCCESS', payload: user });
          } else {
            localStorage.removeItem('mambos-auth');
          }
        }
      } catch (error) {
        console.error('Error cargando usuario guardado:', error);
        localStorage.removeItem('mambos-auth');
      }
    };

    loadSavedUser();
  }, []);

  // Guardar usuario en localStorage cuando cambie
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      const authData = {
        userId: state.user.id,
        timestamp: Date.now()
      };
      localStorage.setItem('mambos-auth', JSON.stringify(authData));
    } else {
      localStorage.removeItem('mambos-auth');
    }
  }, [state.isAuthenticated, state.user]);

  // Función de login
  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Validar credenciales
      const { username, password } = credentials;
      
      if (!username || !password) {
        throw new Error('Usuario y contraseña son obligatorios');
      }

      // Verificar usuario existe
      const user = DEFAULT_USERS.find(u => u.username === username);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña
      const expectedPassword = DEFAULT_CREDENTIALS[username as keyof typeof DEFAULT_CREDENTIALS];
      if (password !== expectedPassword) {
        throw new Error('Contraseña incorrecta');
      }

      // Verificar que el usuario esté activo
      if (!user.isActive) {
        throw new Error('Usuario desactivado. Contacte al administrador');
      }

      // Login exitoso
      const loggedUser: User = {
        ...user,
        lastLogin: new Date().toISOString()
      };

      dispatch({ type: 'LOGIN_SUCCESS', payload: loggedUser });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error de autenticación';
      dispatch({ type: 'LOGIN_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Función de logout
  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  // Limpiar errores
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Verificar permisos
  const checkPermission = (resource: string, action: string): boolean => {
    if (!state.user) return false;
    return hasPermission(state.user.role, resource, action);
  };

  // Helpers de rol
  const isAdmin = (): boolean => state.user?.role === 'admin';
  const isPersonal = (): boolean => state.user?.role === 'personal';
  const getCurrentUser = (): User | null => state.user;

  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    clearError,
    hasPermission: checkPermission,
    isAdmin,
    isPersonal,
    getCurrentUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
