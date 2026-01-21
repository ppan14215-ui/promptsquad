// Database types generated from Supabase schema
// Run `supabase gen types typescript` to regenerate after schema changes

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      mascots: {
        Row: {
          id: string;
          name: string;
          subtitle: string | null;
          description: string | null;
          image_url: string | null;
          color: string;
          personality: Json;
          skills: Json;
          models: Json;
          ai_provider: string;
          ai_model: string;
          is_free: boolean;
          is_pro: boolean | null;
          price_cents: number;
          sort_order: number;
          is_active: boolean;
          question_prompt: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subtitle?: string | null;
          description?: string | null;
          image_url?: string | null;
          color?: string;
          personality?: Json;
          skills?: Json;
          models?: Json;
          ai_provider?: string;
          ai_model?: string;
          is_free?: boolean;
          is_pro?: boolean | null;
          price_cents?: number;
          sort_order?: number;
          is_active?: boolean;
          question_prompt?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subtitle?: string | null;
          description?: string | null;
          image_url?: string | null;
          color?: string;
          personality?: Json;
          skills?: Json;
          models?: Json;
          ai_provider?: string;
          ai_model?: string;
          is_free?: boolean;
          is_pro?: boolean | null;
          price_cents?: number;
          sort_order?: number;
          is_active?: boolean;
          question_prompt?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      mascot_prompts: {
        Row: {
          id: string;
          mascot_id: string;
          system_prompt: string;
          greeting_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mascot_id: string;
          system_prompt: string;
          greeting_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mascot_id?: string;
          system_prompt?: string;
          greeting_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          theme: string;
          language: string;
          is_subscribed: boolean;
          subscription_expires_at: string | null;
          role: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          theme?: string;
          language?: string;
          is_subscribed?: boolean;
          subscription_expires_at?: string | null;
          role?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          theme?: string;
          language?: string;
          is_subscribed?: boolean;
          subscription_expires_at?: string | null;
          role?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_mascots: {
        Row: {
          id: string;
          user_id: string;
          mascot_id: string;
          unlocked_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mascot_id: string;
          unlocked_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mascot_id?: string;
          unlocked_at?: string;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          mascot_id: string;
          title: string | null;
          is_archived: boolean;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mascot_id: string;
          title?: string | null;
          is_archived?: boolean;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mascot_id?: string;
          title?: string | null;
          is_archived?: boolean;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          model: string | null;
          tokens_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          model?: string | null;
          tokens_used?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          model?: string | null;
          tokens_used?: number | null;
          created_at?: string;
        };
      };
      mascot_likes: {
        Row: {
          id: string;
          user_id: string;
          mascot_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mascot_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mascot_id?: string;
          created_at?: string;
        };
      };
      mascot_personality: {
        Row: {
          id: string;
          mascot_id: string;
          personality: string;
          default_personality: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mascot_id: string;
          personality: string;
          default_personality?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mascot_id?: string;
          personality?: string;
          default_personality?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      mascot_skills: {
        Row: {
          id: string;
          mascot_id: string;
          skill_label: string;
          skill_prompt: string | null;
          skill_prompt_preview: string;
          is_full_access: boolean;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mascot_id: string;
          skill_label: string;
          skill_prompt?: string | null;
          skill_prompt_preview: string;
          is_full_access?: boolean;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mascot_id?: string;
          skill_label?: string;
          skill_prompt?: string | null;
          skill_prompt_preview?: string;
          is_full_access?: boolean;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      trial_usage: {
        Row: {
          id: string;
          user_id: string;
          mascot_id: string;
          conversation_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mascot_id: string;
          conversation_count?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mascot_id?: string;
          conversation_count?: number;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      increment_trial_usage: {
        Args: {
          p_mascot_id: string;
        };
        Returns: {
          conversation_count: number;
          limit_reached: boolean;
        }[];
      };
      get_mascot_skills: {
        Args: {
          p_mascot_id: string;
        };
        Returns: {
          id: string;
          mascot_id: string;
          skill_label: string;
          skill_prompt: string | null;
          skill_prompt_preview: string;
          is_full_access: boolean;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {};
  };
}

// Helper types
export type Mascot = Database['public']['Tables']['mascots']['Row'];
export type MascotInsert = Database['public']['Tables']['mascots']['Insert'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type UserMascot = Database['public']['Tables']['user_mascots']['Row'];
export type UserMascotInsert = Database['public']['Tables']['user_mascots']['Insert'];

export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// Parsed types with JSON fields typed
export type MascotWithDetails = Omit<Mascot, 'personality' | 'skills' | 'models'> & {
  personality: string[];
  skills: { id: string; label: string }[];
  models: string[];
};

