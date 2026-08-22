// GENERATED via Supabase MCP `generate_typescript_types`. Do not hand-edit —
// regenerate after schema migrations instead.
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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_recommendation_feedback: {
        Row: {
          created_at: string
          id: string
          item_id: string
          pool_ids: string[]
          status: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          pool_ids: string[]
          status: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          pool_ids?: string[]
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendation_feedback_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendation_feedback_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_profiles: {
        Row: {
          business_name: string
          business_type: Database["public"]["Enums"]["business_type"]
          contact_phone: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          order_notes: string
          pool_id: string | null
        }
        Insert: {
          business_name: string
          business_type: Database["public"]["Enums"]["business_type"]
          contact_phone?: string
          created_at?: string
          id: string
          lat?: number | null
          lng?: number | null
          order_notes?: string
          pool_id?: string | null
        }
        Update: {
          business_name?: string
          business_type?: Database["public"]["Enums"]["business_type"]
          contact_phone?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          order_notes?: string
          pool_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_profiles_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_guest_pool: {
        Row: {
          claimed_at: string | null
          code: string
        }
        Insert: {
          claimed_at?: string | null
          code: string
        }
        Update: {
          claimed_at?: string | null
          code?: string
        }
        Relationships: []
      }
      item_tiers: {
        Row: {
          id: string
          item_id: string
          price: number
          threshold: number
          tier_index: number
        }
        Insert: {
          id?: string
          item_id: string
          price: number
          threshold: number
          tier_index: number
        }
        Update: {
          id?: string
          item_id?: string
          price?: number
          threshold?: number
          tier_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_tiers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          base_price: number
          created_at: string
          id: string
          name: string
          supplier_id: string
          unit: string
        }
        Insert: {
          base_price: number
          created_at?: string
          id?: string
          name: string
          supplier_id: string
          unit: string
        }
        Update: {
          base_price?: number
          created_at?: string
          id?: string
          name?: string
          supplier_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          confirmed_at: string | null
          created_at: string
          created_by: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          pool_id: string
          status: Database["public"]["Enums"]["order_status"]
          supplier_id: string
          total_savings: number
          total_spend: number
          total_units: number
          transaction_fee: number
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pool_id: string
          status?: Database["public"]["Enums"]["order_status"]
          supplier_id: string
          total_savings?: number
          total_spend?: number
          total_units?: number
          transaction_fee?: number
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pool_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          supplier_id?: string
          total_savings?: number
          total_spend?: number
          total_units?: number
          transaction_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pledges: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          item_id: string
          pool_id: string
          qty: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          item_id: string
          pool_id: string
          qty: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          item_id?: string
          pool_id?: string
          qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pledges_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledges_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledges_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pools: {
        Row: {
          admin_buyer_id: string | null
          created_at: string
          delivery_location: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          window_close_at: string
        }
        Insert: {
          admin_buyer_id?: string | null
          created_at?: string
          delivery_location?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          window_close_at?: string
        }
        Update: {
          admin_buyer_id?: string | null
          created_at?: string
          delivery_location?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          window_close_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pools_admin_buyer_id_fkey"
            columns: ["admin_buyer_id"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_feedback: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          matched_buyer_ids: string[]
          purchase_request_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          matched_buyer_ids: string[]
          purchase_request_id: string
          status: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          matched_buyer_ids?: string[]
          purchase_request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_feedback_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_feedback_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          budget_price: number | null
          buyer_id: string
          created_at: string
          id: string
          matched_item_id: string | null
          needed_by: string | null
          notes: string
          product_name: string
          quantity: number
          radius_km: number | null
          status: Database["public"]["Enums"]["purchase_request_status"]
          unit: string
          updated_at: string
        }
        Insert: {
          budget_price?: number | null
          buyer_id: string
          created_at?: string
          id?: string
          matched_item_id?: string | null
          needed_by?: string | null
          notes?: string
          product_name: string
          quantity: number
          radius_km?: number | null
          status?: Database["public"]["Enums"]["purchase_request_status"]
          unit?: string
          updated_at?: string
        }
        Update: {
          budget_price?: number | null
          buyer_id?: string
          created_at?: string
          id?: string
          matched_item_id?: string | null
          needed_by?: string | null
          notes?: string
          product_name?: string
          quantity?: number
          radius_km?: number | null
          status?: Database["public"]["Enums"]["purchase_request_status"]
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_matched_item_id_fkey"
            columns: ["matched_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          ai_suggestions: boolean
          buyer_id: string
          email_on_unlock: boolean
          reminder_before_close: boolean
        }
        Insert: {
          ai_suggestions?: boolean
          buyer_id: string
          email_on_unlock?: boolean
          reminder_before_close?: boolean
        }
        Update: {
          ai_suggestions?: boolean
          buyer_id?: string
          email_on_unlock?: boolean
          reminder_before_close?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "settings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: true
            referencedRelation: "buyer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_pool_links: {
        Row: {
          created_at: string
          id: string
          initiated_by: Database["public"]["Enums"]["link_initiator"]
          pool_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["link_status"]
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiated_by: Database["public"]["Enums"]["link_initiator"]
          pool_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          initiated_by?: Database["public"]["Enums"]["link_initiator"]
          pool_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_pool_links_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_pool_links_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_profiles: {
        Row: {
          company_name: string
          contact_email: string
          created_at: string
          id: string
        }
        Insert: {
          company_name: string
          contact_email?: string
          created_at?: string
          id: string
        }
        Update: {
          company_name?: string
          contact_email?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_next_demo_guest: { Args: never; Returns: string }
      distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      is_pool_admin: { Args: { p_pool_id: string }; Returns: boolean }
      is_supplier_active_in_pool: {
        Args: { p_pool_id: string }
        Returns: boolean
      }
      item_active_in_pool: {
        Args: { p_item_id: string; p_pool_id: string }
        Returns: boolean
      }
      matching_purchase_requests: {
        Args: { p_buyer_id: string; p_product_name: string }
        Returns: {
          buyer_id: string
          id: string
          lat: number
          lng: number
          needed_by: string
          pool_id: string
          product_name: string
          quantity: number
          radius_km: number
          unit: string
        }[]
      }
      my_pool_id: { Args: never; Returns: string }
      owns_item: { Args: { p_item_id: string }; Returns: boolean }
      owns_supplier_profile: {
        Args: { p_supplier_id: string }
        Returns: boolean
      }
      pool_item_totals: {
        Args: { p_pool_id: string }
        Returns: {
          item_id: string
          total_qty: number
        }[]
      }
      supplier_pool_item_totals: {
        Args: { p_supplier_id: string }
        Returns: {
          buyer_count: number
          item_id: string
          pool_id: string
          total_qty: number
        }[]
      }
    }
    Enums: {
      business_type: "Café" | "Bakery" | "Restaurant"
      link_initiator: "pool_admin" | "supplier"
      link_status: "pending" | "active" | "declined"
      order_status:
        | "draft"
        | "pending_approval"
        | "group_forming"
        | "confirmed"
        | "processing"
        | "completed"
        | "cancelled"
      payment_status: "pending" | "simulated_paid"
      purchase_request_status: "active" | "matched" | "fulfilled" | "cancelled"
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
      business_type: ["Café", "Bakery", "Restaurant"],
      link_initiator: ["pool_admin", "supplier"],
      link_status: ["pending", "active", "declined"],
      order_status: [
        "draft",
        "pending_approval",
        "group_forming",
        "confirmed",
        "processing",
        "completed",
        "cancelled",
      ],
      payment_status: ["pending", "simulated_paid"],
      purchase_request_status: ["active", "matched", "fulfilled", "cancelled"],
    },
  },
} as const
