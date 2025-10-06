import { useState } from "react";
import { Hero } from "@/components/Hero";
import { SurveyGenerator } from "@/components/SurveyGenerator";
import { LanguageProvider } from "@/contexts/LanguageContext";

const Index = () => {
  const [showGenerator, setShowGenerator] = useState(false);

  return (
    <LanguageProvider>
      {showGenerator ? (
        <SurveyGenerator onBack={() => setShowGenerator(false)} />
      ) : (
        <Hero onGetStarted={() => setShowGenerator(true)} />
      )}
    </LanguageProvider>
  );
};

export default Index;
