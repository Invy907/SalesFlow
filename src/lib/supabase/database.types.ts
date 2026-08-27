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
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          organization_id: string | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          organization_id?: string | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          organization_id?: string | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_holder: string | null
          account_number: string | null
          account_type: string | null
          bank_name: string | null
          branch_name: string | null
          created_at: string
          display_order: number | null
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_destinations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          client_id: string
          created_at: string
          email: string | null
          email_cc: string[] | null
          honorific: string | null
          id: string
          is_default: boolean
          label: string | null
          mailing_line1: string | null
          mailing_line2: string | null
          mailing_line3: string | null
          mailing_line4: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          client_id: string
          created_at?: string
          email?: string | null
          email_cc?: string[] | null
          honorific?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          mailing_line1?: string | null
          mailing_line2?: string | null
          mailing_line3?: string | null
          mailing_line4?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          client_id?: string
          created_at?: string
          email?: string | null
          email_cc?: string[] | null
          honorific?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          mailing_line1?: string | null
          mailing_line2?: string | null
          mailing_line3?: string | null
          mailing_line4?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_destinations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          corp_number: string | null
          created_at: string
          deleted_at: string | null
          department: string | null
          email: string | null
          email_cc: string[] | null
          fax: string | null
          furigana: string | null
          honorific: string | null
          id: string
          is_favorite: boolean
          management_code: string | null
          memo: string | null
          name: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          corp_number?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          email_cc?: string[] | null
          fax?: string | null
          furigana?: string | null
          honorific?: string | null
          id?: string
          is_favorite?: boolean
          management_code?: string | null
          memo?: string | null
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          corp_number?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          email_cc?: string[] | null
          fax?: string | null
          furigana?: string | null
          honorific?: string | null
          id?: string
          is_favorite?: boolean
          management_code?: string | null
          memo?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          address_line3: string | null
          company_name_line1: string | null
          company_name_line2: string | null
          company_name_line3: string | null
          created_at: string
          email: string | null
          fax: string | null
          invoice_registration_number: string | null
          logo_path: string | null
          organization_id: string
          postal_code: string | null
          representative_name: string | null
          seal_path: string | null
          tel: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          company_name_line1?: string | null
          company_name_line2?: string | null
          company_name_line3?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          invoice_registration_number?: string | null
          logo_path?: string | null
          organization_id: string
          postal_code?: string | null
          representative_name?: string | null
          seal_path?: string | null
          tel?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          company_name_line1?: string | null
          company_name_line2?: string | null
          company_name_line3?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          invoice_registration_number?: string | null
          logo_path?: string | null
          organization_id?: string
          postal_code?: string | null
          representative_name?: string | null
          seal_path?: string | null
          tel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_note_line_items: {
        Row: {
          document_id: string
          id: string
          item_id: string | null
          line_no: number
          line_subtotal: number | null
          name_snapshot: string
          qty: number
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot: string | null
          withholding_exempt_snapshot: boolean | null
        }
        Insert: {
          document_id: string
          id?: string
          item_id?: string | null
          line_no: number
          line_subtotal?: number | null
          name_snapshot: string
          qty?: number
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Update: {
          document_id?: string
          id?: string
          item_id?: string | null
          line_no?: number
          line_subtotal?: number | null
          name_snapshot?: string
          qty?: number
          tax_category?: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot?: number
          unit_price_snapshot?: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_line_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          client_destination_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_date: string | null
          document_number: string
          id: string
          internal_memo: string | null
          issue_date: string
          linked_invoice_id: string | null
          organization_id: string
          output_locale: string
          client_honorific: string
          show_client_honorific: boolean
          show_seal: boolean
          recipient_snapshot: Json | null
          remarks: string | null
          sender_snapshot: Json | null
          share_token: string | null
          status: Database["public"]["Enums"]["document_status"]
          subject: string | null
          subtotal: number
          tax_amount: number
          tax_display: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding: Database["public"]["Enums"]["tax_rounding"]
          template_key: string | null
          template_message: string | null
          total: number | null
          updated_at: string
          withholding_type: Database["public"]["Enums"]["withholding_type"]
        }
        Insert: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          document_number: string
          id?: string
          internal_memo?: string | null
          issue_date: string
          linked_invoice_id?: string | null
          organization_id: string
          output_locale?: string
          client_honorific?: string
          show_client_honorific?: boolean
          show_seal?: boolean
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          tax_display: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding: Database["public"]["Enums"]["tax_rounding"]
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string
          withholding_type?: Database["public"]["Enums"]["withholding_type"]
        }
        Update: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          document_number?: string
          id?: string
          internal_memo?: string | null
          issue_date?: string
          linked_invoice_id?: string | null
          organization_id?: string
          output_locale?: string
          client_honorific?: string
          show_client_honorific?: boolean
          show_seal?: boolean
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          tax_display?: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"]
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string
          withholding_type?: Database["public"]["Enums"]["withholding_type"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_client_destination_id_fkey"
            columns: ["client_destination_id"]
            isOneToOne: false
            referencedRelation: "client_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      display_settings: {
        Row: {
          created_at: string
          home_page_after_login: string
          list_page_size: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          home_page_after_login?: string
          list_page_size?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          home_page_after_login?: string
          list_page_size?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "display_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_defaults: {
        Row: {
          category_format_always_print: boolean
          created_at: string
          delivery_note_message: string | null
          delivery_note_remarks: string | null
          delivery_note_template_key: string | null
          estimate_heading: string | null
          estimate_message: string | null
          estimate_remarks: string | null
          estimate_template_key: string | null
          invoice_message: string | null
          invoice_remarks: string | null
          invoice_template_key: string | null
          line_item_label_amount: string | null
          line_item_label_name: string | null
          line_item_label_price: string | null
          line_item_label_qty: string | null
          numbering_rule: string | null
          organization_id: string
          receipt_message: string | null
          receipt_remarks: string | null
          receipt_template_key: string | null
          tax_display_default:
            | Database["public"]["Enums"]["tax_display_mode"]
            | null
          tax_rounding_default:
            | Database["public"]["Enums"]["tax_rounding"]
            | null
          updated_at: string
          withholding_default:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Insert: {
          category_format_always_print?: boolean
          created_at?: string
          delivery_note_message?: string | null
          delivery_note_remarks?: string | null
          delivery_note_template_key?: string | null
          estimate_heading?: string | null
          estimate_message?: string | null
          estimate_remarks?: string | null
          estimate_template_key?: string | null
          invoice_message?: string | null
          invoice_remarks?: string | null
          invoice_template_key?: string | null
          line_item_label_amount?: string | null
          line_item_label_name?: string | null
          line_item_label_price?: string | null
          line_item_label_qty?: string | null
          numbering_rule?: string | null
          organization_id: string
          receipt_message?: string | null
          receipt_remarks?: string | null
          receipt_template_key?: string | null
          tax_display_default?:
            | Database["public"]["Enums"]["tax_display_mode"]
            | null
          tax_rounding_default?:
            | Database["public"]["Enums"]["tax_rounding"]
            | null
          updated_at?: string
          withholding_default?:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Update: {
          category_format_always_print?: boolean
          created_at?: string
          delivery_note_message?: string | null
          delivery_note_remarks?: string | null
          delivery_note_template_key?: string | null
          estimate_heading?: string | null
          estimate_message?: string | null
          estimate_remarks?: string | null
          estimate_template_key?: string | null
          invoice_message?: string | null
          invoice_remarks?: string | null
          invoice_template_key?: string | null
          line_item_label_amount?: string | null
          line_item_label_name?: string | null
          line_item_label_price?: string | null
          line_item_label_qty?: string | null
          numbering_rule?: string | null
          organization_id?: string
          receipt_message?: string | null
          receipt_remarks?: string | null
          receipt_template_key?: string | null
          tax_display_default?:
            | Database["public"]["Enums"]["tax_display_mode"]
            | null
          tax_rounding_default?:
            | Database["public"]["Enums"]["tax_rounding"]
            | null
          updated_at?: string
          withholding_default?:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "document_defaults_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          date_key: string
          doc_type: string
          last_seq: number
          organization_id: string
        }
        Insert: {
          date_key: string
          doc_type: string
          last_seq?: number
          organization_id: string
        }
        Update: {
          date_key?: string
          doc_type?: string
          last_seq?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          document_id: string
          id: string
          item_id: string | null
          line_no: number
          line_subtotal: number | null
          name_snapshot: string
          qty: number
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot: string | null
          withholding_exempt_snapshot: boolean | null
        }
        Insert: {
          document_id: string
          id?: string
          item_id?: string | null
          line_no: number
          line_subtotal?: number | null
          name_snapshot: string
          qty?: number
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Update: {
          document_id?: string
          id?: string
          item_id?: string | null
          line_no?: number
          line_subtotal?: number | null
          name_snapshot?: string
          qty?: number
          tax_category?: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot?: number
          unit_price_snapshot?: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "estimates_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          client_destination_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_number: string
          expiry_date: string | null
          id: string
          internal_memo: string | null
          issue_date: string
          ordered_at: string | null
          ordered_order_id: string | null
          organization_id: string
          output_locale: string
          client_honorific: string
          show_client_honorific: boolean
          show_seal: boolean
          recipient_snapshot: Json | null
          remarks: string | null
          sender_snapshot: Json | null
          share_token: string | null
          status: Database["public"]["Enums"]["document_status"]
          subject: string | null
          subtotal: number
          tax_amount: number
          tax_display: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding: Database["public"]["Enums"]["tax_rounding"]
          template_key: string | null
          template_message: string | null
          total: number | null
          updated_at: string
          withholding_type: Database["public"]["Enums"]["withholding_type"]
        }
        Insert: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_number: string
          expiry_date?: string | null
          id?: string
          internal_memo?: string | null
          issue_date: string
          ordered_at?: string | null
          ordered_order_id?: string | null
          organization_id: string
          output_locale?: string
          client_honorific?: string
          show_client_honorific?: boolean
          show_seal?: boolean
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          tax_display: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding: Database["public"]["Enums"]["tax_rounding"]
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string
          withholding_type?: Database["public"]["Enums"]["withholding_type"]
        }
        Update: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_number?: string
          expiry_date?: string | null
          id?: string
          internal_memo?: string | null
          issue_date?: string
          ordered_at?: string | null
          ordered_order_id?: string | null
          organization_id?: string
          output_locale?: string
          client_honorific?: string
          show_client_honorific?: boolean
          show_seal?: boolean
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          tax_display?: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"]
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string
          withholding_type?: Database["public"]["Enums"]["withholding_type"]
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_destination_id_fkey"
            columns: ["client_destination_id"]
            isOneToOne: false
            referencedRelation: "client_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_ordered_order_id_fkey"
            columns: ["ordered_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_ordered_order_id_fkey"
            columns: ["ordered_order_id"]
            isOneToOne: false
            referencedRelation: "orders_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          flags: Json
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flags?: Json
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flags?: Json
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_connections: {
        Row: {
          access_token_enc: string | null
          connected_by: string
          created_at: string
          google_email: string
          history_id: string | null
          id: string
          last_send_at: string | null
          last_send_error: string | null
          last_sync_at: string | null
          last_sync_error: string | null
          scopes: string[] | null
          organization_id: string
          refresh_token_enc: string
          revoked_at: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_enc?: string | null
          connected_by: string
          created_at?: string
          google_email: string
          history_id?: string | null
          id?: string
          last_send_at?: string | null
          last_send_error?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          scopes?: string[] | null
          organization_id: string
          refresh_token_enc: string
          revoked_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_enc?: string | null
          connected_by?: string
          created_at?: string
          google_email?: string
          history_id?: string | null
          id?: string
          last_send_at?: string | null
          last_send_error?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          scopes?: string[] | null
          organization_id?: string
          refresh_token_enc?: string
          revoked_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          organization_id: string
          payload: Json | null
          read_at: string | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          organization_id: string
          payload?: Json | null
          read_at?: string | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string
          payload?: Json | null
          read_at?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          document_id: string
          id: string
          item_id: string | null
          line_no: number
          line_subtotal: number | null
          name_snapshot: string
          qty: number
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot: string | null
          withholding_exempt_snapshot: boolean | null
        }
        Insert: {
          document_id: string
          id?: string
          item_id?: string | null
          line_no: number
          line_subtotal?: number | null
          name_snapshot: string
          qty?: number
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Update: {
          document_id?: string
          id?: string
          item_id?: string | null
          line_no?: number
          line_subtotal?: number | null
          name_snapshot?: string
          qty?: number
          tax_category?: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot?: number
          unit_price_snapshot?: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "invoices_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          bank_account_ids: string[] | null
          billing_month: string | null
          card_payment_enabled: boolean
          card_qr_print: boolean
          category_format_always_print: boolean
          client_destination_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_date: string | null
          document_number: string
          gmo_pg_member_id: string | null
          id: string
          internal_memo: string | null
          issue_date: string
          organization_id: string
          output_locale: string
          client_honorific: string
          show_client_honorific: boolean
          show_seal: boolean
          paid_amount: number
          paid_at: string | null
          payment_due: string | null
          payment_option: Database["public"]["Enums"]["payment_option"]
          periodic_schedule_id: string | null
          recipient_snapshot: Json | null
          remarks: string | null
          sender_snapshot: Json | null
          share_token: string | null
          status: Database["public"]["Enums"]["document_status"]
          subject: string | null
          subtotal: number
          tax_amount: number
          tax_display: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding: Database["public"]["Enums"]["tax_rounding"]
          template_key: string | null
          template_message: string | null
          total: number | null
          updated_at: string
          withholding_type: Database["public"]["Enums"]["withholding_type"]
        }
        Insert: {
          bank_account_ids?: string[] | null
          billing_month?: string | null
          card_payment_enabled?: boolean
          card_qr_print?: boolean
          category_format_always_print?: boolean
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          document_number: string
          gmo_pg_member_id?: string | null
          id?: string
          internal_memo?: string | null
          issue_date: string
          organization_id: string
          output_locale?: string
          client_honorific?: string
          show_client_honorific?: boolean
          show_seal?: boolean
          paid_amount?: number
          paid_at?: string | null
          payment_due?: string | null
          payment_option?: Database["public"]["Enums"]["payment_option"]
          periodic_schedule_id?: string | null
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          tax_display: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding: Database["public"]["Enums"]["tax_rounding"]
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string
          withholding_type?: Database["public"]["Enums"]["withholding_type"]
        }
        Update: {
          bank_account_ids?: string[] | null
          billing_month?: string | null
          card_payment_enabled?: boolean
          card_qr_print?: boolean
          category_format_always_print?: boolean
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          document_number?: string
          gmo_pg_member_id?: string | null
          id?: string
          internal_memo?: string | null
          issue_date?: string
          organization_id?: string
          output_locale?: string
          client_honorific?: string
          show_client_honorific?: boolean
          show_seal?: boolean
          paid_amount?: number
          paid_at?: string | null
          payment_due?: string | null
          payment_option?: Database["public"]["Enums"]["payment_option"]
          periodic_schedule_id?: string | null
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          tax_display?: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"]
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string
          withholding_type?: Database["public"]["Enums"]["withholding_type"]
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_destination_id_fkey"
            columns: ["client_destination_id"]
            isOneToOne: false
            referencedRelation: "client_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_periodic_schedule_id_fkey"
            columns: ["periodic_schedule_id"]
            isOneToOne: false
            referencedRelation: "periodic_invoice_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_exempt_flag: boolean | null
          unit: string | null
          unit_price: number
          updated_at: string
          withholding_exempt: boolean
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
          tax_category?: Database["public"]["Enums"]["tax_category"]
          tax_exempt_flag?: boolean | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
          withholding_exempt?: boolean
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          tax_category?: Database["public"]["Enums"]["tax_category"]
          tax_exempt_flag?: boolean | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
          withholding_exempt?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          organization_id: string
          payload: Json | null
          read_at: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          organization_id: string
          payload?: Json | null
          read_at?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string
          payload?: Json | null
          read_at?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_form_line_items: {
        Row: {
          id: string
          item_id: string | null
          line_no: number
          name_snapshot: string
          order_form_id: string
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot: string | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          line_no: number
          name_snapshot: string
          order_form_id: string
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot?: string | null
        }
        Update: {
          id?: string
          item_id?: string | null
          line_no?: number
          name_snapshot?: string
          order_form_id?: string
          tax_category?: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot?: number
          unit_price_snapshot?: number
          unit_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_form_line_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_form_line_items_order_form_id_fkey"
            columns: ["order_form_id"]
            isOneToOne: false
            referencedRelation: "order_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      order_form_submissions: {
        Row: {
          client_name_input: string | null
          converted_order_id: string | null
          email_input: string | null
          id: string
          order_form_id: string
          organization_id: string
          payload: Json | null
          phone_input: string | null
          submitted_at: string
        }
        Insert: {
          client_name_input?: string | null
          converted_order_id?: string | null
          email_input?: string | null
          id?: string
          order_form_id: string
          organization_id: string
          payload?: Json | null
          phone_input?: string | null
          submitted_at?: string
        }
        Update: {
          client_name_input?: string | null
          converted_order_id?: string | null
          email_input?: string | null
          id?: string
          order_form_id?: string
          organization_id?: string
          payload?: Json | null
          phone_input?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_form_submissions_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_form_submissions_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_form_submissions_order_form_id_fkey"
            columns: ["order_form_id"]
            isOneToOne: false
            referencedRelation: "order_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_forms: {
        Row: {
          client_name_required: boolean
          created_at: string
          deleted_at: string | null
          expiration_date: string | null
          expiration_mode: string
          id: string
          is_published: boolean
          logo_path: string | null
          name: string | null
          organization_id: string
          public_token: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          client_name_required?: boolean
          created_at?: string
          deleted_at?: string | null
          expiration_date?: string | null
          expiration_mode?: string
          id?: string
          is_published?: boolean
          logo_path?: string | null
          name?: string | null
          organization_id: string
          public_token: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          client_name_required?: boolean
          created_at?: string
          deleted_at?: string | null
          expiration_date?: string | null
          expiration_mode?: string
          id?: string
          is_published?: boolean
          logo_path?: string | null
          name?: string | null
          organization_id?: string
          public_token?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_items: {
        Row: {
          document_id: string
          id: string
          item_id: string | null
          line_no: number
          line_subtotal: number | null
          name_snapshot: string
          qty: number
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot: string | null
          withholding_exempt_snapshot: boolean | null
        }
        Insert: {
          document_id: string
          id?: string
          item_id?: string | null
          line_no: number
          line_subtotal?: number | null
          name_snapshot: string
          qty?: number
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Update: {
          document_id?: string
          id?: string
          item_id?: string | null
          line_no?: number
          line_subtotal?: number | null
          name_snapshot?: string
          qty?: number
          tax_category?: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot?: number
          unit_price_snapshot?: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "order_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "orders_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_line_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_statuses: {
        Row: {
          color: string | null
          created_at: string
          display_order: number | null
          id: string
          is_system: boolean
          name: string
          organization_id: string
          system_key: Database["public"]["Enums"]["order_system_status"] | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_system?: boolean
          name: string
          organization_id: string
          system_key?: Database["public"]["Enums"]["order_system_status"] | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string
          system_key?: Database["public"]["Enums"]["order_system_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string | null
          comment: string | null
          created_at: string
          deleted_at: string | null
          delivery_date: string | null
          id: string
          order_date: string
          order_number: string
          order_time: string | null
          organization_id: string
          source_estimate_id: string | null
          source_order_form_submission_id: string | null
          status_id: string | null
          subject: string | null
          subtotal: number
          tax_amount: number
          total: number | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_date?: string | null
          id?: string
          order_date: string
          order_number: string
          order_time?: string | null
          organization_id: string
          source_estimate_id?: string | null
          source_order_form_submission_id?: string | null
          status_id?: string | null
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          total?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_date?: string | null
          id?: string
          order_date?: string
          order_number?: string
          order_time?: string | null
          organization_id?: string
          source_estimate_id?: string | null
          source_order_form_submission_id?: string | null
          status_id?: string | null
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_estimate_id_fkey"
            columns: ["source_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_estimate_id_fkey"
            columns: ["source_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_order_form_submission_id_fkey"
            columns: ["source_order_form_submission_id"]
            isOneToOne: false
            referencedRelation: "order_form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "order_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          plan: Database["public"]["Enums"]["plan_tier"]
          service_contract_id: string | null
          slug: string | null
          updated_at: string
          yayoi_linked: boolean
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          service_contract_id?: string | null
          slug?: string | null
          updated_at?: string
          yayoi_linked?: boolean
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          service_contract_id?: string | null
          slug?: string | null
          updated_at?: string
          yayoi_linked?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          id: string
          invoice_id: string
          memo: string | null
          method: string | null
          organization_id: string
          paid_at: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          memo?: string | null
          method?: string | null
          organization_id: string
          paid_at: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          memo?: string | null
          method?: string | null
          organization_id?: string
          paid_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      periodic_invoice_schedule_line_items: {
        Row: {
          id: string
          item_id: string | null
          line_no: number
          line_subtotal: number | null
          name_template: string
          qty: number
          schedule_id: string
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot: string | null
          withholding_exempt_snapshot: boolean | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          line_no: number
          line_subtotal?: number | null
          name_template: string
          qty?: number
          schedule_id: string
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Update: {
          id?: string
          item_id?: string | null
          line_no?: number
          line_subtotal?: number | null
          name_template?: string
          qty?: number
          schedule_id?: string
          tax_category?: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot?: number
          unit_price_snapshot?: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "periodic_invoice_schedule_line_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodic_invoice_schedule_line_items_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "periodic_invoice_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      periodic_invoice_schedules: {
        Row: {
          client_id: string | null
          created_by: string | null
          internal_memo: string | null
          last_error: string | null
          last_error_at: string | null
          output_locale: string
          payment_day_mode: string
          remarks: string | null
          show_client_honorific: boolean
          created_at: string
          cycle: Database["public"]["Enums"]["periodic_cycle"]
          day_mode: string
          day_value: number | null
          deleted_at: string | null
          email_body: string | null
          email_enabled: boolean
          email_subject: string | null
          end_date: string | null
          end_mode: string
          id: string
          is_paused: boolean
          last_generated_at: string | null
          next_run_at: string | null
          organization_id: string
          payment_day: number | null
          payment_mode: string
          payment_month: string | null
          start_date: string
          subject: string | null
          tax_display: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding: Database["public"]["Enums"]["tax_rounding"]
          template_key: string | null
          updated_at: string
          withholding_type: Database["public"]["Enums"]["withholding_type"]
        }
        Insert: {
          client_id?: string | null
          created_by?: string | null
          internal_memo?: string | null
          last_error?: string | null
          last_error_at?: string | null
          output_locale?: string
          payment_day_mode?: string
          remarks?: string | null
          show_client_honorific?: boolean
          created_at?: string
          cycle?: Database["public"]["Enums"]["periodic_cycle"]
          day_mode?: string
          day_value?: number | null
          deleted_at?: string | null
          email_body?: string | null
          email_enabled?: boolean
          email_subject?: string | null
          end_date?: string | null
          end_mode?: string
          id?: string
          is_paused?: boolean
          last_generated_at?: string | null
          next_run_at?: string | null
          organization_id: string
          payment_day?: number | null
          payment_mode?: string
          payment_month?: string | null
          start_date: string
          subject?: string | null
          tax_display?: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"]
          template_key?: string | null
          updated_at?: string
          withholding_type?: Database["public"]["Enums"]["withholding_type"]
        }
        Update: {
          client_id?: string | null
          created_by?: string | null
          internal_memo?: string | null
          last_error?: string | null
          last_error_at?: string | null
          output_locale?: string
          payment_day_mode?: string
          remarks?: string | null
          show_client_honorific?: boolean
          created_at?: string
          cycle?: Database["public"]["Enums"]["periodic_cycle"]
          day_mode?: string
          day_value?: number | null
          deleted_at?: string | null
          email_body?: string | null
          email_enabled?: boolean
          email_subject?: string | null
          end_date?: string | null
          end_mode?: string
          id?: string
          is_paused?: boolean
          last_generated_at?: string | null
          next_run_at?: string | null
          organization_id?: string
          payment_day?: number | null
          payment_mode?: string
          payment_month?: string | null
          start_date?: string
          subject?: string | null
          tax_display?: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"]
          template_key?: string | null
          updated_at?: string
          withholding_type?: Database["public"]["Enums"]["withholding_type"]
        }
        Relationships: [
          {
            foreignKeyName: "periodic_invoice_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodic_invoice_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipt_line_items: {
        Row: {
          document_id: string
          id: string
          item_id: string | null
          line_no: number
          line_subtotal: number | null
          name_snapshot: string
          qty: number
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot: string | null
          withholding_exempt_snapshot: boolean | null
        }
        Insert: {
          document_id: string
          id?: string
          item_id?: string | null
          line_no: number
          line_subtotal?: number | null
          name_snapshot: string
          qty?: number
          tax_category: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot: number
          unit_price_snapshot: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Update: {
          document_id?: string
          id?: string
          item_id?: string | null
          line_no?: number
          line_subtotal?: number | null
          name_snapshot?: string
          qty?: number
          tax_category?: Database["public"]["Enums"]["tax_category"]
          tax_rate_snapshot?: number
          unit_price_snapshot?: number
          unit_snapshot?: string | null
          withholding_exempt_snapshot?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "receipts_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_line_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          client_destination_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_number: string
          id: string
          internal_memo: string | null
          issue_date: string
          linked_invoice_id: string | null
          organization_id: string
          output_locale: string
          client_honorific: string
          show_client_honorific: boolean
          show_seal: boolean
          recipient_snapshot: Json | null
          remarks: string | null
          sender_snapshot: Json | null
          share_token: string | null
          status: Database["public"]["Enums"]["document_status"]
          subject: string | null
          subtotal: number
          tax_amount: number
          tax_display: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding: Database["public"]["Enums"]["tax_rounding"]
          template_key: string | null
          template_message: string | null
          total: number | null
          transaction_date: string | null
          updated_at: string
          withholding_type: Database["public"]["Enums"]["withholding_type"]
        }
        Insert: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_number: string
          id?: string
          internal_memo?: string | null
          issue_date: string
          linked_invoice_id?: string | null
          organization_id: string
          output_locale?: string
          client_honorific?: string
          show_client_honorific?: boolean
          show_seal?: boolean
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          tax_display: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding: Database["public"]["Enums"]["tax_rounding"]
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          transaction_date?: string | null
          updated_at?: string
          withholding_type?: Database["public"]["Enums"]["withholding_type"]
        }
        Update: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_number?: string
          id?: string
          internal_memo?: string | null
          issue_date?: string
          linked_invoice_id?: string | null
          organization_id?: string
          output_locale?: string
          client_honorific?: string
          show_client_honorific?: boolean
          show_seal?: boolean
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          tax_display?: Database["public"]["Enums"]["tax_display_mode"]
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"]
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          transaction_date?: string | null
          updated_at?: string
          withholding_type?: Database["public"]["Enums"]["withholding_type"]
        }
        Relationships: [
          {
            foreignKeyName: "receipts_client_destination_id_fkey"
            columns: ["client_destination_id"]
            isOneToOne: false
            referencedRelation: "client_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      share_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          organization_id: string
          revoked_at: string | null
          target_id: string
          target_table: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          organization_id: string
          revoked_at?: string | null
          target_id: string
          target_table: string
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          organization_id?: string
          revoked_at?: string | null
          target_id?: string
          target_table?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          amount_jpy: number
          count: number
          created_at: string
          event_date: string
          id: string
          kind: string
          organization_id: string
          reference_id: string | null
          reference_table: string | null
        }
        Insert: {
          amount_jpy?: number
          count?: number
          created_at?: string
          event_date: string
          id?: string
          kind: string
          organization_id: string
          reference_id?: string | null
          reference_table?: string | null
        }
        Update: {
          amount_jpy?: number
          count?: number
          created_at?: string
          event_date?: string
          id?: string
          kind?: string
          organization_id?: string
          reference_id?: string | null
          reference_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      delivery_notes_trashed: {
        Row: {
          client_destination_id: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          delivery_date: string | null
          document_number: string | null
          id: string | null
          internal_memo: string | null
          issue_date: string | null
          linked_invoice_id: string | null
          organization_id: string | null
          recipient_snapshot: Json | null
          remarks: string | null
          sender_snapshot: Json | null
          share_token: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subject: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_display: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding: Database["public"]["Enums"]["tax_rounding"] | null
          template_key: string | null
          template_message: string | null
          total: number | null
          updated_at: string | null
          withholding_type:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Insert: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          document_number?: string | null
          id?: string | null
          internal_memo?: string | null
          issue_date?: string | null
          linked_invoice_id?: string | null
          organization_id?: string | null
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_display?: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"] | null
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string | null
          withholding_type?:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Update: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          document_number?: string | null
          id?: string | null
          internal_memo?: string | null
          issue_date?: string | null
          linked_invoice_id?: string | null
          organization_id?: string | null
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_display?: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"] | null
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string | null
          withholding_type?:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_client_destination_id_fkey"
            columns: ["client_destination_id"]
            isOneToOne: false
            referencedRelation: "client_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates_trashed: {
        Row: {
          client_destination_id: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          document_number: string | null
          expiry_date: string | null
          id: string | null
          internal_memo: string | null
          issue_date: string | null
          ordered_at: string | null
          ordered_order_id: string | null
          organization_id: string | null
          recipient_snapshot: Json | null
          remarks: string | null
          sender_snapshot: Json | null
          share_token: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subject: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_display: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding: Database["public"]["Enums"]["tax_rounding"] | null
          template_key: string | null
          template_message: string | null
          total: number | null
          updated_at: string | null
          withholding_type:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Insert: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          document_number?: string | null
          expiry_date?: string | null
          id?: string | null
          internal_memo?: string | null
          issue_date?: string | null
          ordered_at?: string | null
          ordered_order_id?: string | null
          organization_id?: string | null
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_display?: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"] | null
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string | null
          withholding_type?:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Update: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          document_number?: string | null
          expiry_date?: string | null
          id?: string | null
          internal_memo?: string | null
          issue_date?: string | null
          ordered_at?: string | null
          ordered_order_id?: string | null
          organization_id?: string | null
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_display?: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"] | null
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string | null
          withholding_type?:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_destination_id_fkey"
            columns: ["client_destination_id"]
            isOneToOne: false
            referencedRelation: "client_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_ordered_order_id_fkey"
            columns: ["ordered_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_ordered_order_id_fkey"
            columns: ["ordered_order_id"]
            isOneToOne: false
            referencedRelation: "orders_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices_trashed: {
        Row: {
          bank_account_ids: string[] | null
          billing_month: string | null
          card_payment_enabled: boolean | null
          card_qr_print: boolean | null
          category_format_always_print: boolean | null
          client_destination_id: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          delivery_date: string | null
          document_number: string | null
          gmo_pg_member_id: string | null
          id: string | null
          internal_memo: string | null
          issue_date: string | null
          organization_id: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_due: string | null
          payment_option: Database["public"]["Enums"]["payment_option"] | null
          periodic_schedule_id: string | null
          recipient_snapshot: Json | null
          remarks: string | null
          sender_snapshot: Json | null
          share_token: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subject: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_display: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding: Database["public"]["Enums"]["tax_rounding"] | null
          template_key: string | null
          template_message: string | null
          total: number | null
          updated_at: string | null
          withholding_type:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Insert: {
          bank_account_ids?: string[] | null
          billing_month?: string | null
          card_payment_enabled?: boolean | null
          card_qr_print?: boolean | null
          category_format_always_print?: boolean | null
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          document_number?: string | null
          gmo_pg_member_id?: string | null
          id?: string | null
          internal_memo?: string | null
          issue_date?: string | null
          organization_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_due?: string | null
          payment_option?: Database["public"]["Enums"]["payment_option"] | null
          periodic_schedule_id?: string | null
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_display?: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"] | null
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string | null
          withholding_type?:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Update: {
          bank_account_ids?: string[] | null
          billing_month?: string | null
          card_payment_enabled?: boolean | null
          card_qr_print?: boolean | null
          category_format_always_print?: boolean | null
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          document_number?: string | null
          gmo_pg_member_id?: string | null
          id?: string | null
          internal_memo?: string | null
          issue_date?: string | null
          organization_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_due?: string | null
          payment_option?: Database["public"]["Enums"]["payment_option"] | null
          periodic_schedule_id?: string | null
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_display?: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"] | null
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          updated_at?: string | null
          withholding_type?:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_destination_id_fkey"
            columns: ["client_destination_id"]
            isOneToOne: false
            referencedRelation: "client_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_periodic_schedule_id_fkey"
            columns: ["periodic_schedule_id"]
            isOneToOne: false
            referencedRelation: "periodic_invoice_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_trashed: {
        Row: {
          client_id: string | null
          comment: string | null
          created_at: string | null
          deleted_at: string | null
          delivery_date: string | null
          id: string | null
          order_date: string | null
          order_number: string | null
          order_time: string | null
          organization_id: string | null
          source_estimate_id: string | null
          source_order_form_submission_id: string | null
          status_id: string | null
          subject: string | null
          subtotal: number | null
          tax_amount: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          id?: string | null
          order_date?: string | null
          order_number?: string | null
          order_time?: string | null
          organization_id?: string | null
          source_estimate_id?: string | null
          source_order_form_submission_id?: string | null
          status_id?: string | null
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          id?: string | null
          order_date?: string | null
          order_number?: string | null
          order_time?: string | null
          organization_id?: string | null
          source_estimate_id?: string | null
          source_order_form_submission_id?: string | null
          status_id?: string | null
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_estimate_id_fkey"
            columns: ["source_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_estimate_id_fkey"
            columns: ["source_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_order_form_submission_id_fkey"
            columns: ["source_order_form_submission_id"]
            isOneToOne: false
            referencedRelation: "order_form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "order_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts_trashed: {
        Row: {
          client_destination_id: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          document_number: string | null
          id: string | null
          internal_memo: string | null
          issue_date: string | null
          linked_invoice_id: string | null
          organization_id: string | null
          recipient_snapshot: Json | null
          remarks: string | null
          sender_snapshot: Json | null
          share_token: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          subject: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_display: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding: Database["public"]["Enums"]["tax_rounding"] | null
          template_key: string | null
          template_message: string | null
          total: number | null
          transaction_date: string | null
          updated_at: string | null
          withholding_type:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Insert: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          document_number?: string | null
          id?: string | null
          internal_memo?: string | null
          issue_date?: string | null
          linked_invoice_id?: string | null
          organization_id?: string | null
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_display?: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"] | null
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          transaction_date?: string | null
          updated_at?: string | null
          withholding_type?:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Update: {
          client_destination_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          document_number?: string | null
          id?: string | null
          internal_memo?: string | null
          issue_date?: string | null
          linked_invoice_id?: string | null
          organization_id?: string | null
          recipient_snapshot?: Json | null
          remarks?: string | null
          sender_snapshot?: Json | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_display?: Database["public"]["Enums"]["tax_display_mode"] | null
          tax_rounding?: Database["public"]["Enums"]["tax_rounding"] | null
          template_key?: string | null
          template_message?: string | null
          total?: number | null
          transaction_date?: string | null
          updated_at?: string | null
          withholding_type?:
            | Database["public"]["Enums"]["withholding_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_client_destination_id_fkey"
            columns: ["client_destination_id"]
            isOneToOne: false
            referencedRelation: "client_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_trashed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_has_role_in_org: {
        Args: {
          _org: string
          _roles: Database["public"]["Enums"]["member_role"][]
        }
        Returns: boolean
      }
      auth_org_ids: { Args: never; Returns: string[] }
      auth_shares_org_with: { Args: { _user: string }; Returns: boolean }
      get_public_order_form: { Args: { _token: string }; Returns: Json }
      get_shared_document: { Args: { _token: string }; Returns: Json }
      is_company_profile_complete: { Args: { _org: string }; Returns: boolean }
      next_document_number: {
        Args: { _doc_type: string; _issue_date: string; _org: string }
        Returns: string
      }
      purge_trashed_documents: { Args: never; Returns: undefined }
      seed_default_order_statuses: {
        Args: { _org: string }
        Returns: undefined
      }
      submit_public_order_form: {
        Args: {
          _client_name: string
          _email: string
          _payload: Json
          _phone: string
          _token: string
        }
        Returns: string
      }
    }
    Enums: {
      document_status:
        | "draft"
        | "issued"
        | "sent"
        | "confirmed"
        | "overdue"
        | "trashed"
      member_role: "owner" | "admin" | "member" | "viewer"
      order_system_status: "unprocessed" | "processed" | "trash"
      payment_option: "none" | "card_plus" | "deferred_plus"
      periodic_cycle: "monthly" | "yearly" | "weekly"
      plan_tier: "free_trial" | "starter" | "standard" | "pro"
      tax_category:
        | "follow_company"
        | "standard_10"
        | "reduced_8"
        | "standard_8"
        | "exempt"
        | "standard_5"
      tax_display_mode:
        | "separate"
        | "separate_on_invoice"
        | "included"
        | "exempt"
      tax_rounding: "round_down" | "round_up" | "round_half"
      withholding_type: "none" | "with_recovery" | "without_recovery"
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
      document_status: [
        "draft",
        "issued",
        "sent",
        "confirmed",
        "overdue",
        "trashed",
      ],
      member_role: ["owner", "admin", "member", "viewer"],
      order_system_status: ["unprocessed", "processed", "trash"],
      payment_option: ["none", "card_plus", "deferred_plus"],
      periodic_cycle: ["monthly", "yearly", "weekly"],
      plan_tier: ["free_trial", "starter", "standard", "pro"],
      tax_category: [
        "follow_company",
        "standard_10",
        "reduced_8",
        "standard_8",
        "exempt",
        "standard_5",
      ],
      tax_display_mode: [
        "separate",
        "separate_on_invoice",
        "included",
        "exempt",
      ],
      tax_rounding: ["round_down", "round_up", "round_half"],
      withholding_type: ["none", "with_recovery", "without_recovery"],
    },
  },
} as const
