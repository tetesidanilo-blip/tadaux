export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      community_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_link: string
          is_active: boolean
          member_count: number | null
          name: string
          platform: string
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_link: string
          is_active?: boolean
          member_count?: number | null
          name: string
          platform: string
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_link?: string
          is_active?: boolean
          member_count?: number | null
          name?: string
          platform?: string
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      participant_applications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          participant_id: string
          research_request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          participant_id: string
          research_request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          participant_id?: string
          research_request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_applications_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_applications_research_request_id_fkey"
            columns: ["research_request_id"]
            isOneToOne: false
            referencedRelation: "research_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_range: string | null
          available_for_research: boolean | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          interests: string[] | null
          profile_completed: boolean | null
          subscription_expires_at: string | null
          subscription_tier: string | null
          surveys_created_count: number | null
          total_responses_collected: number | null
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          available_for_research?: boolean | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          interests?: string[] | null
          profile_completed?: boolean | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          surveys_created_count?: number | null
          total_responses_collected?: number | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          available_for_research?: boolean | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          interests?: string[] | null
          profile_completed?: boolean | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          surveys_created_count?: number | null
          total_responses_collected?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      research_requests: {
        Row: {
          created_at: string
          current_participants: number
          deadline: string | null
          description: string | null
          id: string
          matching_enabled: boolean
          status: string
          survey_id: string | null
          target_age_ranges: string[] | null
          target_countries: string[] | null
          target_interests: string[] | null
          target_participants: number
          title: string
          topics: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_participants?: number
          deadline?: string | null
          description?: string | null
          id?: string
          matching_enabled?: boolean
          status?: string
          survey_id?: string | null
          target_age_ranges?: string[] | null
          target_countries?: string[] | null
          target_interests?: string[] | null
          target_participants?: number
          title: string
          topics?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_participants?: number
          deadline?: string | null
          description?: string | null
          id?: string
          matching_enabled?: boolean
          status?: string
          survey_id?: string | null
          target_age_ranges?: string[] | null
          target_countries?: string[] | null
          target_interests?: string[] | null
          target_participants?: number
          title?: string
          topics?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_requests_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          id: string
          responses: Json
          submitted_at: string
          survey_id: string
        }
        Insert: {
          id?: string
          responses: Json
          submitted_at?: string
          survey_id: string
        }
        Update: {
          id?: string
          responses?: Json
          submitted_at?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          description: string | null
          expired_message: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          language: string
          responses_public: boolean | null
          sections: Json
          share_token: string
          status: string
          title: string
          updated_at: string
          user_id: string
          visible_in_community: boolean | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          expired_message?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          language?: string
          responses_public?: boolean | null
          sections: Json
          share_token: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          visible_in_community?: boolean | null
        }
        Update: {
          created_at?: string
          description?: string | null
          expired_message?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          language?: string
          responses_public?: boolean | null
          sections?: Json
          share_token?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          visible_in_community?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
