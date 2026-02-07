import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgePage from "@/pages/forge";
import DashboardPage from "@/pages/dashboard";
import ToolsPage from "@/pages/tools";
import TemplatesPage from "@/pages/templates";
import HistoryPage from "@/pages/history";
import ArchivePage from "@/pages/archive";
import BillingPage from "@/pages/billing";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import AdminPage from "@/pages/admin";
import PricingPage from "@/pages/pricing";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to={`/login?redirect=${encodeURIComponent(location)}`} />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full deep-space-bg">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login">
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      </Route>
      <Route path="/register">
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/create">
        <ProtectedRoute>
          <AppLayout>
            <ForgePage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/forge">
        <ProtectedRoute>
          <AppLayout>
            <ForgePage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools">
        <ProtectedRoute>
          <AppLayout>
            <ToolsPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/templates">
        <ProtectedRoute>
          <AppLayout>
            <TemplatesPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/history">
        <ProtectedRoute>
          <AppLayout>
            <HistoryPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/archive">
        <ProtectedRoute>
          <AppLayout>
            <ArchivePage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/billing">
        <ProtectedRoute>
          <AppLayout>
            <BillingPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <AppLayout>
            <ProfilePage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <AppLayout>
            <SettingsPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute>
          <AppLayout>
            <AdminPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/pricing" component={PricingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
