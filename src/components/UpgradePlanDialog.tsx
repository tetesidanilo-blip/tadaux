import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: 'free' | 'pro' | 'business';
}

export function UpgradePlanDialog({ open, onOpenChange, currentTier }: UpgradePlanDialogProps) {
  const handleUpgrade = (tier: 'pro' | 'business') => {
    // Placeholder for future Stripe integration
    window.location.href = `mailto:sales@surveymaker.app?subject=Upgrade to ${tier === 'pro' ? 'Pro' : 'Business'} Plan&body=I would like to upgrade to the ${tier === 'pro' ? 'Pro (€49/month)' : 'Business (€99/month)'} plan.`;
  };

  const features = [
    {
      name: "Surveys",
      free: "10 surveys",
      pro: "Unlimited",
      business: "Unlimited",
    },
    {
      name: "Responses",
      free: "20 responses",
      pro: "Unlimited",
      business: "Unlimited",
    },
    {
      name: "Profile Interests",
      free: "3 interests",
      pro: "5 interests",
      business: "10 interests",
    },
    {
      name: "Auto-matching",
      free: false,
      pro: "4 variables, 50 invites",
      business: "Advanced, unlimited",
    },
    {
      name: "Age Range Filter",
      free: false,
      pro: true,
      business: true,
    },
    {
      name: "Gamification Badges",
      free: true,
      pro: true,
      business: true,
    },
    {
      name: "Advanced Analytics",
      free: false,
      pro: false,
      business: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
          <DialogDescription>
            Upgrade to unlock more features and grow your research
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {/* Free Plan */}
          <div className="border rounded-lg p-6 relative">
            {currentTier === 'free' && (
              <Badge className="absolute top-4 right-4">Current Plan</Badge>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-bold">Free</h3>
              <div className="text-3xl font-bold mt-2">€0</div>
              <p className="text-muted-foreground text-sm">Forever free</p>
            </div>
            <ul className="space-y-3 mb-6">
              {features.map((feature) => (
                <li key={feature.name} className="flex items-start gap-2 text-sm">
                  {typeof feature.free === 'boolean' ? (
                    feature.free ? (
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )
                  ) : (
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={typeof feature.free === 'boolean' && !feature.free ? "text-muted-foreground" : ""}>
                    <strong>{feature.name}:</strong>{" "}
                    {typeof feature.free === 'boolean' 
                      ? (feature.free ? "Yes" : "No")
                      : feature.free}
                  </span>
                </li>
              ))}
            </ul>
            <Button disabled={currentTier === 'free'} className="w-full" variant="outline">
              {currentTier === 'free' ? 'Current Plan' : 'Downgrade'}
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-primary rounded-lg p-6 relative shadow-lg">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
              <Zap className="w-3 h-3 mr-1" /> Most Popular
            </Badge>
            {currentTier === 'pro' && (
              <Badge className="absolute top-4 right-4">Current Plan</Badge>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-bold">Pro</h3>
              <div className="text-3xl font-bold mt-2">€49</div>
              <p className="text-muted-foreground text-sm">per month</p>
            </div>
            <ul className="space-y-3 mb-6">
              {features.map((feature) => (
                <li key={feature.name} className="flex items-start gap-2 text-sm">
                  {typeof feature.pro === 'boolean' ? (
                    feature.pro ? (
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )
                  ) : (
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={typeof feature.pro === 'boolean' && !feature.pro ? "text-muted-foreground" : ""}>
                    <strong>{feature.name}:</strong>{" "}
                    {typeof feature.pro === 'boolean' 
                      ? (feature.pro ? "Yes" : "No")
                      : feature.pro}
                  </span>
                </li>
              ))}
            </ul>
            <Button 
              disabled={currentTier === 'pro'} 
              className="w-full"
              onClick={() => handleUpgrade('pro')}
            >
              {currentTier === 'pro' ? 'Current Plan' : currentTier === 'business' ? 'Downgrade to Pro' : 'Upgrade to Pro'}
            </Button>
          </div>

          {/* Business Plan */}
          <div className="border rounded-lg p-6 relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            {currentTier === 'business' && (
              <Badge className="absolute top-4 right-4">Current Plan</Badge>
            )}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <h3 className="text-xl font-bold">Business</h3>
              </div>
              <div className="text-3xl font-bold mt-2">€99</div>
              <p className="text-muted-foreground text-sm">per month</p>
            </div>
            <ul className="space-y-3 mb-6">
              {features.map((feature) => (
                <li key={feature.name} className="flex items-start gap-2 text-sm">
                  {typeof feature.business === 'boolean' ? (
                    feature.business ? (
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )
                  ) : (
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={typeof feature.business === 'boolean' && !feature.business ? "text-muted-foreground" : ""}>
                    <strong>{feature.name}:</strong>{" "}
                    {typeof feature.business === 'boolean' 
                      ? (feature.business ? "Yes" : "No")
                      : feature.business}
                  </span>
                </li>
              ))}
            </ul>
            <Button 
              disabled={currentTier === 'business'} 
              className="w-full"
              onClick={() => handleUpgrade('business')}
            >
              {currentTier === 'business' ? 'Current Plan' : 'Upgrade to Business'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
