import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LangProvider } from "@/hooks/useLang";
import LoginPage from "./pages/LoginPage";
import GuestSite from "./pages/GuestSite";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * ROUTING LOGIC
 * /          → Login/Signup page (for everyone, first thing they see)
 * /home      → Guest site (rooms, reviews, reservation) — requires login
 * /admin     → Admin dashboard — requires admin role
 */

/** / — Login page. If already logged in, redirect to correct destination. */
const LoginRoute = () => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/home" replace />;
  return <LoginPage />;
};

/** /home — Guest site. Must be logged in (any role). */
const GuestRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/" replace />;
  return <GuestSite />;
};

/** /admin — Dashboard. Must be admin. */
const AdminRoute = () => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;
  return <AdminDashboard />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LangProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/"      element={<LoginRoute />} />
              <Route path="/home"  element={<GuestRoute />} />
              <Route path="/admin" element={<AdminRoute />} />
              <Route path="*"      element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </LangProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
