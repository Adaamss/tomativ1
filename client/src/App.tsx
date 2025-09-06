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
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import Map from "@/pages/map";
import Messages from "@/pages/messages";
import Profile from "@/pages/profile";
import CreateListing from "@/pages/create-listing";
import AddListing from "@/pages/add-listing";
import EditListing from "@/pages/edit-listing";
import ProductDetail from "@/pages/product-detail";
import NotFound from "@/pages/not-found";

// Admin pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminListings from "@/pages/admin/Listings";
import AdminAdRequests from "@/pages/admin/AdRequests";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Initialize categories on app load
  useEffect(() => {
    apiRequest("GET", "/api/init").catch((error) => {
      console.error("Failed to initialize app:", error);
    });
  }, []);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/listing/:id" component={ProductDetail} />
      <Route path="/map" component={Map} />
      <Route path="/messages" component={Messages} />
      <Route path="/profile" component={Profile} />
      <Route path="/create-listing" component={CreateListing} />
      <Route path="/add-listing" component={AddListing} />
      <Route path="/edit-listing/:id" component={EditListing} />
      
      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/listings" component={AdminListings} />
      <Route path="/admin/ad-requests" component={AdminAdRequests} />
      
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
