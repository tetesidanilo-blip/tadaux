import { useState } from "react";
import { Hero } from "@/components/Hero";
import { SurveyGenerator } from "@/components/SurveyGenerator";

const Index = () => {
  const [showGenerator, setShowGenerator] = useState(false);

  if (showGenerator) {
    return <SurveyGenerator onBack={() => setShowGenerator(false)} />;
  }

  return <Hero onGetStarted={() => setShowGenerator(true)} />;
};

export default Index;
