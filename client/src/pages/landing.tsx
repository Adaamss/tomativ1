import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">T</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Tomati</h1>
            <p className="text-xs text-muted-foreground">Marketplace Tunisien</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-8">
            <span className="text-white text-3xl font-bold">T</span>
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Bienvenue sur Tomati
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8">
            Le marketplace tunisien pour acheter et vendre en toute confiance
          </p>
          
          <Card className="max-w-md mx-auto mb-8">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">Voitures</h3>
                    <p className="text-sm text-muted-foreground">Achetez et vendez des véhicules</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">Immobilier</h3>
                    <p className="text-sm text-muted-foreground">Trouvez votre maison idéale</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0V6a2 2 0 00-2 2v6.002" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">Emploi</h3>
                    <p className="text-sm text-muted-foreground">Découvrez des opportunités</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Button 
            onClick={() => window.location.href = '/login'}
            className="bg-primary hover:bg-red-600 text-white px-8 py-3 text-lg"
            data-testid="button-login"
          >
            Se connecter pour commencer
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-4 text-center mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center space-x-6 text-sm text-muted-foreground mb-2">
            <span>Immobilier</span>
            <span>Voitures</span>
            <span>Accueil</span>
            <span>Catégories</span>
            <span>FAQ</span>
            <span>À propos</span>
            <span>Sécurité</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center text-sm text-muted-foreground">
            <p>&copy; 2024 Tomati. Tous droits réservés.</p>
            <p className="flex items-center">
              Made with <span className="text-red-500 mx-1">❤️</span> in Tunisia
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
