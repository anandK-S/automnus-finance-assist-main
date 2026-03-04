import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Forecasting from "./pages/Forecasting";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import Loans from "./pages/Loans";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AIChatBubble from "./components/AIChatBubble";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/forecasting" element={<Forecasting />} />
                      <Route path="/invoices" element={<Invoices />} />
                      <Route path="/expenses" element={<Expenses />} />
                      <Route path="/loans" element={<Loans />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                  <AIChatBubble />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
