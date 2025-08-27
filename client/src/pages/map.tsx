import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";

export default function Map() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-20">
        <div className="h-[calc(100vh-160px)] relative bg-blue-50 bg-opacity-50">
          {/* Map Container with Stylized Background */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="%23f0f0f0"><rect width="400" height="300" fill="%23e8f4fd"/><path d="M50 50 Q100 30 150 50 T250 50 Q300 40 350 60 L350 250 Q300 230 250 250 T150 250 Q100 260 50 240 Z" fill="%23b8e6b8"/><path d="M0 100 Q50 80 100 100 T200 100 Q250 90 300 110 L400 110 L400 200 Q350 180 300 200 T200 200 Q150 210 100 190 T0 190 Z" fill="%23f0e68c"/></svg>')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Location markers */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg animate-pulse" data-testid="map-marker-main">
                <span className="text-white text-xs font-bold">M</span>
              </div>
            </div>
            
            {/* Additional markers */}
            <div className="absolute top-1/3 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md" data-testid="map-marker-secondary">
                <span className="text-white text-xs">•</span>
              </div>
            </div>
            
            <div className="absolute top-2/3 right-1/4 transform translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md" data-testid="map-marker-tertiary">
                <span className="text-white text-xs">•</span>
              </div>
            </div>
            
            {/* Map controls */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2">
              <Button 
                size="icon"
                variant="outline"
                className="w-10 h-10 bg-white shadow-md hover:bg-gray-50"
                data-testid="button-zoom-in"
              >
                <span className="text-lg font-bold">+</span>
              </Button>
              <Button 
                size="icon"
                variant="outline"
                className="w-10 h-10 bg-white shadow-md hover:bg-gray-50"
                data-testid="button-zoom-out"
              >
                <span className="text-lg font-bold">−</span>
              </Button>
            </div>

            {/* Location Info Panel */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
                <h3 className="font-medium text-foreground mb-2">Tunis, Tunisie</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Explorez les annonces autour de vous
                </p>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Annonces disponibles</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
