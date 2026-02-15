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
      attendance_raw: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          punch_type: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          punch_type?: string | null
          timestamp: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          punch_type?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_raw_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          brand_color: string
          company_address: string | null
          company_name: string
          created_at: string
          id: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          brand_color?: string
          company_address?: string | null
          company_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          brand_color?: string
          company_address?: string | null
          company_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          created_at: string
          date: string
          first_in: string | null
          id: string
          is_manual_override: boolean | null
          last_out: string | null
          late_minutes: number | null
          status: Database["public"]["Enums"]["attendance_status"]
          total_duration: unknown
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          first_in?: string | null
          id?: string
          is_manual_override?: boolean | null
          last_out?: string | null
          late_minutes?: number | null
          status?: Database["public"]["Enums"]["attendance_status"]
          total_duration?: unknown
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          first_in?: string | null
          id?: string
          is_manual_override?: boolean | null
          last_out?: string | null
          late_minutes?: number | null
          status?: Database["public"]["Enums"]["attendance_status"]
          total_duration?: unknown
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          annual_total: number
          annual_used: number
          casual_total: number
          casual_used: number
          created_at: string
          id: string
          sick_total: number
          sick_used: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          annual_total?: number
          annual_used?: number
          casual_total?: number
          casual_used?: number
          created_at?: string
          id?: string
          sick_total?: number
          sick_used?: number
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          annual_total?: number
          annual_used?: number
          casual_total?: number
          casual_used?: number
          created_at?: string
          id?: string
          sick_total?: number
          sick_used?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          date: string
          id: string
          permission_hours: number | null
          reason: string | null
          status: Database["public"]["Enums"]["leave_status"]
          submitted_to: string | null
          to_date: string | null
          type: Database["public"]["Enums"]["leave_type"]
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date: string
          id?: string
          permission_hours?: number | null
          reason?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          submitted_to?: string | null
          to_date?: string | null
          type?: Database["public"]["Enums"]["leave_type"]
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date?: string
          id?: string
          permission_hours?: number | null
          reason?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          submitted_to?: string | null
          to_date?: string | null
          type?: Database["public"]["Enums"]["leave_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_submitted_to_fkey"
            columns: ["submitted_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_settings: {
        Row: {
          id: string
          is_enabled: boolean
          leave_type: string
          total_days: number
          updated_at: string
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          leave_type: string
          total_days?: number
          updated_at?: string
        }
        Update: {
          id?: string
          is_enabled?: boolean
          leave_type?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      payroll: {
        Row: {
          basic_salary: number
          bonus: number
          conveyance_allowance: number
          created_at: string
          dearness_allowance: number
          epf_employee: number
          epf_employer: number
          esi_employee: number
          esi_employer: number
          gross_earnings: number | null
          hra: number
          id: string
          loan_recovery: number
          lop_days: number
          medical_allowance: number
          month: string
          net_salary: number | null
          notes: string | null
          other_deductions: number
          other_earnings: number
          overtime: number
          paid_days: number
          professional_tax: number
          released: boolean
          special_allowance: number
          tds: number
          total_deductions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          basic_salary?: number
          bonus?: number
          conveyance_allowance?: number
          created_at?: string
          dearness_allowance?: number
          epf_employee?: number
          epf_employer?: number
          esi_employee?: number
          esi_employer?: number
          gross_earnings?: number | null
          hra?: number
          id?: string
          loan_recovery?: number
          lop_days?: number
          medical_allowance?: number
          month: string
          net_salary?: number | null
          notes?: string | null
          other_deductions?: number
          other_earnings?: number
          overtime?: number
          paid_days?: number
          professional_tax?: number
          released?: boolean
          special_allowance?: number
          tds?: number
          total_deductions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          basic_salary?: number
          bonus?: number
          conveyance_allowance?: number
          created_at?: string
          dearness_allowance?: number
          epf_employee?: number
          epf_employer?: number
          esi_employee?: number
          esi_employer?: number
          gross_earnings?: number | null
          hra?: number
          id?: string
          loan_recovery?: number
          lop_days?: number
          medical_allowance?: number
          month?: string
          net_salary?: number | null
          notes?: string | null
          other_deductions?: number
          other_earnings?: number
          overtime?: number
          paid_days?: number
          professional_tax?: number
          released?: boolean
          special_allowance?: number
          tds?: number
          total_deductions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          biometric_id: string | null
          created_at: string
          date_of_joining: string | null
          department_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          shift_id: string | null
          updated_at: string
        }
        Insert: {
          biometric_id?: string | null
          created_at?: string
          date_of_joining?: string | null
          department_id?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          shift_id?: string | null
          updated_at?: string
        }
        Update: {
          biometric_id?: string | null
          created_at?: string
          date_of_joining?: string | null
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          shift_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          end_time: string
          grace_period_mins: number
          id: string
          max_break_minutes: number
          name: string
          start_time: string
          total_working_hours: number
        }
        Insert: {
          created_at?: string
          end_time: string
          grace_period_mins?: number
          id?: string
          max_break_minutes?: number
          name: string
          start_time: string
          total_working_hours?: number
        }
        Update: {
          created_at?: string
          end_time?: string
          grace_period_mins?: number
          id?: string
          max_break_minutes?: number
          name?: string
          start_time?: string
          total_working_hours?: number
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
      is_admin_or_subadmin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "subadmin" | "employee"
      attendance_status: "present" | "late" | "absent" | "half_day" | "on_leave"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "sick" | "casual" | "annual" | "permission" | "other"
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
      app_role: ["admin", "subadmin", "employee"],
      attendance_status: ["present", "late", "absent", "half_day", "on_leave"],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["sick", "casual", "annual", "permission", "other"],
    },
  },
} as const
