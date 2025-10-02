import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-survey.jpg";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'var(--gradient-subtle)',
        }}
      />
      
      <div className="absolute inset-0 z-0 opacity-20">
        <img 
          src={heroImage} 
          alt="Survey creation interface" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="container relative z-10 px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span 
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'var(--gradient-primary)',
                }}
              >
                AI-Powered Survey Generator
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Transform your ideas or documents into professional Google Forms surveys in seconds. 
              Let AI do the heavy lifting.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              onClick={onGetStarted}
              className="text-lg px-8 py-6 relative overflow-hidden group"
              style={{
                background: 'var(--gradient-primary)',
                boxShadow: 'var(--shadow-glow)',
                transition: 'var(--transition-smooth)',
              }}
            >
              <span className="relative z-10">Get Started Free</span>
              <div 
                className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0"
                style={{
                  transition: 'var(--transition-smooth)',
                }}
              />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full max-w-4xl">
            <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">Generate complete surveys in seconds with AI</p>
            </div>

            <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Document to Survey</h3>
              <p className="text-muted-foreground">Upload Word or Google Docs to auto-generate surveys</p>
            </div>

            <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready for Google Forms</h3>
              <p className="text-muted-foreground">Export-ready format for seamless integration</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
