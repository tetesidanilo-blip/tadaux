import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProfileData {
  id: string;
  full_name: string | null;
  subscription_tier: 'free' | 'pro' | 'business';
  credits: number;
  interests: string[];
  age_range: string | null;
  country: string | null;
  available_for_research: boolean;
  profile_completed: boolean;
  surveys_created_count: number;
  total_responses_collected: number;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string | null;
  profile_fields_rewarded: any;
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<ProfileData | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as ProfileData;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // Cache per 1 minuto
  });
};
