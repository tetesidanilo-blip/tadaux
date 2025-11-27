import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Languages, LogOut, LayoutDashboard, User, Crown, Zap, Users, MessageSquare, Store, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import tadauxLogo from "@/assets/tadaux-logo.png";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  const userTier = profile?.subscription_tier || 'free';
  const userCredits = profile?.credits || 0;

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  const tierConfig = {
    free: { label: "Free", icon: null, className: "" },
    pro: { label: "Pro", icon: Zap, className: "bg-primary text-primary-foreground" },
    business: { label: "Business", icon: Crown, className: "bg-gradient-to-r from-purple-600 to-pink-600 text-white" },
  };

  const currentTierConfig = tierConfig[userTier];
  const TierIcon = currentTierConfig.icon;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={tadauxLogo} alt="TaDaUX Logo" className="h-8 w-8" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              TaDaUX
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "it" : "en")}
              className="flex items-center gap-2"
            >
              <Languages className="w-4 h-4" />
              {language === "en" ? "IT" : "EN"}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-between gap-2 p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.email}</p>
                      <Badge className={currentTierConfig.className} variant={userTier === 'free' ? 'outline' : 'default'}>
                        {TierIcon && <TierIcon className="w-3 h-3 mr-1" />}
                        {currentTierConfig.label}
                      </Badge>
                    </div>
                    <CreditsDisplay credits={userCredits} />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>{t("dashboard")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/community")}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Community</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/community?tab=qshop")}>
                    <Store className="mr-2 h-4 w-4" />
                    <span>Q Shop</span>
                  </DropdownMenuItem>
                  {userTier === 'pro' && (
                    <DropdownMenuItem onClick={() => navigate("/my-templates")}>
                      <Briefcase className="mr-2 h-4 w-4" />
                      <span>My Templates</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/my-research-requests")}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>My Requests</span>
                  </DropdownMenuItem>
                  {userTier !== 'business' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setUpgradeDialogOpen(true)}>
                        <Crown className="mr-2 h-4 w-4" />
                        <span>Upgrade Plan</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("logout")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/auth")} variant="default" size="sm">
                {t("login")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <UpgradePlanDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        currentTier={userTier}
      />
    </nav>
  );
};
