import { useNavigate } from "react-router-dom";
import { Hero } from "@/components/Hero";
import { Navbar } from "@/components/Navbar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen">
        <Navbar />
        <Hero onGetStarted={handleGetStarted} />
      </div>
    </LanguageProvider>
  );
};

export default Index;
