import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import PublicSurvey from "./pages/PublicSurvey";
import SurveyResponses from "./pages/SurveyResponses";
import SurveyPreview from "./pages/SurveyPreview";
import Community from "./pages/Community";
import MyResearchRequests from "./pages/MyResearchRequests";
import MyTemplates from "./pages/MyTemplates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
              <Route path="/my-research-requests" element={<ProtectedRoute><MyResearchRequests /></ProtectedRoute>} />
              <Route path="/my-templates" element={<ProtectedRoute><MyTemplates /></ProtectedRoute>} />
              <Route path="/survey/:shareToken" element={<PublicSurvey />} />
              <Route path="/survey-preview/:id" element={<ProtectedRoute><SurveyPreview /></ProtectedRoute>} />
              <Route path="/survey-responses/:id" element={<ProtectedRoute><SurveyResponses /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
