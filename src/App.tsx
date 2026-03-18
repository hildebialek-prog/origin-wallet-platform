import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
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
import AccountBalances from "./pages/account/AccountBalances";
import AccountTransactions from "./pages/account/AccountTransactions";
import AccountVirtualAccounts from "./pages/account/AccountVirtualAccounts";
import AccountBeneficiaries from "./pages/account/AccountBeneficiaries";
import AccountTeam from "./pages/account/AccountTeam";
import AccountIntegrations from "./pages/account/AccountIntegrations";
import AccountSettings from "./pages/account/AccountSettings";
import AccountVirtualAccountRequest from "./pages/account/AccountVirtualAccountRequest";
import AccountProfile from "./pages/account/AccountProfile";
import AccountPassword from "./pages/account/AccountPassword";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <LanguageProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                  <Route path="balances" element={<AccountBalances />} />
                  <Route path="transactions" element={<AccountTransactions />} />
                  <Route path="virtual-accounts" element={<AccountVirtualAccounts />} />
                  <Route path="virtual-accounts/request" element={<AccountVirtualAccountRequest />} />
                  <Route path="beneficiaries" element={<AccountBeneficiaries />} />
                  <Route path="team" element={<AccountTeam />} />
                  <Route path="integrations" element={<AccountIntegrations />} />
                  <Route path="settings">
                    <Route index element={<AccountSettings />} />
                    <Route path="general" element={<AccountSettings />} />
                    <Route path="security" element={<AccountSettings />} />
                    <Route path="profile" element={<AccountProfile />} />
                    <Route path="password" element={<AccountPassword />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
