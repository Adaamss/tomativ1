import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Search } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
  value?: string;
  latitude?: number;
  longitude?: number;
  onChange: (location: string, lat: number, lng: number) => void;
}

// Predefined Tunisia locations
const tunisianCities = [
  { name: "Tunis", lat: 36.8065, lng: 10.1815 },
  { name: "Sfax", lat: 34.7398, lng: 10.7603 },
  { name: "Sousse", lat: 35.8256, lng: 10.6369 },
  { name: "Kairouan", lat: 35.6811, lng: 10.0963 },
  { name: "Bizerte", lat: 37.2744, lng: 9.8739 },
  { name: "Gabès", lat: 33.8815, lng: 10.0982 },
  { name: "Ariana", lat: 36.8663, lng: 10.1647 },
  { name: "Gafsa", lat: 34.4250, lng: 8.7842 },
  { name: "Monastir", lat: 35.7773, lng: 10.8263 },
  { name: "Ben Arous", lat: 36.7539, lng: 10.2285 },
  { name: "Kasserine", lat: 35.1674, lng: 8.8363 },
  { name: "Medenine", lat: 33.3547, lng: 10.5055 },
  { name: "Nabeul", lat: 36.4561, lng: 10.7376 },
  { name: "Tataouine", lat: 32.9298, lng: 10.4517 },
  { name: "Beja", lat: 36.7256, lng: 9.1815 },
  { name: "Jendouba", lat: 36.5014, lng: 8.7800 },
  { name: "Mahdia", lat: 35.5047, lng: 11.0622 },
  { name: "Sidi Bouzid", lat: 35.0388, lng: 9.4842 },
  { name: "Siliana", lat: 36.0837, lng: 9.3704 },
  { name: "Kef", lat: 36.1741, lng: 8.7049 },
  { name: "Tozeur", lat: 33.9197, lng: 8.1339 },
  { name: "Kebili", lat: 33.7049, lng: 8.9692 },
  { name: "Zaghouan", lat: 36.4028, lng: 10.1426 },
  { name: "Manouba", lat: 36.8082, lng: 10.0954 }
];

// Component for handling map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({ value = "", latitude = 36.8065, longitude = 10.1815, onChange }: LocationPickerProps) {
  const [selectedPosition, setSelectedPosition] = useState<[number, number]>([latitude, longitude]);
  const [locationInput, setLocationInput] = useState(value);
  const [filteredCities, setFilteredCities] = useState(tunisianCities);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Update position when props change
  useEffect(() => {
    if (latitude && longitude) {
      setSelectedPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Update location input when value prop changes
  useEffect(() => {
    setLocationInput(value);
  }, [value]);

  const handleLocationInputChange = (inputValue: string) => {
    setLocationInput(inputValue);
    
    if (inputValue.length > 0) {
      const filtered = tunisianCities.filter(city =>
        city.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredCities(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredCities(tunisianCities);
      setShowSuggestions(false);
    }
  };

  const handleCitySelect = (city: typeof tunisianCities[0]) => {
    setLocationInput(city.name);
    setSelectedPosition([city.lat, city.lng]);
    setShowSuggestions(false);
    onChange(city.name, city.lat, city.lng);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
    // Try to find the closest city or use coordinates as location
    const closestCity = tunisianCities.reduce((closest, city) => {
      const distanceToCity = Math.sqrt(
        Math.pow(city.lat - lat, 2) + Math.pow(city.lng - lng, 2)
      );
      const distanceToClosest = Math.sqrt(
        Math.pow(closest.lat - lat, 2) + Math.pow(closest.lng - lng, 2)
      );
      return distanceToCity < distanceToClosest ? city : closest;
    });

    const distance = Math.sqrt(
      Math.pow(closestCity.lat - lat, 2) + Math.pow(closestCity.lng - lng, 2)
    );

    // If within ~10km of a known city, use that city name
    if (distance < 0.1) {
      setLocationInput(closestCity.name);
      onChange(closestCity.name, lat, lng);
    } else {
      // Use coordinates as location name
      const coordsLocation = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setLocationInput(coordsLocation);
      onChange(coordsLocation, lat, lng);
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          handleMapClick(lat, lng);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Impossible d'obtenir votre position. Veuillez sélectionner manuellement sur la carte.");
        }
      );
    } else {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-sm font-medium">
          <MapPin className="w-4 h-4 mr-2" />
          Sélectionner la localisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location input with autocomplete */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={locationInput}
              onChange={(e) => handleLocationInputChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Rechercher une ville ou cliquer sur la carte"
              className="pl-10"
            />
          </div>
          
          {/* City suggestions */}
          {showSuggestions && filteredCities.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredCities.slice(0, 8).map((city) => (
                <button
                  key={city.name}
                  onClick={() => handleCitySelect(city)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-2 text-gray-400" />
                    {city.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current location button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCurrentLocation}
          className="w-full"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Utiliser ma position actuelle
        </Button>

        {/* Map */}
        <div className="h-64 w-full rounded-lg overflow-hidden border">
          <MapContainer
            center={selectedPosition}
            zoom={8}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <Marker position={selectedPosition} />
            <MapClickHandler onLocationSelect={handleMapClick} />
          </MapContainer>
        </div>

        {/* Selected coordinates display */}
        <div className="text-xs text-muted-foreground text-center">
          Position: {selectedPosition[0].toFixed(4)}, {selectedPosition[1].toFixed(4)}
        </div>
      </CardContent>
    </Card>
  );
}

// Mini map component for displaying location
interface MiniMapProps {
  latitude: number;
  longitude: number;
  location?: string;
  className?: string;
}

export function MiniMap({ latitude, longitude, location, className = "h-32" }: MiniMapProps) {
  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-0 h-full">
        <div className="h-full w-full rounded-lg overflow-hidden">
          <MapContainer
            center={[latitude, longitude]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={false}
            touchZoom={false}
            doubleClickZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[latitude, longitude]} />
          </MapContainer>
        </div>
        {location && (
          <div className="p-2 bg-white border-t">
            <div className="flex items-center text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 mr-1" />
              {location}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}