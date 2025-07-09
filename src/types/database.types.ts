export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      fund_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          recipient_address: string
          recipient_email: string | null
          sender_address: string
          sender_email: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          recipient_address: string
          recipient_email?: string | null
          sender_address: string
          sender_email?: string | null
          status: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          recipient_address?: string
          recipient_email?: string | null
          sender_address?: string
          sender_email?: string | null
          status?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount: string
          created_at: string
          expires_at: string | null
          from: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          amount: string
          created_at?: string
          expires_at?: string | null
          from: string
          id?: string
          note?: string | null
          status?: string
        }
        Update: {
          amount?: string
          created_at?: string
          expires_at?: string | null
          from?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          note: string | null
          recipient_address: string | null
          recipient_email: string
          sender_address: string | null
          sender_email: string
          status: string | null
          tx_hash: string | null
          type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          note?: string | null
          recipient_address?: string | null
          recipient_email: string
          sender_address?: string | null
          sender_email: string
          status?: string | null
          tx_hash?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          note?: string | null
          recipient_address?: string | null
          recipient_email?: string
          sender_address?: string | null
          sender_email?: string
          status?: string | null
          tx_hash?: string | null
          type?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          email: string
          full_name: string | null
          id: string
          profile_picture_url: string | null
          wallet_address: string | null
        }
        Insert: {
          email: string
          full_name?: string | null
          id?: string
          profile_picture_url?: string | null
          wallet_address?: string | null
        }
        Update: {
          email?: string
          full_name?: string | null
          id?: string
          profile_picture_url?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_by_email: {
        Args: { user_email: string }
        Returns: {
          id: string
          email: string
          full_name: string
          wallet_address: string
        }[]
      }
      get_user_transactions: {
        Args: { user_id: string }
        Returns: {
          id: string
          amount: number
          status: string
          tx_hash: string
          type: string
          created_at: string
          sender_email: string
          recipient_email: string
          sender_wallet: string
          recipient_wallet: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
