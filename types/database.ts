export interface Database {
  public: {
    Tables: {
      uploads_evento: {
        Row: {
          id: string;
          guest_name: string | null;
          message: string | null;
          original_file_name: string;
          storage_path: string;
          file_size: number;
          mime_type: string;
          abuse_fingerprint: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          guest_name?: string | null;
          message?: string | null;
          original_file_name: string;
          storage_path: string;
          file_size: number;
          mime_type: string;
          abuse_fingerprint?: string | null;
          created_at?: string;
        };
        Update: {
          guest_name?: string | null;
          message?: string | null;
          original_file_name?: string;
          storage_path?: string;
          file_size?: number;
          mime_type?: string;
          abuse_fingerprint?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type UploadRecord = Database["public"]["Tables"]["uploads_evento"]["Row"];

