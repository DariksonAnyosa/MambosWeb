import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { MenuItem } from '../types';
import { STORAGE_CONFIG, MENU_CONFIG } from '../constants';

interface MenuState {
  items: MenuItem[];
  loading: boolean;
  error: string | null;
}

type MenuAction = 
  | { type: 'LOAD_MENU_START' }
  | { type: 'LOAD_MENU_SUCCESS'; payload: MenuItem[] }
  | { type: 'LOAD_MENU_ERROR'; payload: string }
  | { type: 'ADD_MENU_ITEM'; payload: MenuItem }
  | { type: 'UPDATE_MENU_ITEM'; payload: { id: string; updates: Partial<MenuItem> } }
  | { type: 'DELETE_MENU_ITEM'; payload: string }
  | { type: 'TOGGLE_ITEM_AVAILABILITY'; payload: string }
  | { type: 'CLEAR_ERROR' };

const initialMenuState: MenuState = {
  items: [],
  loading: false,
  error: null
};

function menuReducer(state: MenuState, action: MenuAction): MenuState {
  switch (action.type) {
    case 'LOAD_MENU_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_MENU_SUCCESS':
      return { ...state, loading: false, items: action.payload };
    case 'LOAD_MENU_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_MENU_ITEM':
      return { ...state, items: [...state.items, action.payload], error: null };
    case 'UPDATE_MENU_ITEM': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
      );
      return { ...state, items: updatedItems };
    }
    case 'DELETE_MENU_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload) };
    case 'TOGGLE_ITEM_AVAILABILITY': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload ? { ...item, available: !item.available } : item
      );
      return { ...state, items: updatedItems };
    }
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface MenuContextType {
  state: MenuState;
  addMenuItem: (itemData: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  toggleItemAvailability: (id: string) => Promise<void>;
  getMenuItemById: (id: string) => MenuItem | undefined;
  getItemsByCategory: (category: string) => MenuItem[];
  getAvailableItems: () => MenuItem[];
  getAllCategories: () => string[];
  clearError: () => void;
  resetToDefault: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu debe ser usado dentro de MenuProvider');
  }
  return context;
}

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(menuReducer, initialMenuState);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        dispatch({ type: 'LOAD_MENU_START' });
        const savedMenu = localStorage.getItem(STORAGE_CONFIG.keys.menu);
        
        if (savedMenu) {
          const menuItems = JSON.parse(savedMenu);
          if (Array.isArray(menuItems)) {
            dispatch({ type: 'LOAD_MENU_SUCCESS', payload: menuItems });
          } else {
            throw new Error('Formato de menú inválido');
          }
        } else {
          dispatch({ type: 'LOAD_MENU_SUCCESS', payload: getDefaultMenu() });
        }
      } catch (error) {
        console.error('Error cargando menú:', error);
        dispatch({ type: 'LOAD_MENU_ERROR', payload: 'Error al cargar el menú' });
        dispatch({ type: 'LOAD_MENU_SUCCESS', payload: getDefaultMenu() });
      }
    };

    loadMenu();
  }, []);

  useEffect(() => {
    if (state.items.length > 0) {
      try {
        localStorage.setItem(STORAGE_CONFIG.keys.menu, JSON.stringify(state.items));
      } catch (error) {
        console.error('Error guardando menú:', error);
      }
    }
  }, [state.items]);

  const addMenuItem = async (itemData: Omit<MenuItem, 'id'>) => {
    try {
      if (!itemData.name?.trim()) throw new Error('El nombre del item es obligatorio');
      if (!itemData.price || itemData.price <= 0) throw new Error('El precio debe ser mayor a 0');
      if (!itemData.category?.trim()) throw new Error('La categoría es obligatoria');

      const newItem: MenuItem = {
        ...itemData,
        id: Date.now().toString(),
        available: itemData.available ?? true
      };

      dispatch({ type: 'ADD_MENU_ITEM', payload: newItem });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al agregar item';
      dispatch({ type: 'LOAD_MENU_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    dispatch({ type: 'UPDATE_MENU_ITEM', payload: { id, updates } });
  };

  const deleteMenuItem = async (id: string) => {
    dispatch({ type: 'DELETE_MENU_ITEM', payload: id });
  };

  const toggleItemAvailability = async (id: string) => {
    dispatch({ type: 'TOGGLE_ITEM_AVAILABILITY', payload: id });
  };

  const getMenuItemById = (id: string): MenuItem | undefined => {
    return state.items.find(item => item.id === id);
  };

  const getItemsByCategory = (category: string): MenuItem[] => {
    return state.items.filter(item => item.category === category);
  };

  const getAvailableItems = (): MenuItem[] => {
    return state.items.filter(item => item.available);
  };

  const getAllCategories = (): string[] => {
    const categories = new Set(state.items.map(item => item.category));
    return Array.from(categories).sort();
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const resetToDefault = () => {
    dispatch({ type: 'LOAD_MENU_SUCCESS', payload: getDefaultMenu() });
  };

  const contextValue: MenuContextType = {
    state,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleItemAvailability,
    getMenuItemById,
    getItemsByCategory,
    getAvailableItems,
    getAllCategories,
    clearError,
    resetToDefault
  };

  return (
    <MenuContext.Provider value={contextValue}>
      {children}
    </MenuContext.Provider>
  );
}

function getDefaultMenu(): MenuItem[] {
  const menuItems: MenuItem[] = [];

  // Agregar alitas clásicas
  Object.entries(MENU_CONFIG.alitas.clasicas).forEach(([quantity, data]) => {
    menuItems.push({
      id: `alitas-clasicas-${quantity}`,
      name: data.name,
      price: data.price,
      category: 'alitas',
      available: true,
      description: `${quantity} piezas - ${data.sauces} salsa${data.sauces > 1 ? 's' : ''} incluida${data.sauces > 1 ? 's' : ''}`
    });
  });

  // Agregar alitas broaster
  Object.entries(MENU_CONFIG.alitas.broaster).forEach(([quantity, data]) => {
    menuItems.push({
      id: `alitas-broaster-${quantity}`,
      name: data.name,
      price: data.price,
      category: 'alitas',
      available: true,
      description: `${quantity} piezas - ${data.sauces} salsa${data.sauces > 1 ? 's' : ''} incluida${data.sauces > 1 ? 's' : ''}`
    });
  });

  // Agregar salchipapas
  MENU_CONFIG.salchipapas.forEach(item => {
    menuItems.push({
      id: item.id,
      name: item.name,
      price: item.price,
      category: 'salchipapas',
      available: true
    });
  });

  // Agregar extras
  MENU_CONFIG.extras.forEach(item => {
    menuItems.push({
      id: item.id,
      name: item.name,
      price: item.price,
      category: 'extras',
      available: true
    });
  });

  // Agregar bebidas
  MENU_CONFIG.bebidas.forEach(item => {
    menuItems.push({
      id: item.id,
      name: item.name,
      price: item.price,
      category: 'bebidas',
      available: true
    });
  });

  return menuItems;
}
