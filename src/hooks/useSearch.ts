import { useState, useMemo } from 'react';
import { useDebounce } from './useDebounce';

interface SearchOptions {
  debounceDelay?: number;
  caseSensitive?: boolean;
  searchFields?: string[];
}

export function useSearch<T>(
  data: T[],
  options: SearchOptions = {}
) {
  const {
    debounceDelay = 300,
    caseSensitive = false,
    searchFields = []
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, debounceDelay);

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return data;
    }

    const term = caseSensitive 
      ? debouncedSearchTerm.trim()
      : debouncedSearchTerm.trim().toLowerCase();

    return data.filter(item => {
      // Si no se especifican campos, buscar en todos los campos string
      if (searchFields.length === 0) {
        return Object.values(item as any).some(value => {
          if (typeof value === 'string') {
            const searchValue = caseSensitive ? value : value.toLowerCase();
            return searchValue.includes(term);
          }
          return false;
        });
      }

      // Buscar solo en los campos especificados
      return searchFields.some(field => {
        const value = (item as any)[field];
        if (typeof value === 'string') {
          const searchValue = caseSensitive ? value : value.toLowerCase();
          return searchValue.includes(term);
        }
        return false;
      });
    });
  }, [data, debouncedSearchTerm, caseSensitive, searchFields]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
    clearSearch,
    isSearching: searchTerm !== debouncedSearchTerm
  };
}

// Hook específico para filtros múltiples
export function useFilters<T>() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const addFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const removeFilter = (key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const applyFilters = (data: T[]) => {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          return true;
        }

        const itemValue = (item as any)[key];
        
        // Para arrays, verificar si el valor está incluido
        if (Array.isArray(value)) {
          return value.includes(itemValue);
        }
        
        // Para strings, comparación exacta
        if (typeof value === 'string') {
          return itemValue === value;
        }
        
        // Para números, comparación exacta
        if (typeof value === 'number') {
          return itemValue === value;
        }
        
        // Para booleanos, comparación exacta
        if (typeof value === 'boolean') {
          return itemValue === value;
        }
        
        return itemValue === value;
      });
    });
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return {
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    applyFilters,
    hasActiveFilters
  };
}
