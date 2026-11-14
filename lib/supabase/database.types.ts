// Generated from the Supabase schema (supabase/migrations). Regenerate after schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      calendar_feeds: {
        Row: {
          created_at: string
          id: string
          last_accessed_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          token_hash: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          done_at: string | null
          id: string
          notes: string | null
          remind_at: string
          subject_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          id?: string
          notes?: string | null
          remind_at: string
          subject_id?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          id?: string
          notes?: string | null
          remind_at?: string
          subject_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          id: string
          minutes: number
          note: string | null
          started_at: string | null
          studied_on: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutes: number
          note?: string | null
          started_at?: string | null
          studied_on: string
          subject_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes?: number
          note?: string | null
          started_at?: string | null
          studied_on?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          created_at: string
          done_at: string | null
          due_on: string | null
          id: string
          notes: string | null
          priority: number
          subject_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          due_on?: string | null
          id?: string
          notes?: string | null
          priority?: number
          subject_id?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          due_on?: string | null
          id?: string
          notes?: string | null
          priority?: number
          subject_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      academic_years: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          is_current: boolean
          label: string
          starts_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          is_current?: boolean
          label: string
          starts_on: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          is_current?: boolean
          label?: string
          starts_on?: string
          user_id?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          component_id: string | null
          counts: boolean
          created_at: string
          criteria: Json
          due_on: string
          external_uid: string | null
          id: string
          kind: Database["public"]["Enums"]["assessment_kind"]
          max_score: number | null
          notes: string | null
          raw_score: number | null
          source: Database["public"]["Enums"]["record_source"]
          status: Database["public"]["Enums"]["assessment_status"]
          subject_id: string
          title: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          component_id?: string | null
          counts?: boolean
          created_at?: string
          criteria?: Json
          due_on: string
          external_uid?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["assessment_kind"]
          max_score?: number | null
          notes?: string | null
          raw_score?: number | null
          source?: Database["public"]["Enums"]["record_source"]
          status?: Database["public"]["Enums"]["assessment_status"]
          subject_id: string
          title: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Update: {
          component_id?: string | null
          counts?: boolean
          created_at?: string
          criteria?: Json
          due_on?: string
          external_uid?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["assessment_kind"]
          max_score?: number | null
          notes?: string | null
          raw_score?: number | null
          source?: Database["public"]["Enums"]["record_source"]
          status?: Database["public"]["Enums"]["assessment_status"]
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_component_id_user_id_fkey"
            columns: ["component_id", "user_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "assessments_subject_id_user_id_fkey"
            columns: ["subject_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      components: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          subject_id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          subject_id: string
          user_id?: string
          weight: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          subject_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "components_subject_id_user_id_fkey"
            columns: ["subject_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          ends_on: string | null
          external_uid: string | null
          id: string
          kind: Database["public"]["Enums"]["event_kind"]
          source: Database["public"]["Enums"]["record_source"]
          starts_at: string | null
          starts_on: string | null
          subject_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          ends_on?: string | null
          external_uid?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          source?: Database["public"]["Enums"]["record_source"]
          starts_at?: string | null
          starts_on?: string | null
          subject_id?: string | null
          title: string
          user_id?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          ends_on?: string | null
          external_uid?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          source?: Database["public"]["Enums"]["record_source"]
          starts_at?: string | null
          starts_on?: string | null
          subject_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_subject_id_user_id_fkey"
            columns: ["subject_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          current_value: number | null
          deadline: string | null
          id: string
          metric: Database["public"]["Enums"]["goal_metric"]
          subject_id: string | null
          target_value: number
          title: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          id?: string
          metric?: Database["public"]["Enums"]["goal_metric"]
          subject_id?: string | null
          target_value: number
          title: string
          user_id?: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          id?: string
          metric?: Database["public"]["Enums"]["goal_metric"]
          subject_id?: string | null
          target_value?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_subject_id_user_id_fkey"
            columns: ["subject_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      import_runs: {
        Row: {
          added: number
          error: string | null
          finished_at: string | null
          id: string
          integration_id: string | null
          kind: string
          skipped: number
          started_at: string
          status: string
          updated: number
          user_id: string
        }
        Insert: {
          added?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          integration_id?: string | null
          kind?: string
          skipped?: number
          started_at?: string
          status?: string
          updated?: number
          user_id?: string
        }
        Update: {
          added?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          integration_id?: string | null
          kind?: string
          skipped?: number
          started_at?: string
          status?: string
          updated?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_integration_id_user_id_fkey"
            columns: ["integration_id", "user_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      integrations: {
        Row: {
          created_at: string
          feed_host: string | null
          feed_url_ciphertext: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_host?: string | null
          feed_url_ciphertext?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          feed_host?: string | null
          feed_url_ciphertext?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          title: string
          user_id?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent: string
          core_points: number | null
          created_at: string
          default_aggregation: Database["public"]["Enums"]["aggregation"]
          density: string
          display_name: string
          id: string
          programme: Database["public"]["Enums"]["programme"]
          school_name: string | null
          updated_at: string
          week_start: number
          year_level: number | null
          timezone: string
          brief_enabled: boolean
          brief_time: string
          brief_days: number
          daily_study_goal_minutes: number
          weekly_study_goal_minutes: number
        }
        Insert: {
          accent?: string
          core_points?: number | null
          created_at?: string
          default_aggregation?: Database["public"]["Enums"]["aggregation"]
          density?: string
          display_name?: string
          id: string
          programme?: Database["public"]["Enums"]["programme"]
          school_name?: string | null
          updated_at?: string
          week_start?: number
          year_level?: number | null
          timezone?: string
          brief_enabled?: boolean
          brief_time?: string
          brief_days?: number
          daily_study_goal_minutes?: number
          weekly_study_goal_minutes?: number
        }
        Update: {
          accent?: string
          core_points?: number | null
          created_at?: string
          default_aggregation?: Database["public"]["Enums"]["aggregation"]
          density?: string
          display_name?: string
          id?: string
          programme?: Database["public"]["Enums"]["programme"]
          school_name?: string | null
          updated_at?: string
          week_start?: number
          year_level?: number | null
          timezone?: string
          brief_enabled?: boolean
          brief_time?: string
          brief_days?: number
          daily_study_goal_minutes?: number
          weekly_study_goal_minutes?: number
        }
        Relationships: []
      }
      subjects: {
        Row: {
          academic_year_id: string
          aggregation: Database["public"]["Enums"]["aggregation"]
          archived: boolean
          boundaries: Json | null
          color: string
          created_at: string
          id: string
          level: Database["public"]["Enums"]["subject_level"]
          managebac_match: string | null
          name: string
          position: number
          programme: Database["public"]["Enums"]["programme"]
          reported_grade: number | null
          subject_group: string | null
          target_grade: number | null
          teacher: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year_id: string
          aggregation?: Database["public"]["Enums"]["aggregation"]
          archived?: boolean
          boundaries?: Json | null
          color?: string
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["subject_level"]
          managebac_match?: string | null
          name: string
          position?: number
          programme?: Database["public"]["Enums"]["programme"]
          reported_grade?: number | null
          subject_group?: string | null
          target_grade?: number | null
          teacher?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          academic_year_id?: string
          aggregation?: Database["public"]["Enums"]["aggregation"]
          archived?: boolean
          boundaries?: Json | null
          color?: string
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["subject_level"]
          managebac_match?: string | null
          name?: string
          position?: number
          programme?: Database["public"]["Enums"]["programme"]
          reported_grade?: number | null
          subject_group?: string | null
          target_grade?: number | null
          teacher?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_academic_year_id_user_id_fkey"
            columns: ["academic_year_id", "user_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calendar_feed: { Args: { p_token: string }; Returns: Json }
      delete_my_account: { Args: never; Returns: undefined }
      valid_boundaries: { Args: { b: Json }; Returns: boolean }
      valid_criteria: { Args: { c: Json }; Returns: boolean }
    }
    Enums: {
      aggregation: "average" | "latest" | "highest" | "median"
      assessment_kind: "summative" | "exam" | "mock" | "ia" | "formative" | "other"
      assessment_status: "upcoming" | "graded"
      event_kind: "deadline" | "exam" | "event" | "study"
      goal_metric: "subject_grade" | "total_points" | "custom"
      programme: "MYP" | "DP"
      record_source: "manual" | "managebac" | "csv" | "google"
      subject_level: "SL" | "HL" | "MYP"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
