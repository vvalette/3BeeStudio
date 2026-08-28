// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
//
// Régénération (après une nouvelle migration) :
//   1. docker run -d --rm --name types-pg -e POSTGRES_PASSWORD=postgres -p 54329:5432 postgres:15-alpine
//   2. docker exec types-pg psql -U postgres -c "create role anon nologin; create role authenticated nologin; create role service_role nologin;"
//   3. for f in supabase/migrations/*.sql; do docker exec -i types-pg psql -U postgres -v ON_ERROR_STOP=1 -q -f - < "$f"; done
//   4. npx supabase gen types typescript --db-url "postgresql://postgres:postgres@localhost:54329/postgres" > src/types/database.generated.ts
//      (puis ré-ajouter cet en-tête)
//   5. docker stop types-pg
//
// (La connexion directe à Supabase échoue sous WSL2 : db.*.supabase.co est IPv6-only.)
// Les colonnes JSONB affinées (custom_fields, items, model_rotation) sont typées
// dans src/types/database.ts — c'est LUI qu'importent les clients Supabase.

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
      abandoned_cart_optouts: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      abandoned_carts: {
        Row: {
          created_at: string
          email: string
          id: string
          items: Json
          locale: string
          name: string | null
          order_id: string | null
          recovered_at: string | null
          reminded_at: string | null
          subtotal: number
          token: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          items?: Json
          locale?: string
          name?: string | null
          order_id?: string | null
          recovered_at?: string | null
          reminded_at?: string | null
          subtotal?: number
          token: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          items?: Json
          locale?: string
          name?: string | null
          order_id?: string | null
          recovered_at?: string | null
          reminded_at?: string | null
          subtotal?: number
          token?: string
          total_amount?: number
        }
        Relationships: []
      }
      custom_orders: {
        Row: {
          admin_notes: string | null
          balance_amount: number | null
          balance_paid_at: string | null
          balance_payment_url: string | null
          balance_session_id: string | null
          boxtal_order_id: string | null
          budget_range: string | null
          company: string | null
          created_at: string | null
          deadline: string | null
          deposit_amount: number | null
          deposit_paid_at: string | null
          description: string
          email: string
          id: string
          name: string
          package_height_cm: number | null
          package_length_cm: number | null
          package_weight_grams: number | null
          package_width_cm: number | null
          payment_url: string | null
          phone: string
          project_type: string
          quote_issued_at: string | null
          quote_items: Json | null
          quote_number: string | null
          quote_object: string | null
          reference_file_url: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_name: string | null
          shipping_postal_code: string | null
          status: string
          stripe_checkout_session_id: string | null
          total_amount: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          balance_amount?: number | null
          balance_paid_at?: string | null
          balance_payment_url?: string | null
          balance_session_id?: string | null
          boxtal_order_id?: string | null
          budget_range?: string | null
          company?: string | null
          created_at?: string | null
          deadline?: string | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          description: string
          email: string
          id?: string
          name: string
          package_height_cm?: number | null
          package_length_cm?: number | null
          package_weight_grams?: number | null
          package_width_cm?: number | null
          payment_url?: string | null
          phone: string
          project_type: string
          quote_issued_at?: string | null
          quote_items?: Json | null
          quote_number?: string | null
          quote_object?: string | null
          reference_file_url?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          balance_amount?: number | null
          balance_paid_at?: string | null
          balance_payment_url?: string | null
          balance_session_id?: string | null
          boxtal_order_id?: string | null
          budget_range?: string | null
          company?: string | null
          created_at?: string | null
          deadline?: string | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          description?: string
          email?: string
          id?: string
          name?: string
          package_height_cm?: number | null
          package_length_cm?: number | null
          package_weight_grams?: number | null
          package_width_cm?: number | null
          payment_url?: string | null
          phone?: string
          project_type?: string
          quote_issued_at?: string | null
          quote_items?: Json | null
          quote_number?: string | null
          quote_object?: string | null
          reference_file_url?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          adjustments: Json
          client_address: string | null
          client_city: string | null
          client_company: string | null
          client_email: string
          client_name: string
          client_postal_code: string | null
          created_at: string
          id: string
          issued_at: string
          items: Json
          number: string
          object: string
          order_id: string
          paid_at: string | null
          source: string
          total_amount: number
        }
        Insert: {
          adjustments?: Json
          client_address?: string | null
          client_city?: string | null
          client_company?: string | null
          client_email: string
          client_name: string
          client_postal_code?: string | null
          created_at?: string
          id?: string
          issued_at?: string
          items: Json
          number: string
          object: string
          order_id: string
          paid_at?: string | null
          source: string
          total_amount: number
        }
        Update: {
          adjustments?: Json
          client_address?: string | null
          client_city?: string | null
          client_company?: string | null
          client_email?: string
          client_name?: string
          client_postal_code?: string | null
          created_at?: string
          id?: string
          issued_at?: string
          items?: Json
          number?: string
          object?: string
          order_id?: string
          paid_at?: string | null
          source?: string
          total_amount?: number
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          promo_used: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          promo_used?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          promo_used?: boolean
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_notes: string | null
          boxtal_order_id: string | null
          company: string
          created_at: string | null
          deposit_amount: number
          email: string
          id: string
          logo_url: string
          nfc_url: string
          phone: string
          quantity: number
          sector: string
          shipping_address: string | null
          shipping_address2: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_country: string | null
          shipping_name: string | null
          shipping_postal_code: string | null
          status: string
          stripe_checkout_session_id: string | null
          total_amount: number
          tracking_number: string | null
          tracking_url: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          boxtal_order_id?: string | null
          company: string
          created_at?: string | null
          deposit_amount: number
          email: string
          id?: string
          logo_url: string
          nfc_url: string
          phone: string
          quantity: number
          sector: string
          shipping_address?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          total_amount: number
          tracking_number?: string | null
          tracking_url?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          boxtal_order_id?: string | null
          company?: string
          created_at?: string | null
          deposit_amount?: number
          email?: string
          id?: string
          logo_url?: string
          nfc_url?: string
          phone?: string
          quantity?: number
          sector?: string
          shipping_address?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          total_amount?: number
          tracking_number?: string | null
          tracking_url?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_code_uses: {
        Row: {
          amount: number
          created_at: string
          email: string
          id: string
          promo_code_id: string
          shop_order_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          id?: string
          promo_code_id: string
          shop_order_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          id?: string
          promo_code_id?: string
          shop_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          applies_to: string
          code: string
          created_at: string
          ends_at: string | null
          id: string
          max_uses: number | null
          min_subtotal: number
          note: string | null
          once_per_email: boolean
          starts_at: string | null
          type: string
          updated_at: string
          uses: number
          value: number
        }
        Insert: {
          active?: boolean
          applies_to?: string
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_subtotal?: number
          note?: string | null
          once_per_email?: boolean
          starts_at?: string | null
          type: string
          updated_at?: string
          uses?: number
          value?: number
        }
        Update: {
          active?: boolean
          applies_to?: string
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_subtotal?: number
          note?: string | null
          once_per_email?: boolean
          starts_at?: string | null
          type?: string
          updated_at?: string
          uses?: number
          value?: number
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          label_en: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          label_en?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          label_en?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      shop_order_downloads: {
        Row: {
          created_at: string
          download_count: number
          expires_at: string
          file_name: string
          file_path: string
          id: string
          last_download_at: string | null
          max_downloads: number
          order_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          download_count?: number
          expires_at?: string
          file_name: string
          file_path: string
          id?: string
          last_download_at?: string | null
          max_downloads?: number
          order_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          download_count?: number
          expires_at?: string
          file_name?: string
          file_path?: string
          id?: string
          last_download_at?: string | null
          max_downloads?: number
          order_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_downloads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_downloads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          admin_notes: string | null
          boxtal_order_id: string | null
          created_at: string
          delivery_mode: string
          digital_waiver_at: string | null
          discount_amount: number
          email: string
          has_digital: boolean
          has_physical: boolean
          id: string
          items: Json
          locale: string
          name: string
          phone: string | null
          pickup_point_city: string | null
          pickup_point_code: string | null
          pickup_point_name: string | null
          pickup_point_postal_code: string | null
          pickup_point_street: string | null
          promo_code: string | null
          recovery_token: string | null
          shipping: number
          shipping_address: string | null
          shipping_address2: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_country: string | null
          shipping_name: string | null
          shipping_postal_code: string | null
          status: string
          stripe_checkout_session_id: string | null
          subtotal: number
          total_amount: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          boxtal_order_id?: string | null
          created_at?: string
          delivery_mode?: string
          digital_waiver_at?: string | null
          discount_amount?: number
          email: string
          has_digital?: boolean
          has_physical?: boolean
          id?: string
          items?: Json
          locale?: string
          name: string
          phone?: string | null
          pickup_point_city?: string | null
          pickup_point_code?: string | null
          pickup_point_name?: string | null
          pickup_point_postal_code?: string | null
          pickup_point_street?: string | null
          promo_code?: string | null
          recovery_token?: string | null
          shipping?: number
          shipping_address?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          subtotal: number
          total_amount: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          boxtal_order_id?: string | null
          created_at?: string
          delivery_mode?: string
          digital_waiver_at?: string | null
          discount_amount?: number
          email?: string
          has_digital?: boolean
          has_physical?: boolean
          id?: string
          items?: Json
          locale?: string
          name?: string
          phone?: string | null
          pickup_point_city?: string | null
          pickup_point_code?: string | null
          pickup_point_name?: string | null
          pickup_point_postal_code?: string | null
          pickup_point_street?: string | null
          promo_code?: string | null
          recovery_token?: string | null
          shipping?: number
          shipping_address?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          subtotal?: number
          total_amount?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shop_product_stats_daily: {
        Row: {
          carts: number
          day: string
          product_id: string
          uniques: number
          views: number
        }
        Insert: {
          carts?: number
          day: string
          product_id: string
          uniques?: number
          views?: number
        }
        Update: {
          carts?: number
          day?: string
          product_id?: string
          uniques?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_stats_daily_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_view_hits: {
        Row: {
          day: string
          product_id: string
          visitor_hash: string
        }
        Insert: {
          day: string
          product_id: string
          visitor_hash: string
        }
        Update: {
          day?: string
          product_id?: string
          visitor_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_view_hits_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          active: boolean
          category: string | null
          colors: Json
          created_at: string
          custom_fields: Json
          description: string
          description_en: string | null
          digital_file_name: string | null
          digital_file_path: string | null
          digital_file_size: number | null
          featured: boolean
          id: string
          images: string[]
          model_rotation: Json
          name: string
          name_en: string | null
          price: number
          product_type: string
          sale_price: number | null
          slug: string
          stl_url: string | null
          stock: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          subtitle: string | null
          subtitle_en: string | null
          updated_at: string
          weight_grams: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          colors?: Json
          created_at?: string
          custom_fields?: Json
          description?: string
          description_en?: string | null
          digital_file_name?: string | null
          digital_file_path?: string | null
          digital_file_size?: number | null
          featured?: boolean
          id?: string
          images?: string[]
          model_rotation?: Json
          name: string
          name_en?: string | null
          price: number
          product_type?: string
          sale_price?: number | null
          slug: string
          stl_url?: string | null
          stock?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          subtitle?: string | null
          subtitle_en?: string | null
          updated_at?: string
          weight_grams?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          colors?: Json
          created_at?: string
          custom_fields?: Json
          description?: string
          description_en?: string | null
          digital_file_name?: string | null
          digital_file_path?: string | null
          digital_file_size?: number | null
          featured?: boolean
          id?: string
          images?: string[]
          model_rotation?: Json
          name?: string
          name_en?: string | null
          price?: number
          product_type?: string
          sale_price?: number | null
          slug?: string
          stl_url?: string | null
          stock?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          subtitle?: string | null
          subtitle_en?: string | null
          updated_at?: string
          weight_grams?: number
        }
        Relationships: []
      }
      shop_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_gradient: string
          avatar_url: string | null
          body: string
          country: string
          created_at: string | null
          display_order: number
          id: string
          name: string
          rating: number
          role: string
          source: string
          source_url: string | null
          visible: boolean
        }
        Insert: {
          avatar_gradient?: string
          avatar_url?: string | null
          body: string
          country?: string
          created_at?: string | null
          display_order?: number
          id?: string
          name: string
          rating?: number
          role: string
          source?: string
          source_url?: string | null
          visible?: boolean
        }
        Update: {
          avatar_gradient?: string
          avatar_url?: string | null
          body?: string
          country?: string
          created_at?: string | null
          display_order?: number
          id?: string
          name?: string
          rating?: number
          role?: string
          source?: string
          source_url?: string | null
          visible?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      shop_product_stats_totals: {
        Row: {
          carts: number | null
          first_day: string | null
          last_day: string | null
          product_id: string | null
          uniques: number | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_stats_daily_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_download: {
        Args: { p_download_id: string }
        Returns: {
          file_name: string
          file_path: string
          ok: boolean
          remaining: number
        }[]
      }
      decrement_shop_stock: {
        Args: { p_product_id: string; p_qty: number }
        Returns: {
          new_stock: number
          oversold: boolean
        }[]
      }
      purge_abandoned_carts: { Args: never; Returns: number }
      purge_product_stats: {
        Args: never
        Returns: {
          deleted_hits: number
          deleted_stats: number
        }[]
      }
      record_product_event: {
        Args: { p_event?: string; p_product_id: string; p_visitor_hash: string }
        Returns: undefined
      }
      redeem_promo_code: {
        Args: {
          p_amount?: number
          p_code: string
          p_email: string
          p_order_id: string
        }
        Returns: {
          ok: boolean
          reason: string
        }[]
      }
      release_promo_code: { Args: { p_order_id: string }; Returns: number }
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

