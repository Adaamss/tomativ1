import { useState, useCallback } from 'react';

export interface ListingFilters {
  search?: string;
  category?: string;
  location?: string;
  sortBy?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
}

export function useListingFilters() {
  const [filters, setFilters] = useState<ListingFilters>({});
  
  const updateFilter = useCallback((key: keyof ListingFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);
  
  const applyFilters = useCallback((newFilters: Partial<ListingFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);
  
  // Construire les paramètres pour l'API
  const getQueryParams = useCallback(() => {
    const params: Record<string, string> = {};
    
    if (filters.search?.trim()) {
      params.search = filters.search.trim();
    }
    
    if (filters.category) {
      params.category = filters.category;
    }
    
    if (filters.location?.trim()) {
      params.location = filters.location.trim();
    }
    
    return params;
  }, [filters]);
  
  // Construire la query key pour TanStack Query
  const getQueryKey = useCallback(() => {
    const params = getQueryParams();
    return ['/api/listings', params];
  }, [getQueryParams]);
  
  return {
    filters,
    updateFilter,
    clearFilters,
    applyFilters,
    getQueryParams,
    getQueryKey
  };
}