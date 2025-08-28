import { useLocation } from "wouter";
import type { Category } from "@shared/schema";

interface CategoryOverlayProps {
  categories: Category[];
  onClose: () => void;
}

export default function CategoryOverlay({ categories, onClose }: CategoryOverlayProps) {
  const [, setLocation] = useLocation();

  const selectCategory = (categorySlug: string) => {
    onClose();
    if (categorySlug === 'voiture') {
      setLocation('/create-listing');
    } else {
      // TODO: Implement other category creation flows
      alert(`Création d'annonce pour ${categorySlug} - à implémenter`);
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center"
      onClick={handleBackgroundClick}
      data-testid="category-overlay"
    >
      <div className="bg-white rounded-t-2xl w-full max-w-md p-6 transform transition-transform">
        <div className="w-8 h-1 bg-secondary rounded-full mx-auto mb-6"></div>
        
        <div className="space-y-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => selectCategory(category.slug)}
              className="flex items-center space-x-4 w-full p-4 hover:bg-secondary rounded-lg transition-colors"
              data-testid={`category-option-${category.slug}`}
            >
              <div className={`w-10 h-10 bg-${category.color}-100 rounded-lg flex items-center justify-center`}>
                {category.slug === 'voiture' && (
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0" />
                  </svg>
                )}
                {category.slug === 'immobilier' && (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
                {category.slug === 'emploi' && (
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0V6a2 2 0 00-2 2v6.002" />
                  </svg>
                )}
                {category.slug === 'autre' && (
                  <svg className="w-5 h-5" style={{ color: '#f14247' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                )}
              </div>
              <span className="text-lg font-medium text-foreground">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
