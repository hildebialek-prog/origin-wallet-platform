import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import Personal from "./pages/Personal";
import Business from "./pages/Business";
import Pricing from "./pages/Pricing";
import Security from "./pages/Security";
import Help from "./pages/Help";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Policies from "./pages/Policies";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import AccountLayout from "@/components/layout/AccountLayout";
import AccountDashboard from "./pages/account/AccountDashboard";
import AccountPlaceholder from "./pages/account/AccountPlaceholder";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/personal" element={<Personal />} />
                <Route path="/business" element={<Business />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/security" element={<Security />} />
                <Route path="/help" element={<Help />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/policies" element={<Policies />} />
              </Route>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<AccountDashboard />} />
                <Route path="balances" element={<AccountPlaceholder title="Balances" />} />
                <Route path="transactions" element={<AccountPlaceholder title="Transactions" />} />
                <Route path="virtual-accounts" element={<AccountPlaceholder title="Virtual accounts" />} />
                <Route path="beneficiaries" element={<AccountPlaceholder title="Beneficiaries" />} />
                <Route path="team" element={<AccountPlaceholder title="Team" />} />
                <Route path="integrations" element={<AccountPlaceholder title="Integrations" />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
