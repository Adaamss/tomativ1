import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">T</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-title">
            Tomati
          </h1>
          <p className="text-xs text-muted-foreground">Marketplace Tunisien</p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" data-testid="button-menu">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => window.location.href = '/api/logout'}
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-account"
        >
          Mon compte
        </Button>
      </div>
    </header>
  );
}
