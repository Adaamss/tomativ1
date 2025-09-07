import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">T</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Tomati</h1>
          <p className="text-xs text-muted-foreground">Marketplace Tunisien</p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {!user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = "/login")}
          >
            Se connecter
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={logout}>
            Mon compte ({user.email})
          </Button>
        )}
      </div>
    </header>
  );
}
