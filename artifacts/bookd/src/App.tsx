import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AnimatePresence } from "framer-motion";
import { UserRole } from "@workspace/api-client-react";

// Layout
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProtectedRoute } from "@/components/layout/protected-route";

// Pages
import NotFound from "@/pages/not-found";
import { LandingPage } from "@/pages/landing";
import { LoginPage } from "@/pages/auth/login";
import { RegisterPage } from "@/pages/auth/register";
import { ServicesPage } from "@/pages/services";
import { ServiceDetailPage } from "@/pages/services/detail";
import { CustomerDashboardPage } from "@/pages/dashboard/customer";
import { ProviderDashboardPage } from "@/pages/dashboard/provider";
import { ManageAvailabilityPage } from "@/pages/dashboard/availability";
import { ProfilePage } from "@/pages/profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          <Switch>
            <Route path="/" component={LandingPage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/register" component={RegisterPage} />
            <Route path="/services" component={ServicesPage} />
            <Route path="/services/:id" component={ServiceDetailPage} />
            
            <Route path="/dashboard">
              <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
                <CustomerDashboardPage />
              </ProtectedRoute>
            </Route>
            
            <Route path="/provider/dashboard">
              <ProtectedRoute allowedRoles={[UserRole.PROVIDER]}>
                <ProviderDashboardPage />
              </ProtectedRoute>
            </Route>
            
            <Route path="/provider/availability">
              <ProtectedRoute allowedRoles={[UserRole.PROVIDER]}>
                <ManageAvailabilityPage />
              </ProtectedRoute>
            </Route>
            
            <Route path="/profile">
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            </Route>
            
            <Route component={NotFound} />
          </Switch>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
