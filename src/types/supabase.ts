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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          is_trial_counted: boolean | null
          mascot_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          is_trial_counted?: boolean | null
          mascot_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          is_trial_counted?: boolean | null
          mascot_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_mascot_id_fkey"
            columns: ["mascot_id"]
            isOneToOne: false
            referencedRelation: "mascots"
            referencedColumns: ["id"]
          },
        ]
      }
      mascot_likes: {
        Row: {
          created_at: string | null
          id: string
          mascot_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mascot_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mascot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mascot_likes_mascot_id_fkey"
            columns: ["mascot_id"]
            isOneToOne: false
            referencedRelation: "mascots"
            referencedColumns: ["id"]
          },
        ]
      }
      mascot_personality: {
        Row: {
          created_at: string | null
          default_personality: string | null
          id: string
          mascot_id: string
          personality: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_personality?: string | null
          id?: string
          mascot_id: string
          personality: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_personality?: string | null
          id?: string
          mascot_id?: string
          personality?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mascot_instructions_mascot_id_fkey"
            columns: ["mascot_id"]
            isOneToOne: true
            referencedRelation: "mascots"
            referencedColumns: ["id"]
          },
        ]
      }
      mascot_skills: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_full_access: boolean | null
          mascot_id: string
          skill_label: string
          skill_prompt: string
          skill_prompt_preview: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_full_access?: boolean | null
          mascot_id: string
          skill_label: string
          skill_prompt: string
          skill_prompt_preview?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_full_access?: boolean | null
          mascot_id?: string
          skill_label?: string
          skill_prompt?: string
          skill_prompt_preview?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mascot_skills_mascot_id_fkey"
            columns: ["mascot_id"]
            isOneToOne: false
            referencedRelation: "mascots"
            referencedColumns: ["id"]
          },
        ]
      }
      mascots: {
        Row: {
          color: string
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          is_free: boolean | null
          is_pro: boolean | null
          is_ready: boolean | null
          name: string
          question_prompt: string | null
          sort_order: number | null
          subtitle: string | null
          updated_at: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          id: string
          image_url: string
          is_active?: boolean | null
          is_free?: boolean | null
          is_pro?: boolean | null
          is_ready?: boolean | null
          name: string
          question_prompt?: string | null
          sort_order?: number | null
          subtitle?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          image_url?: string
          is_active: boolean | null
          is_free: boolean | null
          is_pro: boolean | null
          is_ready: boolean | null
          name?: string
          question_prompt?: string | null
          sort_order?: number | null
          subtitle?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          model: string | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          model?: string | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          model?: string | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_subscribed: boolean | null
          language: string | null
          onboarding_completed: boolean | null
          preferred_llm: string | null
          role: string | null
          subscription_expires_at: string | null
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_subscribed?: boolean | null
          language?: string | null
          onboarding_completed?: boolean | null
          preferred_llm?: string | null
          role?: string | null
          subscription_expires_at?: string | null
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_subscribed?: boolean | null
          language?: string | null
          onboarding_completed?: boolean | null
          preferred_llm?: string | null
          role?: string | null
          subscription_expires_at?: string | null
          theme?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trial_usage: {
        Row: {
          conversation_count: number | null
          id: string
          last_used_at: string | null
          mascot_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_count?: number | null
          id?: string
          last_used_at?: string | null
          mascot_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_count?: number | null
          id?: string
          last_used_at?: string | null
          mascot_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_usage_mascot_id_fkey"
            columns: ["mascot_id"]
            isOneToOne: false
            referencedRelation: "mascots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mascots: {
        Row: {
          created_at: string | null
          id: string
          is_favorite: boolean | null
          mascot_id: string
          purchase_type: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          mascot_id: string
          purchase_type?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          mascot_id?: string
          purchase_type?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mascots_mascot_id_fkey"
            columns: ["mascot_id"]
            isOneToOne: false
            referencedRelation: "mascots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_mascot_skills: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          mascot_id: string | null
          skill_label: string | null
          skill_prompt_preview: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          mascot_id?: string | null
          skill_label?: string | null
          skill_prompt_preview?: never
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          mascot_id?: string | null
          skill_label?: string | null
          skill_prompt_preview?: never
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mascot_skills_mascot_id_fkey"
            columns: ["mascot_id"]
            isOneToOne: false
            referencedRelation: "mascots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_delete_old_conversations: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
      get_mascot_skills: {
        Args: { p_mascot_id: string }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          is_full_access: boolean
          mascot_id: string
          skill_label: string
          skill_prompt: string
          sort_order: number
          updated_at: string
        }[]
      }
      increment_trial_usage:
      | {
        Args: { p_mascot_id: string }
        Returns: {
          conversation_count: number
          limit_reached: boolean
        }[]
      }
      | {
        Args: { p_conversation_id?: string; p_mascot_id: string }
        Returns: {
          conversation_count: number
          limit_reached: boolean
        }[]
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
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
