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
          price_cents: number;
          sort_order: number;
          is_active: boolean;
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
          price_cents?: number;
          sort_order?: number;
          is_active?: boolean;
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
          price_cents?: number;
          sort_order?: number;
          is_active?: boolean;
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
          created_at?: string;
          updated_at?: string;
        };
      };
      user_mascots: {
        Row: {
          id: string;
          user_id: string;
          mascot_id: string;
          is_favorite: boolean;
          unlocked_at: string;
          purchase_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mascot_id: string;
          is_favorite?: boolean;
          unlocked_at?: string;
          purchase_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mascot_id?: string;
          is_favorite?: boolean;
          unlocked_at?: string;
          purchase_type?: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mascot_id: string;
          title?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mascot_id?: string;
          title?: string | null;
          is_archived?: boolean;
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
    };
    Views: {};
    Functions: {};
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

