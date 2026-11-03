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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          sources: Json
          symbol: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          sources?: Json
          symbol?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          sources?: Json
          symbol?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          position: number
          user_id: string
          widget_key: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          user_id: string
          widget_key: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          user_id?: string
          widget_key?: string
        }
        Relationships: []
      }
      earnings_events: {
        Row: {
          company_name: string | null
          created_at: string
          event_date: string
          id: string
          kind: string
          notes: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          event_date: string
          id?: string
          kind?: string
          notes?: string | null
          symbol: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          event_date?: string
          id?: string
          kind?: string
          notes?: string | null
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          asset_kind: string
          avg_price: number
          created_at: string
          currency: string
          external_ref: string | null
          id: string
          last_price: number | null
          last_price_updated_at: string | null
          name: string | null
          quantity: number
          region: string
          source: string
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_kind?: string
          avg_price?: number
          created_at?: string
          currency?: string
          external_ref?: string | null
          id?: string
          last_price?: number | null
          last_price_updated_at?: string | null
          name?: string | null
          quantity?: number
          region?: string
          source: string
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_kind?: string
          avg_price?: number
          created_at?: string
          currency?: string
          external_ref?: string | null
          id?: string
          last_price?: number | null
          last_price_updated_at?: string | null
          name?: string | null
          quantity?: number
          region?: string
          source?: string
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          breakdown: Json | null
          created_at: string
          currency: string
          day_change: number | null
          day_change_pct: number | null
          id: string
          taken_at: string
          total_value: number
          user_id: string
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string
          currency?: string
          day_change?: number | null
          day_change_pct?: number | null
          id?: string
          taken_at?: string
          total_value: number
          user_id: string
        }
        Update: {
          breakdown?: Json | null
          created_at?: string
          currency?: string
          day_change?: number | null
          day_change_pct?: number | null
          id?: string
          taken_at?: string
          total_value?: number
          user_id?: string
        }
        Relationships: []
      }
      private_companies: {
        Row: {
          created_at: string
          id: string
          invested_amount: number | null
          key_risks: string | null
          last_valuation: number | null
          metrics: Json
          name: string
          sector: string | null
          stage: string | null
          status: string
          thesis: string | null
          updated_at: string
          user_id: string
          valuation_currency: string
        }
        Insert: {
          created_at?: string
          id?: string
          invested_amount?: number | null
          key_risks?: string | null
          last_valuation?: number | null
          metrics?: Json
          name: string
          sector?: string | null
          stage?: string | null
          status?: string
          thesis?: string | null
          updated_at?: string
          user_id: string
          valuation_currency?: string
        }
        Update: {
          created_at?: string
          id?: string
          invested_amount?: number | null
          key_risks?: string | null
          last_valuation?: number | null
          metrics?: Json
          name?: string
          sector?: string | null
          stage?: string | null
          status?: string
          thesis?: string | null
          updated_at?: string
          user_id?: string
          valuation_currency?: string
        }
        Relationships: []
      }
      private_documents: {
        Row: {
          company_id: string
          filename: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          filename: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          filename?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "private_companies"
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
    Enums: {},
  },
} as const
