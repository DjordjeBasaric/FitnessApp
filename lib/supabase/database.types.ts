/**
 * Supabase database tipovi. Manuelno pisani jer omogućavaju build bez aktivnog
 * Supabase projekta. Kada se projekat poveže, regenerisati sa:
 *   supabase gen types typescript --linked > lib/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_context: {
        Row: {
          user_id: string;
          allergies_or_avoid: string | null;
          dietary_note: string | null;
          age_years: number | null;
          sex: string | null;
          height_cm: number | null;
          sport_note: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          allergies_or_avoid?: string | null;
          dietary_note?: string | null;
          age_years?: number | null;
          sex?: string | null;
          height_cm?: number | null;
          sport_note?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_context"]["Insert"]>;
        Relationships: [];
      };
      daily_logs: {
        Row: {
          user_id: string;
          date: string;
          food_items: Json;
          cardio_sessions: Json;
          strength_blocks: Json;
          day_note: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          food_items?: Json;
          cardio_sessions?: Json;
          strength_blocks?: Json;
          day_note?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_logs"]["Insert"]>;
        Relationships: [];
      };
      weight_entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          kg: number;
          goal_plan_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          kg: number;
          goal_plan_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["weight_entries"]["Insert"]>;
        Relationships: [];
      };
      goal_plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          program_type: string;
          start_date: string | null;
          target_daily_kcal: number | null;
          target_protein_g: number | null;
          target_carbs_g: number | null;
          target_fat_g: number | null;
          target_weekly_weight_delta_kg: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          program_type: string;
          start_date?: string | null;
          target_daily_kcal?: number | null;
          target_protein_g?: number | null;
          target_carbs_g?: number | null;
          target_fat_g?: number | null;
          target_weekly_weight_delta_kg?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goal_plans"]["Insert"]>;
        Relationships: [];
      };
      weight_goals: {
        Row: {
          user_id: string;
          start_date: string;
          end_date: string;
          start_kg: number;
          target_kg: number;
          sex: string | null;
          age_years: number | null;
          height_cm: number | null;
          activity_level: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          start_date: string;
          end_date: string;
          start_kg: number;
          target_kg: number;
          sex?: string | null;
          age_years?: number | null;
          height_cm?: number | null;
          activity_level?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["weight_goals"]["Insert"]>;
        Relationships: [];
      };
      friend_requests: {
        Row: {
          id: string;
          from_user: string;
          to_user: string;
          status: "pending" | "accepted" | "declined" | "cancelled";
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          from_user: string;
          to_user: string;
          status?: "pending" | "accepted" | "declined" | "cancelled";
          created_at?: string;
          responded_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["friend_requests"]["Insert"]>;
        Relationships: [];
      };
      friendships: {
        Row: {
          user_a: string;
          user_b: string;
          created_at: string;
        };
        Insert: {
          user_a: string;
          user_b: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["friendships"]["Insert"]>;
        Relationships: [];
      };
      daily_scores: {
        Row: {
          user_id: string;
          date: string;
          budget_kcal: number | null;
          consumed_kcal: number | null;
          calorie_precision_points: number;
          meals_logged_count: number;
          streak_qualifies: boolean;
          current_streak: number;
          protein_goal_g: number | null;
          protein_consumed_g: number | null;
          protein_goal_hit: boolean;
          fiber_consumed_g: number | null;
          trained: boolean;
          healthy_points: number;
          total_points: number;
          computed_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          budget_kcal?: number | null;
          consumed_kcal?: number | null;
          calorie_precision_points?: number;
          meals_logged_count?: number;
          streak_qualifies?: boolean;
          current_streak?: number;
          protein_goal_g?: number | null;
          protein_consumed_g?: number | null;
          protein_goal_hit?: boolean;
          fiber_consumed_g?: number | null;
          trained?: boolean;
          healthy_points?: number;
          total_points?: number;
          computed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_scores"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      recompute_daily_score: {
        Args: { p_user_id: string; p_date: string };
        Returns: void;
      };
      accept_friend_request: {
        Args: { p_request_id: string };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
