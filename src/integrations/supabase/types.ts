export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.1" }
  public: {
    Tables: {
      reservations: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          guest_name: string
          id: string
          message: string | null
          phone: string
          room_type: string
          status: string
          payment_method: string | null
          payment_status: string
          transaction_id: string | null
          amount_paid: number | null
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          guest_name: string
          id?: string
          message?: string | null
          phone: string
          room_type: string
          status?: string
          payment_method?: string | null
          payment_status?: string
          transaction_id?: string | null
          amount_paid?: number | null
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          guest_name?: string
          id?: string
          message?: string | null
          phone?: string
          room_type?: string
          status?: string
          payment_method?: string | null
          payment_status?: string
          transaction_id?: string | null
          amount_paid?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          name: string
          rating: number
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          name: string
          rating: number
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          name?: string
          rating?: number
        }
        Relationships: []
      }
      rooms: {
        Row: {
          amenities: string[]
          created_at: string
          description: string
          id: string
          images: string[]
          name: string
          occupied: boolean
          price: number
          type: string
          updated_at: string
        }
        Insert: {
          amenities?: string[]
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          name: string
          occupied?: boolean
          price: number
          type: string
          updated_at?: string
        }
        Update: {
          amenities?: string[]
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          name?: string
          occupied?: boolean
          price?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: { id: string; role: Database["public"]["Enums"]["app_role"]; user_id: string }
        Insert: { id?: string; role: Database["public"]["Enums"]["app_role"]; user_id: string }
        Update: { id?: string; role?: Database["public"]["Enums"]["app_role"]; user_id?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      ensure_admin_role: { Args: never; Returns: undefined }
      has_role: { Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }; Returns: boolean }
    }
    Enums: { app_role: "admin" | "user" }
    CompositeTypes: { [_ in never]: never }
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I } ? I : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I } ? I : never
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U } ? U : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U } ? U : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: { Enums: { app_role: ["admin", "user"] } },
} as const
