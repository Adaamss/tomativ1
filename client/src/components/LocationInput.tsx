import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: any;
}

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
}

export default function LocationInput({ 
  value, 
  onChange, 
  placeholder = "Chercher une adresse en Tunisie...",
  onLocationSelect 
}: LocationInputProps) {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const searchLocation = async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&countrycodes=tn&limit=5&accept-language=fr,ar,en`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Tomati-Marketplace/1.0'
        }
      });
      
      const data: LocationResult[] = await response.json();
      setResults(data);
      setShowResults(data.length > 0);
    } catch (error) {
      console.error('Erreur de recherche:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        searchLocation(value.trim());
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value]);

  const handleSelectLocation = (location: LocationResult) => {
    onChange(location.display_name);
    setShowResults(false);
    
    if (onLocationSelect) {
      onLocationSelect({
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lon),
        address: location.display_name
      });
    }
  };

  const clearInput = () => {
    onChange('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          onFocus={() => {
            if (results.length > 0) setShowResults(true);
          }}
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearInput}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((location) => (
            <button
              key={location.place_id}
              onClick={() => handleSelectLocation(location)}
              className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors focus:outline-none focus:bg-blue-50"
            >
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {location.display_name}
                  </p>
                  {location.address && (
                    <p className="text-xs text-gray-500 mt-1">
                      {[location.address.city, location.address.state, location.address.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && !loading && value.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-center text-gray-500">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Aucune adresse trouvée</p>
            <p className="text-xs mt-1">Essayez avec une autre recherche</p>
          </div>
        </div>
      )}
    </div>
  );
}