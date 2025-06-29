import axios from 'axios';

// Configuración base de Axios con detección automática
const getBaseURL = () => {
  // Prioridad: Variable de entorno > IP de desarrollo > localhost
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Detectar si estamos en desarrollo local o en red
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  
  // Si estamos en otra IP, asumir que el backend está en la misma IP
  const protocol = window.location.protocol;
  const port = '3001';
  return `${protocol}//${hostname}:${port}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000, // Aumentado para conexiones más lentas
  headers: {
    'Content-Type': 'application/json',
  },
  // Configuración adicional para CORS
  withCredentials: false, // Cambiar a true si necesitas cookies
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Agregar token de autenticación si existe
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log de requests en desarrollo
    if (import.meta.env.DEV) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    // Log de responses en desarrollo
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.status} ${response.config.url}`, response.data);
    }
    
    return response;
  },
  (error) => {
    // Manejo de errores globales
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Token expirado o inválido
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          break;
        case 403:
          console.error('Acceso denegado');
          break;
        case 404:
          console.error('Recurso no encontrado');
          break;
        case 500:
          console.error('Error interno del servidor');
          break;
        default:
          console.error(`Error ${status}:`, data?.message || 'Error desconocido');
      }
    } else if (error.request) {
      console.error('Error de red - No se pudo conectar al servidor');
    } else {
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Tipos para respuestas de la API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Métodos helper para llamadas comunes
export const apiClient = {
  get: <T>(url: string, params?: any): Promise<ApiResponse<T>> =>
    api.get(url, { params }).then(response => response.data),
    
  post: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    api.post(url, data).then(response => response.data),
    
  put: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    api.put(url, data).then(response => response.data),
    
  patch: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    api.patch(url, data).then(response => response.data),
    
  delete: <T>(url: string): Promise<ApiResponse<T>> =>
    api.delete(url).then(response => response.data),
};

// Funciones utilitarias
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'Ha ocurrido un error inesperado';
};

export const buildQueryString = (params: Record<string, any>): string => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });
  
  return queryParams.toString();
};

// Configurar timeout personalizado para llamadas específicas
export const createApiClientWithTimeout = (timeout: number) => {
  return axios.create({
    ...api.defaults,
    timeout,
  });
};

// Cancelar requests
export const createCancelToken = () => {
  return axios.CancelToken.source();
};

export default api;
