import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import { Navbar } from "@/components/Navbar";
import { Crown, Zap, Check, X, Coins, TrendingUp } from "lucide-react";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { CreditHistory } from "@/components/CreditHistory";
import { BackupDatabaseCard } from "@/components/BackupDatabaseCard";
import { AdminBackupCard } from "@/components/AdminBackupCard";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQueryClient } from "@tanstack/react-query";

const COUNTRIES = ["Italy", "United States", "United Kingdom", "Germany", "France", "Spain", "Canada", "Australia", "Other"];
const INTEREST_OPTIONS = ["Gaming", "E-commerce", "B2B", "Healthcare", "Education", "Finance", "Travel", "Food & Beverage", "Technology", "Entertainment"];

interface ProfileData {
  full_name: string;
  subscription_tier: 'free' | 'pro' | 'business';
  subscription_expires_at: string | null;
  interests: string[];
  age_range: string | null;
  country: string | null;
  available_for_research: boolean;
  profile_completed: boolean;
}

export default function Profile() {
  const { user } = useAuth();
  const { data: contextProfile } = useProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const [loading, setLoading] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    subscription_tier: "free",
    subscription_expires_at: null,
    interests: [],
    age_range: null,
    country: null,
    available_for_research: false,
    profile_completed: false,
  });

  const maxInterests = profile.subscription_tier === 'free' ? 3 : profile.subscription_tier === 'pro' ? 5 : 10;

  useEffect(() => {
    if (user) {
      loadCreditTransactions();
    }
  }, [user]);

  useEffect(() => {
    if (contextProfile) {
      const tier = contextProfile.subscription_tier as 'free' | 'pro' | 'business' || 'free';
      setProfile({
        full_name: contextProfile.full_name || "",
        subscription_tier: tier,
        subscription_expires_at: contextProfile.subscription_expires_at,
        interests: contextProfile.interests || [],
        age_range: contextProfile.age_range,
        country: contextProfile.country,
        available_for_research: contextProfile.available_for_research || false,
        profile_completed: contextProfile.profile_completed || false,
      });
    }
  }, [contextProfile]);

  const loadCreditTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) setTransactions(data);
  };

  const calculateCompletionPercentage = () => {
    let filled = 0;
    let total = 5;
    
    if (profile.full_name) filled++;
    if (profile.interests.length > 0) filled++;
    if (profile.country) filled++;
    if (profile.subscription_tier !== 'free' && profile.age_range) filled++;
    else if (profile.subscription_tier === 'free') total = 4;
    if (profile.available_for_research) filled++;

    return Math.round((filled / total) * 100);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);

    const updates = {
      id: user.id,
      full_name: profile.full_name,
      interests: profile.interests,
      age_range: profile.age_range,
      country: profile.country,
      available_for_research: profile.available_for_research,
      profile_completed: !!(profile.full_name && profile.interests.length > 0 && profile.country),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    }
  };

  const toggleInterest = (interest: string) => {
    if (profile.interests.includes(interest)) {
      setProfile({ ...profile, interests: profile.interests.filter(i => i !== interest) });
    } else {
      if (profile.interests.length < maxInterests) {
        setProfile({ ...profile, interests: [...profile.interests, interest] });
      } else {
        toast({
          title: "Interest limit reached",
          description: `You can select up to ${maxInterests} interests on the ${profile.subscription_tier} plan.`,
          variant: "destructive",
        });
      }
    }
  };

  const tierConfig = {
    free: { label: "Free", icon: null, color: "bg-muted text-muted-foreground" },
    pro: { label: "Pro", icon: Zap, color: "bg-primary text-primary-foreground" },
    business: { label: "Business", icon: Crown, color: "bg-gradient-to-r from-purple-600 to-pink-600 text-white" },
  };

  const currentTier = tierConfig[profile.subscription_tier];
  const TierIcon = currentTier.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Credits Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-500" />
                  I Tuoi Crediti
                </CardTitle>
                <CardDescription>Usa i crediti nel Q Shop</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <CreditsDisplay credits={contextProfile?.credits || 0} className="text-3xl" showTooltip={false} />
                </div>
                
                <div className="space-y-2 pt-4 border-t">
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Come Guadagnare Crediti:
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• 10 crediti: Registrazione iniziale</li>
                    <li>• 10 crediti: Per ogni campo profilo completato</li>
                    <li>• 10-20 crediti: Template utilizzato da altri</li>
                  </ul>
                </div>

                {transactions.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <p className="font-semibold text-sm">Ultime Transazioni:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between items-start text-xs p-2 rounded bg-muted/50">
                          <div className="flex-1">
                            <p className="font-medium">{tx.description}</p>
                            <p className="text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={tx.amount > 0 ? "default" : "secondary"} className="text-xs">
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Subscription</CardTitle>
                <CardDescription>Current plan and benefits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Badge className={currentTier.color}>
                    {TierIcon && <TierIcon className="w-3 h-3 mr-1" />}
                    {currentTier.label}
                  </Badge>
                  {profile.subscription_expires_at && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Expires: {new Date(profile.subscription_expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <p className="font-semibold text-sm">Current Benefits:</p>
                  <ul className="space-y-1 text-sm">
                    {profile.subscription_tier === 'free' && (
                      <>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> 10 Surveys</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> 20 Responses</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> 3 Interests</li>
                        <li className="flex items-center gap-2"><X className="w-4 h-4 text-muted-foreground" /> Auto-matching</li>
                      </>
                    )}
                    {profile.subscription_tier === 'pro' && (
                      <>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Unlimited Surveys</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Unlimited Responses</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> 5 Interests</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Auto-matching (4 vars)</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> 50 Auto-invites</li>
                      </>
                    )}
                    {profile.subscription_tier === 'business' && (
                      <>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Everything in Pro</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> 10 Interests</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Advanced Matching</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Unlimited Invites</li>
                      </>
                    )}
                  </ul>
                </div>

                {profile.subscription_tier !== 'business' && (
                  <Button 
                    className="w-full" 
                    onClick={() => setUpgradeDialogOpen(true)}
                  >
                    {profile.subscription_tier === 'free' ? 'Upgrade to Pro' : 'Upgrade to Business'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Profile Form */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Complete Your Profile</CardTitle>
                <CardDescription>
                  Profile Completion: {calculateCompletionPercentage()}%
                </CardDescription>
                <Progress value={calculateCompletionPercentage()} className="mt-2" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Interests ({profile.interests.length}/{maxInterests})
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select topics you're interested in
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((interest) => (
                      <Badge
                        key={interest}
                        variant={profile.interests.includes(interest) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                        {profile.interests.includes(interest) && " ✓"}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ageRange">
                    Age Range {profile.subscription_tier === 'free' && "(Pro+ only)"}
                  </Label>
                  <Select
                    value={profile.age_range || ""}
                    onValueChange={(value) => setProfile({ ...profile, age_range: value })}
                    disabled={profile.subscription_tier === 'free'}
                  >
                    <SelectTrigger id="ageRange">
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18-24">18-24</SelectItem>
                      <SelectItem value="25-34">25-34</SelectItem>
                      <SelectItem value="35-44">35-44</SelectItem>
                      <SelectItem value="45-54">45-54</SelectItem>
                      <SelectItem value="55-64">55-64</SelectItem>
                      <SelectItem value="65+">65+</SelectItem>
                    </SelectContent>
                  </Select>
                  {profile.subscription_tier === 'free' && (
                    <p className="text-sm text-muted-foreground">
                      Upgrade to Pro to unlock age range selection
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={profile.country || ""}
                    onValueChange={(value) => setProfile({ ...profile, country: value })}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="available">Available for Research</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow researchers to find and invite you to participate in UX research
                    </p>
                  </div>
                  <Switch
                    id="available"
                    checked={profile.available_for_research}
                    onCheckedChange={(checked) =>
                      setProfile({ ...profile, available_for_research: checked })
                    }
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={loading} className="w-full">
                  {loading ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Backup Database Section */}
          <div className="mt-8">
            <div className="grid gap-6">
              <BackupDatabaseCard />
              {!isAdminLoading && isAdmin && <AdminBackupCard />}
            </div>
          </div>

          {/* Credit History Section */}
          <div className="mt-8">
            {user && <CreditHistory userId={user.id} />}
          </div>
        </div>
      </div>

      <UpgradePlanDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        currentTier={profile.subscription_tier}
      />
    </div>
  );
}
