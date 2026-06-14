// טיפוסי הדאטהבייס. תואם ל-supabase/migrations/0001_init.sql.
// אם משנים את הסכמה — יש לעדכן גם כאן (או לייצר אוטומטית עם `supabase gen types`).

export type FieldType = "text" | "number" | "date" | "signature" | "initials" | "checkbox";
export type SubmissionStatus = "pending" | "opened" | "completed" | "expired";
export type AuditEventType = "sent" | "resent" | "opened" | "completed" | "link_cancelled" | "expired";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: Partial<{ name: string }>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          org_id: string;
          full_name: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: Partial<{ full_name: string | null; role: string; org_id: string }>;
        Relationships: [];
      };
      folders: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          parent_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          parent_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<{ name: string; parent_id: string | null }>;
        Relationships: [];
      };
      forms: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          original_pdf_path: string;
          page_count: number;
          is_reusable: boolean;
          archived_at: string | null;
          folder_id: string | null;
          created_by: string | null;
          visibility: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          original_pdf_path: string;
          page_count?: number;
          is_reusable?: boolean;
          archived_at?: string | null;
          folder_id?: string | null;
          created_by?: string | null;
          visibility?: string;
          created_at?: string;
        };
        Update: Partial<{ name: string; page_count: number; archived_at: string | null; folder_id: string | null; visibility: string }>;
        Relationships: [];
      };
      form_fields: {
        Row: {
          id: string;
          form_id: string;
          page: number;
          x: number;
          y: number;
          width: number;
          height: number;
          type: FieldType;
          label: string;
          required: boolean;
          font_size: number;
          sort_order: number;
          copy_from_field_id: string | null;
          auto_fill_today: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          page: number;
          x: number;
          y: number;
          width: number;
          height: number;
          type: FieldType;
          label: string;
          required?: boolean;
          font_size?: number;
          sort_order?: number;
          copy_from_field_id?: string | null;
          auto_fill_today?: boolean;
          created_at?: string;
        };
        Update: Partial<{
          page: number;
          x: number;
          y: number;
          width: number;
          height: number;
          type: FieldType;
          label: string;
          required: boolean;
          font_size: number;
          sort_order: number;
          copy_from_field_id: string | null;
          auto_fill_today: boolean;
        }>;
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          form_id: string;
          org_id: string;
          recipient_name: string;
          recipient_email: string;
          token_hash: string;
          status: SubmissionStatus;
          expires_at: string;
          sent_at: string | null;
          opened_at: string | null;
          completed_at: string | null;
          completed_pdf_path: string | null;
          created_by: string | null;
          created_at: string;
          handled: boolean;
        };
        Insert: {
          id?: string;
          form_id: string;
          org_id: string;
          recipient_name: string;
          recipient_email: string;
          token_hash: string;
          status?: SubmissionStatus;
          expires_at: string;
          sent_at?: string | null;
          opened_at?: string | null;
          completed_at?: string | null;
          completed_pdf_path?: string | null;
          created_by?: string | null;
          created_at?: string;
          handled?: boolean;
        };
        Update: Partial<{
          status: SubmissionStatus;
          token_hash: string;
          expires_at: string;
          sent_at: string | null;
          opened_at: string | null;
          completed_at: string | null;
          completed_pdf_path: string | null;
          handled: boolean;
        }>;
        Relationships: [];
      };
      submission_values: {
        Row: {
          id: string;
          submission_id: string;
          field_id: string;
          value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          field_id: string;
          value: string;
          created_at?: string;
        };
        Update: Partial<{ value: string }>;
        Relationships: [];
      };
      signature_audit: {
        Row: {
          id: string;
          submission_id: string;
          signer_ip: string | null;
          user_agent: string | null;
          signed_at: string;
          doc_sha256: string;
          signature_image_path: string | null;
        };
        Insert: {
          id?: string;
          submission_id: string;
          signer_ip?: string | null;
          user_agent?: string | null;
          signed_at?: string;
          doc_sha256: string;
          signature_image_path?: string | null;
        };
        Update: Partial<Record<string, never>>;
        Relationships: [];
      };
      submission_audit_log: {
        Row: {
          id: string;
          submission_id: string;
          org_id: string;
          event_type: AuditEventType;
          channel: string | null;
          actor_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          org_id: string;
          event_type: AuditEventType;
          channel?: string | null;
          actor_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<Record<string, never>>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      field_type: FieldType;
      submission_status: SubmissionStatus;
      audit_event_type: AuditEventType;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
