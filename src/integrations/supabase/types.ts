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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      client_members: {
        Row: {
          client_id: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          created_by: string
          id: string
          ig_user_id: string | null
          ig_username: string | null
          name: string
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          ig_user_id?: string | null
          ig_username?: string | null
          name: string
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          ig_user_id?: string | null
          ig_username?: string | null
          name?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      instagram_accounts: {
        Row: {
          access_token: string
          client_id: string
          ig_user_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          client_id: string
          ig_user_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          client_id?: string
          ig_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          path: string
          position: number
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string
          path: string
          position?: number
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          path?: string
          position?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          caption: string
          client_id: string
          created_at: string
          created_by: string
          error_message: string | null
          feedback: string | null
          id: string
          ig_media_id: string | null
          kind: Database["public"]["Enums"]["post_kind"]
          notified_published_at: string | null
          notified_ready_at: string | null
          published_at: string | null
          reminder_sent_at: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string
          client_id: string
          created_at?: string
          created_by: string
          error_message?: string | null
          feedback?: string | null
          id?: string
          ig_media_id?: string | null
          kind?: Database["public"]["Enums"]["post_kind"]
          notified_published_at?: string | null
          notified_ready_at?: string | null
          published_at?: string | null
          reminder_sent_at?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string
          client_id?: string
          created_at?: string
          created_by?: string
          error_message?: string | null
          feedback?: string | null
          id?: string
          ig_media_id?: string | null
          kind?: Database["public"]["Enums"]["post_kind"]
          notified_published_at?: string | null
          notified_ready_at?: string | null
          published_at?: string | null
          reminder_sent_at?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          error_message: string | null
          id: string
          kind: string
          phone: string
          post_id: string | null
          status: string
        }
        Insert: {
          body: string
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          kind: string
          phone: string
          post_id?: string | null
          status?: string
        }
        Update: {
          body?: string
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          kind?: string
          phone?: string
          post_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_client_member: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
      post_kind: "image" | "carousel" | "reel" | "story"
      post_status:
        | "pending"
        | "approved"
        | "rejected"
        | "publishing"
        | "published"
        | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client"],
      post_kind: ["image", "carousel", "reel", "story"],
      post_status: [
        "pending",
        "approved",
        "rejected",
        "publishing",
        "published",
        "failed",
      ],
    },
  },
} as const
