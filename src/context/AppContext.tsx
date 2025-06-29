import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Shift, YapeReturn } from '../types';
import { STORAGE_CONFIG } from '../constants';

// Estado simplificado del AppContext (solo datos que no están en otros contextos)
interface AppState {
  currentShift: Shift | null;
  yapeReturns: YapeReturn[];
  settings: {
    restaurantName: string;
    address: string;
    phone: string;
    taxId: string;
  };
  loading: boolean;
  error: string | null;
}

type AppAction = 
  | { type: 'LOAD_APP_DATA_START' }
  | { type: 'LOAD_APP_DATA_SUCCESS'; payload: Partial<AppState> }
  | { type: 'LOAD_APP_DATA_ERROR'; payload: string }
  | { type: 'START_SHIFT'; payload: { employee: string } }
  | { type: 'END_SHIFT' }
  | { type: 'ADD_YAPE_RETURN'; payload: YapeReturn }
  | { type: 'PROCESS_YAPE_RETURN'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> }
  | { type: 'CLEAR_ERROR' };

const initialAppState: AppState = {
  currentShift: null,
  yapeReturns: [],
  settings: {
    restaurantName: 'Mambos Restaurant',
    address: 'Av. Principal 123, Lima',
    phone: '+51 999 999 999',
    taxId: '20123456789'
  },
  loading: false,
  error: null
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_APP_DATA_START':
      return { ...state, loading: true, error: null };
    
    case 'LOAD_APP_DATA_SUCCESS':
      return { ...state, loading: false, ...action.payload };
    
    case 'LOAD_APP_DATA_ERROR':
      return { ...state, loading: false, error: action.payload };
    
    case 'START_SHIFT': {
      const newShift: Shift = {
        id: Date.now().toString(),
        startTime: new Date().toISOString(),
        employee: action.payload.employee,
        orders: [],
        totalSales: 0,
        isActive: true
      };
      return { ...state, currentShift: newShift };
    }
    
    case 'END_SHIFT': {
      if (!state.currentShift) return state;
      const updatedShift: Shift = {
        ...state.currentShift,
        endTime: new Date().toISOString(),
        isActive: false
      };
      return { ...state, currentShift: updatedShift };
    }
    
    case 'ADD_YAPE_RETURN':
      return {
        ...state,
        yapeReturns: [...state.yapeReturns, action.payload]
      };
    
    case 'PROCESS_YAPE_RETURN': {
      const updatedReturns = state.yapeReturns.map(yapeReturn =>
        yapeReturn.id === action.payload
          ? { ...yapeReturn, processed: true }
          : yapeReturn
      );
      return { ...state, yapeReturns: updatedReturns };
    }
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  // Gestión de turnos
  startShift: (employee: string) => void;
  endShift: () => void;
  // Gestión de vueltos Yape
  addYapeReturn: (orderId: string, amount: number) => void;
  processYapeReturn: (id: string) => void;
  // Configuración
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  // Utilidades
  clearError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de AppProvider');
  }
  return context;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  // Cargar datos de la aplicación al iniciar
  useEffect(() => {
    const loadAppData = async () => {
      try {
        dispatch({ type: 'LOAD_APP_DATA_START' });
        
        // Cargar turno actual
        const savedShift = localStorage.getItem(STORAGE_CONFIG.keys.shift);
        const currentShift = savedShift ? JSON.parse(savedShift) : null;
        
        // Cargar configuración
        const savedSettings = localStorage.getItem(STORAGE_CONFIG.keys.settings);
        const settings = savedSettings 
          ? { ...initialAppState.settings, ...JSON.parse(savedSettings) }
          : initialAppState.settings;

        dispatch({ 
          type: 'LOAD_APP_DATA_SUCCESS', 
          payload: { currentShift, settings } 
        });
      } catch (error) {
        console.error('Error cargando datos de la app:', error);
        dispatch({ type: 'LOAD_APP_DATA_ERROR', payload: 'Error al cargar datos' });
      }
    };

    loadAppData();
  }, []);

  // Guardar datos cuando cambien
  useEffect(() => {
    if (state.currentShift) {
      localStorage.setItem(STORAGE_CONFIG.keys.shift, JSON.stringify(state.currentShift));
    } else {
      localStorage.removeItem(STORAGE_CONFIG.keys.shift);
    }
  }, [state.currentShift]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CONFIG.keys.settings, JSON.stringify(state.settings));
  }, [state.settings]);

  // Funciones del contexto
  const startShift = (employee: string) => {
    dispatch({ type: 'START_SHIFT', payload: { employee } });
  };

  const endShift = () => {
    dispatch({ type: 'END_SHIFT' });
  };

  const addYapeReturn = (orderId: string, amount: number) => {
    const yapeReturn: YapeReturn = {
      id: Date.now().toString(),
      orderId,
      amount,
      timestamp: new Date().toISOString(),
      processed: false
    };
    dispatch({ type: 'ADD_YAPE_RETURN', payload: yapeReturn });
  };

  const processYapeReturn = (id: string) => {
    dispatch({ type: 'PROCESS_YAPE_RETURN', payload: id });
  };

  const updateSettings = (settings: Partial<AppState['settings']>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AppContextType = {
    state,
    startShift,
    endShift,
    addYapeReturn,
    processYapeReturn,
    updateSettings,
    clearError
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
