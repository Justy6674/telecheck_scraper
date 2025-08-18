import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Verification from "./pages/Verification";
import ComplianceNotes from "./pages/ComplianceNotes";
import PracticeSettings from "./pages/PracticeSettings";
import DisasterMap from "./pages/DisasterMap";
import Analytics from "./pages/Analytics";
import TelehealthRules from "./pages/TelehealthRules";
import FAQ from "./pages/FAQ";
import AboutUs from "./pages/AboutUs";
import HowToUse from "./pages/HowToUse";
import Subscribe from "./pages/Subscribe";
import Contact from "./pages/Contact";
import DataImport from "./pages/DataImport";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import HealthMonitoring from "./pages/admin/HealthMonitoring";
import ClientAnalytics from "./pages/admin/ClientAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/telehealth-rules" element={<TelehealthRules />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/how-to-use" element={<HowToUse />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/*"
              element={
                <SidebarProvider defaultOpen>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/verification" element={<Verification />} />
                        <Route path="/compliance" element={<ComplianceNotes />} />
                        <Route path="/settings" element={<PracticeSettings />} />
                        <Route path="/map" element={<DisasterMap />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/data-import" element={<DataImport />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/health" element={<HealthMonitoring />} />
                        <Route path="/admin/clients" element={<ClientAnalytics />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                  </div>
                </SidebarProvider>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
