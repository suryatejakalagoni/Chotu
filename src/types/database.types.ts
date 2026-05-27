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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignment_attachments: {
        Row: {
          assignment_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_key: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_key: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_attachments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_reminders: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          reminder_type: Database["public"]["Enums"]["reminder_type"] | null
          sent: boolean
          trigger_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"] | null
          sent?: boolean
          trigger_at: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"] | null
          sent?: boolean
          trigger_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_reminders_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          due_at: string
          estimated_minutes: number | null
          grade: string | null
          id: string
          is_recurring: boolean
          notes: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          recurrence_rule: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          subject: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          due_at: string
          estimated_minutes?: number | null
          grade?: string | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          recurrence_rule?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          subject: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string
          estimated_minutes?: number | null
          grade?: string | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          recurrence_rule?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          subject?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_completions: {
        Row: {
          assignment_id: string
          completed_at: string
          id: string
          occurrence_date: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string
          id?: string
          occurrence_date: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string
          id?: string
          occurrence_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_alerts: {
        Row: {
          budget_id: string
          created_at: string
          id: string
          sent: boolean
          sent_at: string | null
          threshold: number
          user_id: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          id?: string
          sent?: boolean
          sent_at?: string | null
          threshold?: number
          user_id: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          id?: string
          sent?: boolean
          sent_at?: string | null
          threshold?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          name: string
          period: string
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          name: string
          period?: string
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string
          period?: string
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          content_type: string
          created_at: string
          deleted_at: string | null
          description: string | null
          download_count: number
          expires_at: string | null
          external_url: string | null
          id: string
          is_anonymous: boolean
          is_pinned: boolean
          storage_key: string | null
          subject_tag: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          download_count?: number
          expires_at?: string | null
          external_url?: string | null
          id?: string
          is_anonymous?: boolean
          is_pinned?: boolean
          storage_key?: string | null
          subject_tag?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          download_count?: number
          expires_at?: string | null
          external_url?: string | null
          id?: string
          is_anonymous?: boolean
          is_pinned?: boolean
          storage_key?: string | null
          subject_tag?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_votes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
          value: number  // 1 = upvote, -1 = downvote
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attachments: {
        Row: {
          created_at: string
          exam_id: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attachments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_reminders: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          trigger_at: string
          reminder_type: Database["public"]["Enums"]["reminder_type"] | null
          sent: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          trigger_at: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"] | null
          sent?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          trigger_at?: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"] | null
          sent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_reminders_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_topics: {
        Row: {
          created_at: string
          is_revised: boolean
          revised_at: string | null
          exam_id: string
          id: string
          topic_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_revised?: boolean
          revised_at?: string | null
          exam_id: string
          id?: string
          topic_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_revised?: boolean
          revised_at?: string | null
          exam_id?: string
          id?: string
          topic_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_topics_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          archived_at: string | null
          created_at: string
          duration_min: number | null
          exam_at: string
          exam_type: string | null
          id: string
          notes: string | null
          score: string | null
          status: Database["public"]["Enums"]["exam_status"]
          subject: string
          syllabus_text: string | null
          title: string
          updated_at: string
          user_id: string
          venue: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          duration_min?: number | null
          exam_at: string
          exam_type?: string | null
          id?: string
          notes?: string | null
          score?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          subject: string
          syllabus_text?: string | null
          title: string
          updated_at?: string
          user_id: string
          venue?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          duration_min?: number | null
          exam_at?: string
          exam_type?: string | null
          id?: string
          notes?: string | null
          score?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          subject?: string
          syllabus_text?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          venue?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          spent_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          spent_at?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          spent_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          notes: string | null
          received_at: string
          source: string | null
          title: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          received_at?: string
          source?: string | null
          title: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          received_at?: string
          source?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: number
          ip: string
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: number
          ip: string
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: number
          ip?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: string | null
          college: string | null
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          username: string
          year: number | null
        }
        Insert: {
          branch?: string | null
          college?: string | null
          created_at?: string
          display_name: string
          id: string
          is_admin?: boolean
          username: string
          year?: number | null
        }
        Update: {
          branch?: string | null
          college?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
          username?: string
          year?: number | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          attempted_at: string
          id: number
          key: string
        }
        Insert: {
          attempted_at?: string
          id?: number
          key: string
        }
        Update: {
          attempted_at?: string
          id?: number
          key?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string
          current_amount: number
          deadline: string | null
          id: string
          notes: string | null
          target_amount: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          notes?: string | null
          target_amount: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          notes?: string | null
          target_amount?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      split_group_members: {
        Row: {
          friend_id: string
          group_id: string
          id: string
          joined_at: string
        }
        Insert: {
          friend_id: string
          group_id: string
          id?: string
          joined_at?: string
        }
        Update: {
          friend_id?: string
          group_id?: string
          id?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "split_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_group_members_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "friends"
            referencedColumns: ["id"]
          },
        ]
      }
      split_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      split_shares: {
        Row: {
          amount_owed: number
          created_at: string
          friend_id: string
          id: string
          is_settled: boolean
          settled_at: string | null
          split_id: string
        }
        Insert: {
          amount_owed: number
          created_at?: string
          friend_id: string
          id?: string
          is_settled?: boolean
          settled_at?: string | null
          split_id: string
        }
        Update: {
          amount_owed?: number
          created_at?: string
          friend_id?: string
          id?: string
          is_settled?: boolean
          settled_at?: string | null
          split_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_shares_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_shares_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "friends"
            referencedColumns: ["id"]
          },
        ]
      }
      splits: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_id: string | null
          id: string
          paid_at: string
          paid_by: string
          status: Database["public"]["Enums"]["split_status"]
          title: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_id?: string | null
          id?: string
          paid_at?: string
          paid_by: string
          status?: Database["public"]["Enums"]["split_status"]
          title: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string | null
          id?: string
          paid_at?: string
          paid_by?: string
          status?: Database["public"]["Enums"]["split_status"]
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "splits_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "split_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_entries: {
        Row: {
          created_at: string
          duration_sec: number | null
          error_message: string | null
          id: string
          parsed_action: Json | null
          status: Database["public"]["Enums"]["voice_status"]
          storage_key: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          error_message?: string | null
          id?: string
          parsed_action?: Json | null
          status?: Database["public"]["Enums"]["voice_status"]
          storage_key: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          error_message?: string | null
          id?: string
          parsed_action?: Json | null
          status?: Database["public"]["Enums"]["voice_status"]
          storage_key?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      assignment_status: "not_started" | "in_progress" | "done"
      // TODO: consolidate to one canonical status set — 'completed'/'cancelled' are Day 7 legacy; 'ongoing'/'done'/'missed' are Phase 6 UI values
      exam_status: "upcoming" | "completed" | "cancelled" | "ongoing" | "done" | "missed"
      priority_level: "low" | "medium" | "high"
      reminder_type: "1_day" | "3_hours" | "morning_of" | "custom" | "1_week" | "3_days" | "1_hour"
      split_status: "pending" | "settled"
      voice_status: "pending" | "processed" | "failed"
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
      assignment_status: ["not_started", "in_progress", "done"],
      exam_status: ["upcoming", "completed", "cancelled", "ongoing", "done", "missed"],
      priority_level: ["low", "medium", "high"],
      reminder_type: ["1_day", "3_hours", "morning_of", "custom", "1_week", "3_days", "1_hour"],
      split_status: ["pending", "settled"],
      voice_status: ["pending", "processed", "failed"],
    },
  },
} as const
