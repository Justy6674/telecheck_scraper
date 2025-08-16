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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      compliance_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          provider_type: Database["public"]["Enums"]["provider_type_enum"]
          template_content: string
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          provider_type: Database["public"]["Enums"]["provider_type_enum"]
          template_content: string
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          provider_type?: Database["public"]["Enums"]["provider_type_enum"]
          template_content?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      disaster_declarations: {
        Row: {
          affected_areas: Json | null
          created_at: string
          declaration_authority: string
          declaration_date: string
          declaration_status: Database["public"]["Enums"]["declaration_status_enum"]
          description: string | null
          disaster_type: Database["public"]["Enums"]["disaster_type_enum"]
          expiry_date: string | null
          id: string
          last_sync_timestamp: string
          lga_code: string
          postcodes: string[] | null
          severity_level: number | null
          source_system: string
          source_url: string | null
          state_code: string
          updated_at: string
        }
        Insert: {
          affected_areas?: Json | null
          created_at?: string
          declaration_authority: string
          declaration_date: string
          declaration_status?: Database["public"]["Enums"]["declaration_status_enum"]
          description?: string | null
          disaster_type: Database["public"]["Enums"]["disaster_type_enum"]
          expiry_date?: string | null
          id?: string
          last_sync_timestamp?: string
          lga_code: string
          postcodes?: string[] | null
          severity_level?: number | null
          source_system: string
          source_url?: string | null
          state_code: string
          updated_at?: string
        }
        Update: {
          affected_areas?: Json | null
          created_at?: string
          declaration_authority?: string
          declaration_date?: string
          declaration_status?: Database["public"]["Enums"]["declaration_status_enum"]
          description?: string | null
          disaster_type?: Database["public"]["Enums"]["disaster_type_enum"]
          expiry_date?: string | null
          id?: string
          last_sync_timestamp?: string
          lga_code?: string
          postcodes?: string[] | null
          severity_level?: number | null
          source_system?: string
          source_url?: string | null
          state_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disaster_declarations_lga_code_fkey"
            columns: ["lga_code"]
            isOneToOne: false
            referencedRelation: "lga_registry"
            referencedColumns: ["lga_code"]
          },
        ]
      }
      lga_registry: {
        Row: {
          created_at: string | null
          lga_code: string
          lga_name: string
          state_code: string
          state_name: string
        }
        Insert: {
          created_at?: string | null
          lga_code: string
          lga_name: string
          state_code: string
          state_name: string
        }
        Update: {
          created_at?: string | null
          lga_code?: string
          lga_name?: string
          state_code?: string
          state_name?: string
        }
        Relationships: []
      }
      practice_registration: {
        Row: {
          abn: string | null
          address: string | null
          contact_phone: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          postcode: string | null
          practice_name: string
          provider_types: Database["public"]["Enums"]["provider_type_enum"][]
          state_code: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan_enum"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          abn?: string | null
          address?: string | null
          contact_phone?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          postcode?: string | null
          practice_name: string
          provider_types?: Database["public"]["Enums"]["provider_type_enum"][]
          state_code?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan_enum"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          abn?: string | null
          address?: string | null
          contact_phone?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          postcode?: string | null
          practice_name?: string
          provider_types?: Database["public"]["Enums"]["provider_type_enum"][]
          state_code?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan_enum"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      verification_logs: {
        Row: {
          compliance_note: string | null
          created_at: string
          declaration_ids: string[] | null
          disaster_declarations: Json | null
          exemption_type: string | null
          id: string
          patient_postcode: string
          practice_id: string | null
          provider_type: Database["public"]["Enums"]["provider_type_enum"]
          user_id: string | null
          verification_result: boolean
        }
        Insert: {
          compliance_note?: string | null
          created_at?: string
          declaration_ids?: string[] | null
          disaster_declarations?: Json | null
          exemption_type?: string | null
          id?: string
          patient_postcode: string
          practice_id?: string | null
          provider_type: Database["public"]["Enums"]["provider_type_enum"]
          user_id?: string | null
          verification_result: boolean
        }
        Update: {
          compliance_note?: string | null
          created_at?: string
          declaration_ids?: string[] | null
          disaster_declarations?: Json | null
          exemption_type?: string | null
          id?: string
          patient_postcode?: string
          practice_id?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type_enum"]
          user_id?: string | null
          verification_result?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "verification_logs_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practice_registration"
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
      declaration_status_enum: "active" | "expired" | "revoked" | "superseded"
      disaster_type_enum:
        | "bushfire"
        | "flood"
        | "cyclone"
        | "earthquake"
        | "severe_storm"
        | "drought"
        | "heatwave"
        | "landslide"
        | "tsunami"
        | "other"
      provider_type_enum: "GP" | "NP" | "Mixed"
      subscription_plan_enum:
        | "starter"
        | "np_specialist"
        | "professional"
        | "enterprise"
        | "corporate"
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
    Enums: {
      declaration_status_enum: ["active", "expired", "revoked", "superseded"],
      disaster_type_enum: [
        "bushfire",
        "flood",
        "cyclone",
        "earthquake",
        "severe_storm",
        "drought",
        "heatwave",
        "landslide",
        "tsunami",
        "other",
      ],
      provider_type_enum: ["GP", "NP", "Mixed"],
      subscription_plan_enum: [
        "starter",
        "np_specialist",
        "professional",
        "enterprise",
        "corporate",
      ],
    },
  },
} as const
