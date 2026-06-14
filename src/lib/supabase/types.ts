/**
 * Hand-written Database types matching 001_initial_schema.sql.
 * Run `npx supabase gen types typescript` to regenerate from a live project.
 *
 * NOTE: Every table entry MUST include `Relationships: []` — the Supabase
 * JS SDK v2 requires this field in its GenericTable constraint; without it
 * all `.from('table')` calls resolve to `never`.
 */

export type ProjectStatus = "active" | "paused" | "archived";
export type RoadmapStatus = "planned" | "in_progress" | "completed";
export type EventType     = "note" | "decision" | "maintenance" | "milestone" | "git_commit";
export type LinkType      = "github" | "docs" | "production" | "design" | "other";

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string; owner_id: string; name: string;
          brief: string | null; description: string | null; problem_statement: string | null;
          status: ProjectStatus; logo_url: string | null; logo_s3_key: string | null;
          pinned: boolean; hidden: boolean;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; owner_id: string; name: string;
          brief?: string | null; description?: string | null; problem_statement?: string | null;
          status?: ProjectStatus; logo_url?: string | null; logo_s3_key?: string | null;
          pinned?: boolean; hidden?: boolean;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; owner_id?: string; name?: string;
          brief?: string | null; description?: string | null; problem_statement?: string | null;
          status?: ProjectStatus; logo_url?: string | null; logo_s3_key?: string | null;
          pinned?: boolean; hidden?: boolean;
          created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };

      project_shares: {
        Row: { id: string; project_id: string; clerk_user_id: string };
        Insert: { id?: string; project_id: string; clerk_user_id: string };
        Update: { id?: string; project_id?: string; clerk_user_id?: string };
        Relationships: [];
      };

      github_repos: {
        Row: {
          id: string; project_id: string; github_id: number | null;
          full_name: string; default_branch: string;
          description: string | null; stars: number; last_synced_at: string | null;
        };
        Insert: {
          id?: string; project_id: string; github_id?: number | null;
          full_name: string; default_branch?: string;
          description?: string | null; stars?: number; last_synced_at?: string | null;
        };
        Update: {
          id?: string; project_id?: string; github_id?: number | null;
          full_name?: string; default_branch?: string;
          description?: string | null; stars?: number; last_synced_at?: string | null;
        };
        Relationships: [];
      };

      roadmap_items: {
        Row: {
          id: string; project_id: string; title: string;
          description: string | null; status: RoadmapStatus; sort_order: number;
        };
        Insert: {
          id?: string; project_id: string; title: string;
          description?: string | null; status?: RoadmapStatus; sort_order?: number;
        };
        Update: {
          id?: string; project_id?: string; title?: string;
          description?: string | null; status?: RoadmapStatus; sort_order?: number;
        };
        Relationships: [];
      };

      timeline_events: {
        Row: {
          id: string; project_id: string; type: EventType;
          title: string; body: string | null; event_date: string;
          metadata: { sha?: string; url?: string; authorName?: string } | null;
        };
        Insert: {
          id?: string; project_id: string; type: EventType;
          title: string; body?: string | null; event_date?: string;
          metadata?: { sha?: string; url?: string; authorName?: string } | null;
        };
        Update: {
          id?: string; project_id?: string; type?: EventType;
          title?: string; body?: string | null; event_date?: string;
          metadata?: { sha?: string; url?: string; authorName?: string } | null;
        };
        Relationships: [];
      };

      calendar_events: {
        Row: { id: string; project_id: string; date: string; title: string; completed: boolean };
        Insert: { id?: string; project_id: string; date: string; title: string; completed?: boolean };
        Update: { id?: string; project_id?: string; date?: string; title?: string; completed?: boolean };
        Relationships: [];
      };

      project_notes: {
        Row: { id: string; project_id: string; content: string; created_at: string };
        Insert: { id?: string; project_id: string; content: string; created_at?: string };
        Update: { id?: string; project_id?: string; content?: string; created_at?: string };
        Relationships: [];
      };

      markdown_notes: {
        Row: { id: string; project_id: string; title: string; content: string; created_at: string; updated_at: string };
        Insert: { id?: string; project_id: string; title?: string; content?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; project_id?: string; title?: string; content?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };

      folders: {
        Row: { id: string; project_id: string; name: string };
        Insert: { id?: string; project_id: string; name: string };
        Update: { id?: string; project_id?: string; name?: string };
        Relationships: [];
      };

      project_links: {
        Row: { id: string; project_id: string; folder_id: string | null; title: string; url: string; type: LinkType; tags: string[] };
        Insert: { id?: string; project_id: string; folder_id?: string | null; title: string; url: string; type?: LinkType; tags?: string[] };
        Update: { id?: string; project_id?: string; folder_id?: string | null; title?: string; url?: string; type?: LinkType; tags?: string[] };
        Relationships: [];
      };

      project_files: {
        Row: { id: string; project_id: string; folder_id: string | null; name: string; mime_type: string; size: number; storage_path: string; tags: string[]; created_at: string };
        Insert: { id?: string; project_id: string; folder_id?: string | null; name: string; mime_type: string; size: number; storage_path: string; tags?: string[]; created_at?: string };
        Update: { id?: string; project_id?: string; folder_id?: string | null; name?: string; mime_type?: string; size?: number; storage_path?: string; tags?: string[]; created_at?: string };
        Relationships: [];
      };

      credentials: {
        Row: { id: string; project_id: string; title: string; created_at: string; updated_at: string };
        Insert: { id?: string; project_id: string; title: string; created_at?: string; updated_at?: string };
        Update: { id?: string; project_id?: string; title?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };

      credential_pairs: {
        Row: { id: string; credential_id: string; key: string; value: string; sort_order: number };
        Insert: { id?: string; credential_id: string; key: string; value: string; sort_order?: number };
        Update: { id?: string; credential_id?: string; key?: string; value?: string; sort_order?: number };
        Relationships: [];
      };

      owner_settings: {
        Row: { owner_id: string; created_at: string; github_token: string | null };
        Insert: { owner_id: string; created_at?: string; github_token?: string | null };
        Update: { owner_id?: string; created_at?: string; github_token?: string | null };
        Relationships: [];
      };

      access_events: {
        Row: {
          id: number; email: string; name: string | null;
          action: string; expires_at: string | null; created_at: string;
        };
        Insert: {
          email: string; name?: string | null;
          action: string; expires_at?: string | null; created_at?: string;
        };
        Update: {
          email?: string; name?: string | null;
          action?: string; expires_at?: string | null; created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
