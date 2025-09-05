import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Home, Car, Briefcase, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaAction: () => void;
  backgroundColor: string;
  illustration: React.ReactNode;
}

interface HeroSliderProps {
  onOpenChat?: () => void;
}

export default function HeroSlider({ onOpenChat }: HeroSliderProps) {
  const [, navigate] = useLocation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const slides: SlideData[] = [
    {
      id: 1,
      title: "Bienvenue dans votre",
      subtitle: "nouveau quartier",
      description: "Achetez et vendez en toute confiance",
      ctaText: "Commencer",
      ctaAction: () => onOpenChat?.(),
      backgroundColor: "bg-gradient-to-br from-orange-100 to-yellow-100",
      illustration: (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative">
            {/* Maisons colorées */}
            <div className="flex space-x-2">
              <div className="w-16 h-16 bg-orange-400 rounded-t-lg relative">
                <div className="w-full h-4 bg-orange-600 rounded-t-lg"></div>
                <div className="absolute top-4 left-2 w-3 h-3 bg-yellow-300 rounded"></div>
                <div className="absolute top-4 right-2 w-3 h-3 bg-yellow-300 rounded"></div>
              </div>
              <div className="w-20 h-20 bg-red-400 rounded-t-lg relative">
                <div className="w-full h-5 bg-red-600 rounded-t-lg"></div>
                <div className="absolute top-5 left-3 w-3 h-3 bg-yellow-200 rounded"></div>
                <div className="absolute top-5 right-3 w-3 h-3 bg-yellow-200 rounded"></div>
              </div>
              <div className="w-14 h-14 bg-yellow-400 rounded-t-lg relative">
                <div className="w-full h-3 bg-yellow-600 rounded-t-lg"></div>
                <div className="absolute top-3 left-2 w-2 h-2 bg-orange-200 rounded"></div>
                <div className="absolute top-3 right-2 w-2 h-2 bg-orange-200 rounded"></div>
              </div>
            </div>
            {/* Arbres */}
            <div className="absolute -right-8 -top-4">
              <div className="w-6 h-12 bg-green-600 rounded-full"></div>
            </div>
            <div className="absolute -left-6 -top-2">
              <div className="w-4 h-8 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Vendez votre voiture",
      subtitle: "rapidement",
      description: "Trouvez des acheteurs sérieux près de chez vous",
      ctaText: "Vendre maintenant",
      ctaAction: () => onOpenChat?.(),
      backgroundColor: "bg-gradient-to-br from-blue-100 to-indigo-100",
      illustration: (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative">
            <Car className="w-24 h-24 text-blue-600" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">€</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Trouvez votre",
      subtitle: "maison idéale",
      description: "Parcourez les meilleures offres immobilières",
      ctaText: "Explorer",
      ctaAction: () => onOpenChat?.(),
      backgroundColor: "bg-gradient-to-br from-green-100 to-teal-100",
      illustration: (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative">
            <Home className="w-24 h-24 text-green-600" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">♥</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Opportunités",
      subtitle: "d'emploi",
      description: "Découvrez les postes qui vous correspondent",
      ctaText: "Voir les offres",
      ctaAction: () => onOpenChat?.(),
      backgroundColor: "bg-gradient-to-br from-purple-100 to-pink-100",
      illustration: (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative">
            <Briefcase className="w-24 h-24 text-purple-600" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">+</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const scrollPrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const scrollNext = () => {
    setSelectedIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const scrollTo = (index: number) => {
    setSelectedIndex(index);
  };

  useEffect(() => {
    // Auto-scroll
    const autoScroll = setInterval(() => {
      setSelectedIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 4000);

    return () => {
      clearInterval(autoScroll);
    };
  }, [slides.length]);

  return (
    <div className="relative overflow-hidden">
      <div className="relative w-full">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${selectedIndex * 100}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="w-full flex-shrink-0">
              <div className={`${slide.backgroundColor} min-h-[320px] md:min-h-[400px] px-4 py-8 md:py-12`}>
                <div className="max-w-6xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                    {/* Contenu texte */}
                    <div className="space-y-6 text-center md:text-left">
                      <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight">
                          {slide.title}
                        </h1>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight">
                          {slide.subtitle}
                        </h2>
                      </div>
                      <p className="text-lg md:text-xl text-gray-600 max-w-md mx-auto md:mx-0">
                        {slide.description}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                        <Button 
                          onClick={slide.ctaAction}
                          className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105"
                          data-testid={`cta-${slide.id}`}
                        >
                          {slide.ctaText}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => onOpenChat?.()}
                          className="border-gray-400 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg rounded-full"
                          data-testid="explore-button"
                        >
                          <Search className="w-5 h-5 mr-2" />
                          Explorer
                        </Button>
                      </div>
                    </div>

                    {/* Illustration */}
                    <div className="flex justify-center md:justify-end">
                      <div className="w-64 h-64 md:w-80 md:h-80">
                        {slide.illustration}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Boutons de navigation */}
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
        onClick={scrollPrev}
        data-testid="slider-prev"
      >
        <ChevronLeft className="w-6 h-6 text-gray-600" />
      </button>

      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
        onClick={scrollNext}
        data-testid="slider-next"
      >
        <ChevronRight className="w-6 h-6 text-gray-600" />
      </button>

      {/* Indicateurs */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === selectedIndex 
                ? 'bg-white shadow-lg scale-125' 
                : 'bg-white/50 hover:bg-white/70'
            }`}
            onClick={() => scrollTo(index)}
            data-testid={`slide-indicator-${index}`}
          />
        ))}
      </div>

      {/* Localisation rapide */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md z-10">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>Tunis, Tunisie</span>
        </div>
      </div>
    </div>
  );
}