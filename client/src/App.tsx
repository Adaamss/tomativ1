import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Map from "@/pages/map";
import Messages from "@/pages/messages";
import Profile from "@/pages/profile";
import CreateListing from "@/pages/create-listing";
import ProductDetail from "@/pages/product-detail";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Initialize categories on app load
  useEffect(() => {
    apiRequest("GET", "/api/init").catch(console.error);
  }, []);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/listing/:id" component={ProductDetail} />
      <Route path="/map" component={Map} />
      <Route path="/messages" component={Messages} />
      <Route path="/profile" component={Profile} />
      <Route path="/create-listing" component={CreateListing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
