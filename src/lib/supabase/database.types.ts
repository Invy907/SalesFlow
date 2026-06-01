// Auto-generated Supabase database types.
// Regenerate: supabase gen types typescript --project-id <project-ref> > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          plan: "free_trial" | "starter" | "standard" | "pro";
          service_contract_id: string | null;
          yayoi_linked: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organizations"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          locale: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: "owner" | "admin" | "member" | "viewer";
          invited_by: string | null;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organization_members"]["Row"], "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["organization_members"]["Insert"]>;
      };
      organization_invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: "owner" | "admin" | "member" | "viewer";
          token: string;
          expires_at: string | null;
          accepted_at: string | null;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organization_invitations"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["organization_invitations"]["Insert"]>;
      };
      company_profiles: {
        Row: {
          organization_id: string;
          postal_code: string | null;
          address_line1: string | null;
          address_line2: string | null;
          address_line3: string | null;
          company_name_line1: string | null;
          company_name_line2: string | null;
          company_name_line3: string | null;
          tel: string | null;
          fax: string | null;
          email: string | null;
          invoice_registration_number: string | null;
          logo_path: string | null;
          seal_path: string | null;
          representative_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["company_profiles"]["Row"], "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["company_profiles"]["Insert"]>;
      };
      document_defaults: {
        Row: {
          organization_id: string;
          numbering_rule: string | null;
          line_item_label_name: string | null;
          line_item_label_qty: string | null;
          line_item_label_price: string | null;
          line_item_label_amount: string | null;
          estimate_heading: string | null;
          estimate_message: string | null;
          estimate_remarks: string | null;
          delivery_note_message: string | null;
          delivery_note_remarks: string | null;
          invoice_message: string | null;
          invoice_remarks: string | null;
          receipt_message: string | null;
          receipt_remarks: string | null;
          estimate_template_key: string | null;
          delivery_note_template_key: string | null;
          invoice_template_key: string | null;
          receipt_template_key: string | null;
          category_format_always_print: boolean | null;
          tax_display_default: "separate" | "separate_on_invoice" | "included" | "exempt" | null;
          tax_rounding_default: "round_down" | "round_up" | "round_half" | null;
          withholding_default: "none" | "with_recovery" | "without_recovery" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["document_defaults"]["Row"], "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["document_defaults"]["Insert"]>;
      };
      display_settings: {
        Row: {
          organization_id: string;
          list_page_size: number | null;
          home_page_after_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["display_settings"]["Row"], "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["display_settings"]["Insert"]>;
      };
      feature_flags: {
        Row: {
          organization_id: string;
          flags: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["feature_flags"]["Row"], "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["feature_flags"]["Insert"]>;
      };
      bank_accounts: {
        Row: {
          id: string;
          organization_id: string;
          display_order: number | null;
          bank_name: string | null;
          branch_name: string | null;
          account_type: "futsu" | "touza" | "chochiku" | null;
          account_number: string | null;
          account_holder: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bank_accounts"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["bank_accounts"]["Insert"]>;
      };
      clients: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          furigana: string | null;
          corp_number: string | null;
          management_code: string | null;
          department: string | null;
          email: string | null;
          email_cc: string[] | null;
          phone: string | null;
          fax: string | null;
          honorific: string | null;
          memo: string | null;
          is_favorite: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clients"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
      };
      client_destinations: {
        Row: {
          id: string;
          client_id: string;
          label: string | null;
          postal_code: string | null;
          address_line1: string | null;
          address_line2: string | null;
          mailing_line1: string | null;
          mailing_line2: string | null;
          mailing_line3: string | null;
          mailing_line4: string | null;
          email: string | null;
          email_cc: string[] | null;
          honorific: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["client_destinations"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["client_destinations"]["Insert"]>;
      };
      items: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          unit: string | null;
          unit_price: number;
          tax_category: "follow_company" | "standard_10" | "reduced_8" | "standard_8" | "exempt" | "standard_5";
          withholding_exempt: boolean;
          tax_exempt_flag: boolean | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["items"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["items"]["Insert"]>;
      };
      estimates: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string | null;
          client_destination_id: string | null;
          document_number: string;
          subject: string | null;
          issue_date: string;
          status: "draft" | "issued" | "sent" | "confirmed" | "overdue" | "trashed";
          internal_memo: string | null;
          recipient_snapshot: Json | null;
          sender_snapshot: Json | null;
          tax_display: "separate" | "separate_on_invoice" | "included" | "exempt";
          tax_rounding: "round_down" | "round_up" | "round_half";
          withholding_type: "none" | "with_recovery" | "without_recovery";
          template_key: string | null;
          template_message: string | null;
          remarks: string | null;
          subtotal: number;
          tax_amount: number;
          total: number;
          created_by: string | null;
          deleted_at: string | null;
          share_token: string | null;
          expiry_date: string | null;
          ordered_at: string | null;
          ordered_order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["estimates"]["Row"], "id" | "total" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["estimates"]["Insert"]>;
      };
      estimate_line_items: {
        Row: {
          id: string;
          document_id: string;
          line_no: number;
          item_id: string | null;
          name_snapshot: string;
          qty: number;
          unit_snapshot: string | null;
          unit_price_snapshot: number;
          tax_category: "follow_company" | "standard_10" | "reduced_8" | "standard_8" | "exempt" | "standard_5";
          tax_rate_snapshot: number;
          withholding_exempt_snapshot: boolean | null;
          line_subtotal: number;
        };
        Insert: Omit<Database["public"]["Tables"]["estimate_line_items"]["Row"], "id" | "line_subtotal"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["estimate_line_items"]["Insert"]>;
      };
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string | null;
          client_destination_id: string | null;
          document_number: string;
          subject: string | null;
          issue_date: string;
          status: "draft" | "issued" | "sent" | "confirmed" | "overdue" | "trashed";
          internal_memo: string | null;
          recipient_snapshot: Json | null;
          sender_snapshot: Json | null;
          tax_display: "separate" | "separate_on_invoice" | "included" | "exempt";
          tax_rounding: "round_down" | "round_up" | "round_half";
          withholding_type: "none" | "with_recovery" | "without_recovery";
          template_key: string | null;
          template_message: string | null;
          remarks: string | null;
          subtotal: number;
          tax_amount: number;
          total: number;
          created_by: string | null;
          deleted_at: string | null;
          share_token: string | null;
          payment_due: string | null;
          delivery_date: string | null;
          billing_month: string | null;
          payment_option: "none" | "card_plus" | "deferred_plus";
          bank_account_ids: string[] | null;
          card_payment_enabled: boolean | null;
          card_qr_print: boolean | null;
          gmo_pg_member_id: string | null;
          category_format_always_print: boolean | null;
          paid_amount: number;
          paid_at: string | null;
          periodic_schedule_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invoices"]["Row"], "id" | "total" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      invoice_line_items: {
        Row: {
          id: string;
          document_id: string;
          line_no: number;
          item_id: string | null;
          name_snapshot: string;
          qty: number;
          unit_snapshot: string | null;
          unit_price_snapshot: number;
          tax_category: "follow_company" | "standard_10" | "reduced_8" | "standard_8" | "exempt" | "standard_5";
          tax_rate_snapshot: number;
          withholding_exempt_snapshot: boolean | null;
          line_subtotal: number;
        };
        Insert: Omit<Database["public"]["Tables"]["invoice_line_items"]["Row"], "id" | "line_subtotal"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["invoice_line_items"]["Insert"]>;
      };
      delivery_notes: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string | null;
          client_destination_id: string | null;
          document_number: string;
          subject: string | null;
          issue_date: string;
          status: "draft" | "issued" | "sent" | "confirmed" | "overdue" | "trashed";
          internal_memo: string | null;
          recipient_snapshot: Json | null;
          sender_snapshot: Json | null;
          tax_display: "separate" | "separate_on_invoice" | "included" | "exempt";
          tax_rounding: "round_down" | "round_up" | "round_half";
          withholding_type: "none" | "with_recovery" | "without_recovery";
          template_key: string | null;
          template_message: string | null;
          remarks: string | null;
          subtotal: number;
          tax_amount: number;
          total: number;
          created_by: string | null;
          deleted_at: string | null;
          share_token: string | null;
          delivery_date: string | null;
          linked_invoice_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["delivery_notes"]["Row"], "id" | "total" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["delivery_notes"]["Insert"]>;
      };
      delivery_note_line_items: {
        Row: {
          id: string;
          document_id: string;
          line_no: number;
          item_id: string | null;
          name_snapshot: string;
          qty: number;
          unit_snapshot: string | null;
          unit_price_snapshot: number;
          tax_category: "follow_company" | "standard_10" | "reduced_8" | "standard_8" | "exempt" | "standard_5";
          tax_rate_snapshot: number;
          withholding_exempt_snapshot: boolean | null;
          line_subtotal: number;
        };
        Insert: Omit<Database["public"]["Tables"]["delivery_note_line_items"]["Row"], "id" | "line_subtotal"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["delivery_note_line_items"]["Insert"]>;
      };
      receipts: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string | null;
          client_destination_id: string | null;
          document_number: string;
          subject: string | null;
          issue_date: string;
          status: "draft" | "issued" | "sent" | "confirmed" | "overdue" | "trashed";
          internal_memo: string | null;
          recipient_snapshot: Json | null;
          sender_snapshot: Json | null;
          tax_display: "separate" | "separate_on_invoice" | "included" | "exempt";
          tax_rounding: "round_down" | "round_up" | "round_half";
          withholding_type: "none" | "with_recovery" | "without_recovery";
          template_key: string | null;
          template_message: string | null;
          remarks: string | null;
          subtotal: number;
          tax_amount: number;
          total: number;
          created_by: string | null;
          deleted_at: string | null;
          share_token: string | null;
          transaction_date: string | null;
          linked_invoice_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["receipts"]["Row"], "id" | "total" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["receipts"]["Insert"]>;
      };
      receipt_line_items: {
        Row: {
          id: string;
          document_id: string;
          line_no: number;
          item_id: string | null;
          name_snapshot: string;
          qty: number;
          unit_snapshot: string | null;
          unit_price_snapshot: number;
          tax_category: "follow_company" | "standard_10" | "reduced_8" | "standard_8" | "exempt" | "standard_5";
          tax_rate_snapshot: number;
          withholding_exempt_snapshot: boolean | null;
          line_subtotal: number;
        };
        Insert: Omit<Database["public"]["Tables"]["receipt_line_items"]["Row"], "id" | "line_subtotal"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["receipt_line_items"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          organization_id: string;
          invoice_id: string;
          client_id: string | null;
          paid_at: string;
          amount: number;
          method: "bank" | "card" | "cash" | "other" | null;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string | null;
          order_number: string;
          order_date: string;
          delivery_date: string | null;
          order_time: string | null;
          subject: string | null;
          status_id: string | null;
          comment: string | null;
          source_estimate_id: string | null;
          source_order_form_submission_id: string | null;
          subtotal: number;
          tax_amount: number;
          total: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "total" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      order_statuses: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          display_order: number | null;
          is_system: boolean;
          system_key: "unprocessed" | "processed" | "trash" | null;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["order_statuses"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["order_statuses"]["Insert"]>;
      };
      order_forms: {
        Row: {
          id: string;
          organization_id: string;
          name: string | null;
          client_name_required: boolean;
          subject: string | null;
          logo_path: string | null;
          expiration_mode: "date" | "none" | null;
          expiration_date: string | null;
          public_token: string;
          is_published: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["order_forms"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["order_forms"]["Insert"]>;
      };
      order_form_submissions: {
        Row: {
          id: string;
          order_form_id: string;
          organization_id: string;
          client_name_input: string | null;
          email_input: string | null;
          phone_input: string | null;
          payload: Json | null;
          submitted_at: string;
          converted_order_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["order_form_submissions"]["Row"], "id" | "submitted_at"> & { id?: string; submitted_at?: string };
        Update: Partial<Database["public"]["Tables"]["order_form_submissions"]["Insert"]>;
      };
      inbox_messages: {
        Row: {
          id: string;
          organization_id: string;
          kind: "received_document" | "system" | "announcement";
          subject: string | null;
          body: string | null;
          payload: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["inbox_messages"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["inbox_messages"]["Insert"]>;
      };
      usage_events: {
        Row: {
          id: string;
          organization_id: string;
          event_date: string;
          kind: string;
          count: number;
          amount_jpy: number;
          reference_table: string | null;
          reference_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["usage_events"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["usage_events"]["Insert"]>;
      };
      share_tokens: {
        Row: {
          token: string;
          organization_id: string;
          target_table: "estimates" | "invoices" | "receipts" | "delivery_notes";
          target_id: string;
          created_by: string | null;
          expires_at: string | null;
          revoked_at: string | null;
        };
        Insert: Database["public"]["Tables"]["share_tokens"]["Row"];
        Update: Partial<Database["public"]["Tables"]["share_tokens"]["Insert"]>;
      };
    };
    Views: {
      estimates_trashed: { Row: Database["public"]["Tables"]["estimates"]["Row"] };
      invoices_trashed: { Row: Database["public"]["Tables"]["invoices"]["Row"] };
      delivery_notes_trashed: { Row: Database["public"]["Tables"]["delivery_notes"]["Row"] };
      receipts_trashed: { Row: Database["public"]["Tables"]["receipts"]["Row"] };
    };
    Functions: {
      auth_org_ids: { Args: Record<string, never>; Returns: string[] };
      next_document_number: { Args: { _org: string; _doc_type: string; _issue_date: string }; Returns: string };
      get_shared_estimate: { Args: { _token: string }; Returns: Json };
      get_shared_invoice: { Args: { _token: string }; Returns: Json };
      get_shared_receipt: { Args: { _token: string }; Returns: Json };
      get_shared_delivery_note: { Args: { _token: string }; Returns: Json };
      get_public_order_form: { Args: { _token: string }; Returns: Json };
      submit_public_order_form: { Args: { _token: string; _client_name: string; _email: string; _phone: string; _payload: Json }; Returns: string };
      recalculate_invoice_totals: { Args: { _doc_id: string }; Returns: undefined };
    };
    Enums: {
      tax_category: "follow_company" | "standard_10" | "reduced_8" | "standard_8" | "exempt" | "standard_5";
      tax_display_mode: "separate" | "separate_on_invoice" | "included" | "exempt";
      tax_rounding: "round_down" | "round_up" | "round_half";
      withholding_type: "none" | "with_recovery" | "without_recovery";
      document_status: "draft" | "issued" | "sent" | "confirmed" | "overdue" | "trashed";
      periodic_cycle: "monthly" | "yearly" | "weekly";
      payment_option: "none" | "card_plus" | "deferred_plus";
      order_system_status: "unprocessed" | "processed" | "trash";
      member_role: "owner" | "admin" | "member" | "viewer";
      plan_tier: "free_trial" | "starter" | "standard" | "pro";
    };
  };
};
