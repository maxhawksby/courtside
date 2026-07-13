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
      channel_members: {
        Row: {
          channel_id: string
          last_read_at: string | null
          muted: boolean
          organization_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          last_read_at?: string | null
          muted?: boolean
          organization_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          last_read_at?: string | null
          muted?: boolean
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_all_hands: boolean
          is_read_only: boolean
          name: string
          organization_id: string
          team_season_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_all_hands?: boolean
          is_read_only?: boolean
          name: string
          organization_id: string
          team_season_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_all_hands?: boolean
          is_read_only?: boolean
          name?: string
          organization_id?: string
          team_season_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_team_season_id_fkey"
            columns: ["team_season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "divisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          arrival_at: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          location: string | null
          notes: string | null
          organization_id: string
          recurrence: Json | null
          starts_at: string
          team_season_id: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          arrival_at?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          organization_id: string
          recurrence?: Json | null
          starts_at: string
          team_season_id?: string | null
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          arrival_at?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          organization_id?: string
          recurrence?: Json | null
          starts_at?: string
          team_season_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_team_season_id_fkey"
            columns: ["team_season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      game_events: {
        Row: {
          client_seq: number
          client_uuid: string
          clock_seconds: number | null
          created_at: string
          device_id: string
          event_type: string
          game_id: string
          id: string
          opponent_player: string | null
          organization_id: string
          payload: Json
          period: number
          person_id: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          client_seq: number
          client_uuid: string
          clock_seconds?: number | null
          created_at?: string
          device_id: string
          event_type: string
          game_id: string
          id?: string
          opponent_player?: string | null
          organization_id: string
          payload?: Json
          period?: number
          person_id?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          client_seq?: number
          client_uuid?: string
          clock_seconds?: number | null
          created_at?: string
          device_id?: string
          event_type?: string
          game_id?: string
          id?: string
          opponent_player?: string | null
          organization_id?: string
          payload?: Json
          period?: number
          person_id?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_home: boolean
          opponent_name: string
          opponent_scoring_mode: string
          organization_id: string
          period_format: string
          scorekeeper_user_id: string | null
          status: string
          team_season_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_home?: boolean
          opponent_name?: string
          opponent_scoring_mode?: string
          organization_id: string
          period_format?: string
          scorekeeper_user_id?: string | null
          status?: string
          team_season_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_home?: boolean
          opponent_name?: string
          opponent_scoring_mode?: string
          organization_id?: string
          period_format?: string
          scorekeeper_user_id?: string | null
          status?: string
          team_season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_team_season_id_fkey"
            columns: ["team_season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      guardianships: {
        Row: {
          created_at: string
          guardian_person_id: string
          id: string
          organization_id: string
          player_person_id: string
          relationship: string | null
        }
        Insert: {
          created_at?: string
          guardian_person_id: string
          id?: string
          organization_id: string
          player_person_id: string
          relationship?: string | null
        }
        Update: {
          created_at?: string
          guardian_person_id?: string
          id?: string
          organization_id?: string
          player_person_id?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardianships_guardian_person_id_fkey"
            columns: ["guardian_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardianships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardianships_player_person_id_fkey"
            columns: ["player_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          is_owner: boolean
          organization_id: string
          person_id: string
        }
        Insert: {
          household_id: string
          is_owner?: boolean
          organization_id: string
          person_id: string
        }
        Update: {
          household_id?: string
          is_owner?: boolean
          organization_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          division_id: string | null
          email: string
          expires_at: string
          id: string
          organization_id: string
          person_id: string | null
          role: string
          scope_type: string
          team_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          division_id?: string | null
          email: string
          expires_at?: string
          id?: string
          organization_id: string
          person_id?: string | null
          role: string
          scope_type?: string
          team_id?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          division_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          person_id?: string | null
          role?: string
          scope_type?: string
          team_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      media_consents: {
        Row: {
          created_at: string
          granted: boolean
          granted_by_user_id: string
          id: string
          note: string | null
          organization_id: string
          player_person_id: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          granted_by_user_id: string
          id?: string
          note?: string | null
          organization_id: string
          player_person_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_by_user_id?: string
          id?: string
          note?: string | null
          organization_id?: string
          player_person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_consents_player_person_id_fkey"
            columns: ["player_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          channel_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          media_paths: string[]
          organization_id: string
          out_of_hours: boolean
          sender_user_id: string
        }
        Insert: {
          body?: string | null
          channel_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          media_paths?: string[]
          organization_id: string
          out_of_hours?: boolean
          sender_user_id: string
        }
        Update: {
          body?: string | null
          channel_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          media_paths?: string[]
          organization_id?: string
          out_of_hours?: boolean
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_roles: {
        Row: {
          created_at: string
          division_id: string | null
          id: string
          organization_id: string
          role: string
          scope_type: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          division_id?: string | null
          id?: string
          organization_id: string
          role: string
          scope_type?: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          division_id?: string | null
          id?: string
          organization_id?: string
          role?: string
          scope_type?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_roles_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          branding: Json
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          branding?: Json
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      persons: {
        Row: {
          created_at: string
          custom_fields: Json
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          organization_id: string
          phone: string | null
          photo_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          organization_id: string
          phone?: string | null
          photo_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          organization_id?: string
          phone?: string | null
          photo_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      persons_sensitive: {
        Row: {
          emergency_contact: Json | null
          medical_notes: string | null
          organization_id: string
          person_id: string
          updated_at: string
        }
        Insert: {
          emergency_contact?: Json | null
          medical_notes?: string | null
          organization_id: string
          person_id: string
          updated_at?: string
        }
        Update: {
          emergency_contact?: Json | null
          medical_notes?: string | null
          organization_id?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persons_sensitive_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_sensitive_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_memberships: {
        Row: {
          created_at: string
          id: string
          jersey_number: string | null
          organization_id: string
          person_id: string
          role: string
          team_season_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_number?: string | null
          organization_id: string
          person_id: string
          role?: string
          team_season_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_number?: string | null
          organization_id?: string
          person_id?: string
          role?: string
          team_season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_memberships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_memberships_team_season_id_fkey"
            columns: ["team_season_id"]
            isOneToOne: false
            referencedRelation: "team_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          event_id: string
          id: string
          organization_id: string
          person_id: string
          responded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          event_id: string
          id?: string
          organization_id: string
          person_id: string
          responded_by?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          event_id?: string
          id?: string
          organization_id?: string
          person_id?: string
          responded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          name: string
          organization_id: string
          starts_on: string | null
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          name: string
          organization_id: string
          starts_on?: string | null
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          name?: string
          organization_id?: string
          starts_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_seasons: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          season_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          season_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          season_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          archived_at: string | null
          created_at: string
          division_id: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          division_id?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          division_id?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          organization_id: string
          person_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          person_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          person_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_channel_with_members: {
        Args: {
          p_is_read_only?: boolean
          p_member_user_ids: string[]
          p_name: string
          p_org: string
          p_team_season?: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          is_all_hands: boolean
          is_read_only: boolean
          name: string
          organization_id: string
          team_season_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "channels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: {
          branding: Json
          created_at: string
          id: string
          name: string
          slug: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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

