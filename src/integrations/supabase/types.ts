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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      alert_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          change_id: string | null
          id: string
          ip_address: string | null
          practitioner_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          change_id?: string | null
          id?: string
          ip_address?: string | null
          practitioner_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          change_id?: string | null
          id?: string
          ip_address?: string | null
          practitioner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_acknowledgments_change_id_fkey"
            columns: ["change_id"]
            isOneToOne: false
            referencedRelation: "disaster_status_changes"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key_hash: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_name: string
          last_used_at: string | null
          permissions: Json | null
          rate_limit_per_minute: number | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          api_key_hash: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          last_used_at?: string | null
          permissions?: Json | null
          rate_limit_per_minute?: number | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          api_key_hash?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          last_used_at?: string | null
          permissions?: Json | null
          rate_limit_per_minute?: number | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          created_at: string | null
          endpoint: string
          id: number
          ip_address: unknown | null
          method: string
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: number
          ip_address?: unknown | null
          method: string
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: number
          ip_address?: unknown | null
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_metadata: {
        Row: {
          audit_trail_complete: boolean
          blockchain_hash: string | null
          created_at: string
          id: string
          retention_until: string
          rfc3161_timestamp: string | null
          system_version: string
          verification_id: string
        }
        Insert: {
          audit_trail_complete?: boolean
          blockchain_hash?: string | null
          created_at?: string
          id?: string
          retention_until?: string
          rfc3161_timestamp?: string | null
          system_version?: string
          verification_id: string
        }
        Update: {
          audit_trail_complete?: boolean
          blockchain_hash?: string | null
          created_at?: string
          id?: string
          retention_until?: string
          rfc3161_timestamp?: string | null
          system_version?: string
          verification_id?: string
        }
        Relationships: []
      }
      audit_snapshots: {
        Row: {
          created_at: string
          id: string
          snapshot_data: Json
          snapshot_hash: string
          source_type: string
          source_url: string
          storage_path: string | null
          verification_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot_data: Json
          snapshot_hash: string
          source_type: string
          source_url: string
          storage_path?: string | null
          verification_id: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot_data?: Json
          snapshot_hash?: string
          source_type?: string
          source_url?: string
          storage_path?: string | null
          verification_id?: string
        }
        Relationships: []
      }
      client_subscriptions: {
        Row: {
          api_key: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          max_monthly_searches: number | null
          monthly_searches: number | null
          subscription_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          max_monthly_searches?: number | null
          monthly_searches?: number | null
          subscription_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          max_monthly_searches?: number | null
          monthly_searches?: number | null
          subscription_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      compliance_certificates: {
        Row: {
          certificate_data: Json
          certificate_hash: string
          certificate_type: string
          created_at: string
          digital_signature: string | null
          id: string
          storage_path: string | null
          valid_until: string | null
          verification_id: string
        }
        Insert: {
          certificate_data: Json
          certificate_hash: string
          certificate_type?: string
          created_at?: string
          digital_signature?: string | null
          id?: string
          storage_path?: string | null
          valid_until?: string | null
          verification_id: string
        }
        Update: {
          certificate_data?: Json
          certificate_hash?: string
          certificate_type?: string
          created_at?: string
          digital_signature?: string | null
          id?: string
          storage_path?: string | null
          valid_until?: string | null
          verification_id?: string
        }
        Relationships: []
      }
      compliance_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          provider_type: Database["public"]["Enums"]["provider_type_enum"]
          template_content: string
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          provider_type: Database["public"]["Enums"]["provider_type_enum"]
          template_content: string
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          provider_type?: Database["public"]["Enums"]["provider_type_enum"]
          template_content?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      crawl_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          max_pages: number | null
          payload: Json | null
          source: string
          start_url: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_pages?: number | null
          payload?: Json | null
          source: string
          start_url: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_pages?: number | null
          payload?: Json | null
          source?: string
          start_url?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      crawl_results: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          page_number: number | null
          page_url: string
          rows: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          page_number?: number | null
          page_url: string
          rows: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          page_number?: number | null
          page_url?: string
          rows?: Json
        }
        Relationships: [
          {
            foreignKeyName: "crawl_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crawl_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      critical_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          details: Json | null
          id: number
          message: string
          severity: string
          timestamp: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          details?: Json | null
          id?: number
          message: string
          severity: string
          timestamp: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          details?: Json | null
          id?: number
          message?: string
          severity?: string
          timestamp?: string
        }
        Relationships: []
      }
      daily_usage_stats: {
        Row: {
          api_calls_count: number | null
          avg_response_time_ms: number | null
          cache_hit_rate: number | null
          certificates_generated: number | null
          created_at: string | null
          date: string
          id: string
          unique_postcodes_checked: number | null
          user_id: string | null
          verifications_count: number | null
        }
        Insert: {
          api_calls_count?: number | null
          avg_response_time_ms?: number | null
          cache_hit_rate?: number | null
          certificates_generated?: number | null
          created_at?: string | null
          date: string
          id?: string
          unique_postcodes_checked?: number | null
          user_id?: string | null
          verifications_count?: number | null
        }
        Update: {
          api_calls_count?: number | null
          avg_response_time_ms?: number | null
          cache_hit_rate?: number | null
          certificates_generated?: number | null
          created_at?: string | null
          date?: string
          id?: string
          unique_postcodes_checked?: number | null
          user_id?: string | null
          verifications_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_usage_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          import_status: string | null
          import_type: string
          metadata: Json | null
          records_imported: number | null
          records_updated: number | null
          source_url: string | null
          started_at: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          import_status?: string | null
          import_type: string
          metadata?: Json | null
          records_imported?: number | null
          records_updated?: number | null
          source_url?: string | null
          started_at?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          import_status?: string | null
          import_type?: string
          metadata?: Json | null
          records_imported?: number | null
          records_updated?: number | null
          source_url?: string | null
          started_at?: string | null
        }
        Relationships: []
      }
      data_integrity_checks: {
        Row: {
          check_name: string
          check_type: string
          created_at: string | null
          details: Json | null
          error_count: number | null
          id: number
          passed: boolean
          warning_count: number | null
        }
        Insert: {
          check_name: string
          check_type: string
          created_at?: string | null
          details?: Json | null
          error_count?: number | null
          id?: number
          passed: boolean
          warning_count?: number | null
        }
        Update: {
          check_name?: string
          check_type?: string
          created_at?: string | null
          details?: Json | null
          error_count?: number | null
          id?: number
          passed?: boolean
          warning_count?: number | null
        }
        Relationships: []
      }
      data_quality_metrics: {
        Row: {
          created_at: string | null
          details: Json | null
          id: number
          is_within_threshold: boolean | null
          measurement_date: string | null
          metric_name: string
          metric_value: number | null
          threshold_value: number | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: number
          is_within_threshold?: boolean | null
          measurement_date?: string | null
          metric_name: string
          metric_value?: number | null
          threshold_value?: number | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: number
          is_within_threshold?: boolean | null
          measurement_date?: string | null
          metric_name?: string
          metric_value?: number | null
          threshold_value?: number | null
        }
        Relationships: []
      }
      data_source_health: {
        Row: {
          check_timestamp: string | null
          content_hash: string | null
          data_quality_score: number | null
          data_source_id: number | null
          error_message: string | null
          http_status_code: number | null
          id: string
          is_available: boolean | null
          records_found: number | null
          response_time_ms: number | null
          structure_changed: boolean | null
        }
        Insert: {
          check_timestamp?: string | null
          content_hash?: string | null
          data_quality_score?: number | null
          data_source_id?: number | null
          error_message?: string | null
          http_status_code?: number | null
          id?: string
          is_available?: boolean | null
          records_found?: number | null
          response_time_ms?: number | null
          structure_changed?: boolean | null
        }
        Update: {
          check_timestamp?: string | null
          content_hash?: string | null
          data_quality_score?: number | null
          data_source_id?: number | null
          error_message?: string | null
          http_status_code?: number | null
          id?: string
          is_available?: boolean | null
          records_found?: number | null
          response_time_ms?: number | null
          structure_changed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "data_source_health_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          auth_details: Json | null
          auth_type: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          name: string
          reliability_score: number | null
          scraping_config: Json | null
          source_type: string | null
          state_territory_id: number | null
          update_frequency_minutes: number | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          auth_details?: Json | null
          auth_type?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          reliability_score?: number | null
          scraping_config?: Json | null
          source_type?: string | null
          state_territory_id?: number | null
          update_frequency_minutes?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          auth_details?: Json | null
          auth_type?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          reliability_score?: number | null
          scraping_config?: Json | null
          source_type?: string | null
          state_territory_id?: number | null
          update_frequency_minutes?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_state_territory_id_fkey"
            columns: ["state_territory_id"]
            isOneToOne: false
            referencedRelation: "states_territories"
            referencedColumns: ["id"]
          },
        ]
      }
      disaster_activity_log: {
        Row: {
          activity_type: string | null
          changes_found: number | null
          details: Json | null
          disasters_checked: number | null
          ended_disasters: number | null
          id: string
          new_disasters: number | null
          occurred_at: string | null
        }
        Insert: {
          activity_type?: string | null
          changes_found?: number | null
          details?: Json | null
          disasters_checked?: number | null
          ended_disasters?: number | null
          id?: string
          new_disasters?: number | null
          occurred_at?: string | null
        }
        Update: {
          activity_type?: string | null
          changes_found?: number | null
          details?: Json | null
          disasters_checked?: number | null
          ended_disasters?: number | null
          id?: string
          new_disasters?: number | null
          occurred_at?: string | null
        }
        Relationships: []
      }
      disaster_crosscheck: {
        Row: {
          agrn_reference: string
          checksum: string | null
          created_at: string | null
          disaster_type: string | null
          event_name: string | null
          has_end_date: boolean | null
          id: string
          lga_count: number | null
          scraped_at: string | null
          source_system: string | null
          state_code: string | null
        }
        Insert: {
          agrn_reference: string
          checksum?: string | null
          created_at?: string | null
          disaster_type?: string | null
          event_name?: string | null
          has_end_date?: boolean | null
          id?: string
          lga_count?: number | null
          scraped_at?: string | null
          source_system?: string | null
          state_code?: string | null
        }
        Update: {
          agrn_reference?: string
          checksum?: string | null
          created_at?: string | null
          disaster_type?: string | null
          event_name?: string | null
          has_end_date?: boolean | null
          id?: string
          lga_count?: number | null
          scraped_at?: string | null
          source_system?: string | null
          state_code?: string | null
        }
        Relationships: []
      }
      disaster_declarations: {
        Row: {
          affected_areas: Json | null
          agrn_reference: string | null
          consecutive_active_scrapes: number | null
          created_at: string
          data_source: string | null
          declaration_authority: string
          declaration_date: string
          declaration_status: Database["public"]["Enums"]["declaration_status_enum"]
          description: string | null
          disaster_type: Database["public"]["Enums"]["disaster_type_enum"]
          event_name: string | null
          expiry_date: string | null
          id: string
          is_active_verified: boolean | null
          last_sync_timestamp: string
          last_verified: string | null
          lga_code: string
          postcodes: string[] | null
          previous_status: string | null
          raw_end_date: string | null
          raw_start_date: string | null
          scrape_run_id: string | null
          scraped_at: string | null
          scraper_version: string | null
          severity_level: number | null
          source_system: string
          source_url: string | null
          state_code: string
          status_changed_at: string | null
          updated_at: string
          validation_notes: Json | null
          validation_status: string | null
          verification_url: string | null
        }
        Insert: {
          affected_areas?: Json | null
          agrn_reference?: string | null
          consecutive_active_scrapes?: number | null
          created_at?: string
          data_source?: string | null
          declaration_authority: string
          declaration_date: string
          declaration_status?: Database["public"]["Enums"]["declaration_status_enum"]
          description?: string | null
          disaster_type: Database["public"]["Enums"]["disaster_type_enum"]
          event_name?: string | null
          expiry_date?: string | null
          id?: string
          is_active_verified?: boolean | null
          last_sync_timestamp?: string
          last_verified?: string | null
          lga_code: string
          postcodes?: string[] | null
          previous_status?: string | null
          raw_end_date?: string | null
          raw_start_date?: string | null
          scrape_run_id?: string | null
          scraped_at?: string | null
          scraper_version?: string | null
          severity_level?: number | null
          source_system: string
          source_url?: string | null
          state_code: string
          status_changed_at?: string | null
          updated_at?: string
          validation_notes?: Json | null
          validation_status?: string | null
          verification_url?: string | null
        }
        Update: {
          affected_areas?: Json | null
          agrn_reference?: string | null
          consecutive_active_scrapes?: number | null
          created_at?: string
          data_source?: string | null
          declaration_authority?: string
          declaration_date?: string
          declaration_status?: Database["public"]["Enums"]["declaration_status_enum"]
          description?: string | null
          disaster_type?: Database["public"]["Enums"]["disaster_type_enum"]
          event_name?: string | null
          expiry_date?: string | null
          id?: string
          is_active_verified?: boolean | null
          last_sync_timestamp?: string
          last_verified?: string | null
          lga_code?: string
          postcodes?: string[] | null
          previous_status?: string | null
          raw_end_date?: string | null
          raw_start_date?: string | null
          scrape_run_id?: string | null
          scraped_at?: string | null
          scraper_version?: string | null
          severity_level?: number | null
          source_system?: string
          source_url?: string | null
          state_code?: string
          status_changed_at?: string | null
          updated_at?: string
          validation_notes?: Json | null
          validation_status?: string | null
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disaster_declarations_lga_code_fkey"
            columns: ["lga_code"]
            isOneToOne: false
            referencedRelation: "lga_registry"
            referencedColumns: ["lga_code"]
          },
        ]
      }
      disaster_declarations_validation: {
        Row: {
          affected_lgas: string[] | null
          agrn: string
          created_at: string | null
          end_date: string | null
          id: number
          name: string
          scraper_source: string | null
          start_date: string | null
          state_code: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          affected_lgas?: string[] | null
          agrn: string
          created_at?: string | null
          end_date?: string | null
          id?: number
          name: string
          scraper_source?: string | null
          start_date?: string | null
          state_code?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          affected_lgas?: string[] | null
          agrn?: string
          created_at?: string | null
          end_date?: string | null
          id?: number
          name?: string
          scraper_source?: string | null
          start_date?: string | null
          state_code?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      disaster_history: {
        Row: {
          agrn_reference: string
          change_date: string | null
          change_details: string | null
          change_type: string
          field_name: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          synced_from_url: string | null
        }
        Insert: {
          agrn_reference: string
          change_date?: string | null
          change_details?: string | null
          change_type: string
          field_name?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          synced_from_url?: string | null
        }
        Update: {
          agrn_reference?: string
          change_date?: string | null
          change_details?: string | null
          change_type?: string
          field_name?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          synced_from_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disaster_history_agrn_reference_fkey"
            columns: ["agrn_reference"]
            isOneToOne: false
            referencedRelation: "disaster_declarations"
            referencedColumns: ["agrn_reference"]
          },
        ]
      }
      disaster_index: {
        Row: {
          agrn: string
          disaster_name: string
          disaster_type: string | null
          end_date_raw: string | null
          is_active: boolean | null
          scan_id: string | null
          scanned_at: string | null
          start_date_raw: string | null
          state: string | null
          telehealth_eligible: boolean | null
          url: string | null
        }
        Insert: {
          agrn: string
          disaster_name: string
          disaster_type?: string | null
          end_date_raw?: string | null
          is_active?: boolean | null
          scan_id?: string | null
          scanned_at?: string | null
          start_date_raw?: string | null
          state?: string | null
          telehealth_eligible?: boolean | null
          url?: string | null
        }
        Update: {
          agrn?: string
          disaster_name?: string
          disaster_type?: string | null
          end_date_raw?: string | null
          is_active?: boolean | null
          scan_id?: string | null
          scanned_at?: string | null
          start_date_raw?: string | null
          state?: string | null
          telehealth_eligible?: boolean | null
          url?: string | null
        }
        Relationships: []
      }
      disaster_lgas: {
        Row: {
          added_date: string
          agrn_reference: string
          created_at: string | null
          currently_affected: boolean | null
          id: string
          lga_code: string
          lga_name: string
          removed_date: string | null
          state_code: string
          updated_at: string | null
        }
        Insert: {
          added_date: string
          agrn_reference: string
          created_at?: string | null
          currently_affected?: boolean | null
          id?: string
          lga_code: string
          lga_name: string
          removed_date?: string | null
          state_code: string
          updated_at?: string | null
        }
        Update: {
          added_date?: string
          agrn_reference?: string
          created_at?: string | null
          currently_affected?: boolean | null
          id?: string
          lga_code?: string
          lga_name?: string
          removed_date?: string | null
          state_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disaster_lgas_agrn_reference_fkey"
            columns: ["agrn_reference"]
            isOneToOne: false
            referencedRelation: "disaster_declarations"
            referencedColumns: ["agrn_reference"]
          },
        ]
      }
      disaster_orchestration_logs: {
        Row: {
          created_at: string | null
          declarations_added: number | null
          declarations_expired: number | null
          declarations_found: number | null
          details: Json | null
          errors: string[] | null
          id: string
          mode: string
          run_timestamp: string
          sources_checked: string[] | null
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          declarations_added?: number | null
          declarations_expired?: number | null
          declarations_found?: number | null
          details?: Json | null
          errors?: string[] | null
          id?: string
          mode: string
          run_timestamp?: string
          sources_checked?: string[] | null
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          declarations_added?: number | null
          declarations_expired?: number | null
          declarations_found?: number | null
          details?: Json | null
          errors?: string[] | null
          id?: string
          mode?: string
          run_timestamp?: string
          sources_checked?: string[] | null
          success?: boolean | null
        }
        Relationships: []
      }
      disaster_status_changes: {
        Row: {
          acknowledged: boolean | null
          affected_lgas: Json | null
          affected_postcodes: Json | null
          agrn_reference: string | null
          alert_expires_at: string | null
          change_type: string | null
          created_at: string | null
          detected_at: string | null
          id: string
          new_end_date: string | null
          new_status: string | null
          previous_end_date: string | null
          previous_status: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          affected_lgas?: Json | null
          affected_postcodes?: Json | null
          agrn_reference?: string | null
          alert_expires_at?: string | null
          change_type?: string | null
          created_at?: string | null
          detected_at?: string | null
          id?: string
          new_end_date?: string | null
          new_status?: string | null
          previous_end_date?: string | null
          previous_status?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          affected_lgas?: Json | null
          affected_postcodes?: Json | null
          agrn_reference?: string | null
          alert_expires_at?: string | null
          change_type?: string | null
          created_at?: string | null
          detected_at?: string | null
          id?: string
          new_end_date?: string | null
          new_status?: string | null
          previous_end_date?: string | null
          previous_status?: string | null
        }
        Relationships: []
      }
      disaster_types: {
        Row: {
          color: string | null
          description: string | null
          icon: string | null
          id: number
          name: string
          severity_scale: number | null
        }
        Insert: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name: string
          severity_scale?: number | null
        }
        Update: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name?: string
          severity_scale?: number | null
        }
        Relationships: []
      }
      disaster_validations: {
        Row: {
          created_at: string | null
          disaster_id: string | null
          id: string
          last_checked: string | null
          source_1: string | null
          source_1_url: string | null
          source_1_verified: boolean | null
          source_2: string | null
          source_2_url: string | null
          source_2_verified: boolean | null
          source_3: string | null
          source_3_url: string | null
          source_3_verified: boolean | null
          validation_score: number | null
          validation_status: string | null
        }
        Insert: {
          created_at?: string | null
          disaster_id?: string | null
          id?: string
          last_checked?: string | null
          source_1?: string | null
          source_1_url?: string | null
          source_1_verified?: boolean | null
          source_2?: string | null
          source_2_url?: string | null
          source_2_verified?: boolean | null
          source_3?: string | null
          source_3_url?: string | null
          source_3_verified?: boolean | null
          validation_score?: number | null
          validation_status?: string | null
        }
        Update: {
          created_at?: string | null
          disaster_id?: string | null
          id?: string
          last_checked?: string | null
          source_1?: string | null
          source_1_url?: string | null
          source_1_verified?: boolean | null
          source_2?: string | null
          source_2_url?: string | null
          source_2_verified?: boolean | null
          source_3?: string | null
          source_3_url?: string | null
          source_3_verified?: boolean | null
          validation_score?: number | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disaster_validations_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disaster_declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      disaster_zones: {
        Row: {
          created_at: string | null
          custom_area_name: string | null
          custom_geometry: unknown | null
          disaster_id: string | null
          evacuation_status: string | null
          id: string
          impact_level: string | null
          lga_id: number | null
          postcode_id: number | null
          zone_type: string
        }
        Insert: {
          created_at?: string | null
          custom_area_name?: string | null
          custom_geometry?: unknown | null
          disaster_id?: string | null
          evacuation_status?: string | null
          id?: string
          impact_level?: string | null
          lga_id?: number | null
          postcode_id?: number | null
          zone_type: string
        }
        Update: {
          created_at?: string | null
          custom_area_name?: string | null
          custom_geometry?: unknown | null
          disaster_id?: string | null
          evacuation_status?: string | null
          id?: string
          impact_level?: string | null
          lga_id?: number | null
          postcode_id?: number | null
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "disaster_zones_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disaster_zones_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disaster_zones_postcode_id_fkey"
            columns: ["postcode_id"]
            isOneToOne: false
            referencedRelation: "postcodes"
            referencedColumns: ["id"]
          },
        ]
      }
      disasters: {
        Row: {
          created_at: string | null
          declaration_reference: string | null
          declaring_authority: string | null
          description: string | null
          disaster_type_id: number | null
          end_date: string | null
          estimated_damage_aud: number | null
          geometry: unknown | null
          id: string
          name: string
          severity: number | null
          source_url: string | null
          start_date: string
          state_territory_id: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          declaration_reference?: string | null
          declaring_authority?: string | null
          description?: string | null
          disaster_type_id?: number | null
          end_date?: string | null
          estimated_damage_aud?: number | null
          geometry?: unknown | null
          id?: string
          name: string
          severity?: number | null
          source_url?: string | null
          start_date: string
          state_territory_id?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          declaration_reference?: string | null
          declaring_authority?: string | null
          description?: string | null
          disaster_type_id?: number | null
          end_date?: string | null
          estimated_damage_aud?: number | null
          geometry?: unknown | null
          id?: string
          name?: string
          severity?: number | null
          source_url?: string | null
          start_date?: string
          state_territory_id?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disasters_disaster_type_id_fkey"
            columns: ["disaster_type_id"]
            isOneToOne: false
            referencedRelation: "disaster_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disasters_state_territory_id_fkey"
            columns: ["state_territory_id"]
            isOneToOne: false
            referencedRelation: "states_territories"
            referencedColumns: ["id"]
          },
        ]
      }
      frontend_estimates: {
        Row: {
          active_disasters: number | null
          created_at: string | null
          id: string
          last_updated: string | null
          scan_id: string | null
          state_counts: Json | null
          total_disasters: number | null
        }
        Insert: {
          active_disasters?: number | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          scan_id?: string | null
          state_counts?: Json | null
          total_disasters?: number | null
        }
        Update: {
          active_disasters?: number | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          scan_id?: string | null
          state_counts?: Json | null
          total_disasters?: number | null
        }
        Relationships: []
      }
      health_metrics: {
        Row: {
          id: string
          is_healthy: boolean | null
          metadata: Json | null
          metric_name: string
          metric_unit: string | null
          metric_value: number
          recorded_at: string | null
          threshold_max: number | null
          threshold_min: number | null
        }
        Insert: {
          id?: string
          is_healthy?: boolean | null
          metadata?: Json | null
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          recorded_at?: string | null
          threshold_max?: number | null
          threshold_min?: number | null
        }
        Update: {
          id?: string
          is_healthy?: boolean | null
          metadata?: Json | null
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          recorded_at?: string | null
          threshold_max?: number | null
          threshold_min?: number | null
        }
        Relationships: []
      }
      index_scans: {
        Row: {
          active_disasters: number | null
          changes_detected: boolean | null
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          expired_disasters: number | null
          id: string
          scan_type: string | null
          started_at: string | null
          state_breakdown: Json | null
          total_disasters: number | null
        }
        Insert: {
          active_disasters?: number | null
          changes_detected?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          expired_disasters?: number | null
          id?: string
          scan_type?: string | null
          started_at?: string | null
          state_breakdown?: Json | null
          total_disasters?: number | null
        }
        Update: {
          active_disasters?: number | null
          changes_detected?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          expired_disasters?: number | null
          id?: string
          scan_type?: string | null
          started_at?: string | null
          state_breakdown?: Json | null
          total_disasters?: number | null
        }
        Relationships: []
      }
      integrity_validation_results: {
        Row: {
          created_at: string | null
          critical_issues: Json | null
          errors_found: number | null
          id: number
          recommendations: Json | null
          records_checked: number | null
          table_checked: string | null
          validation_run_id: string | null
          validation_type: string
          warnings_found: number | null
        }
        Insert: {
          created_at?: string | null
          critical_issues?: Json | null
          errors_found?: number | null
          id?: number
          recommendations?: Json | null
          records_checked?: number | null
          table_checked?: string | null
          validation_run_id?: string | null
          validation_type: string
          warnings_found?: number | null
        }
        Update: {
          created_at?: string | null
          critical_issues?: Json | null
          errors_found?: number | null
          id?: number
          recommendations?: Json | null
          records_checked?: number | null
          table_checked?: string | null
          validation_run_id?: string | null
          validation_type?: string
          warnings_found?: number | null
        }
        Relationships: []
      }
      lga_import_staging: {
        Row: {
          area_sqkm: number | null
          import_batch_id: string | null
          lga_code: string
          lga_name: string
          population: number | null
          state_code: string
        }
        Insert: {
          area_sqkm?: number | null
          import_batch_id?: string | null
          lga_code: string
          lga_name: string
          population?: number | null
          state_code: string
        }
        Update: {
          area_sqkm?: number | null
          import_batch_id?: string | null
          lga_code?: string
          lga_name?: string
          population?: number | null
          state_code?: string
        }
        Relationships: []
      }
      lga_registry: {
        Row: {
          created_at: string | null
          lga_code: string
          lga_name: string
          state_code: string
          state_name: string
        }
        Insert: {
          created_at?: string | null
          lga_code: string
          lga_name: string
          state_code: string
          state_name: string
        }
        Update: {
          created_at?: string | null
          lga_code?: string
          lga_name?: string
          state_code?: string
          state_name?: string
        }
        Relationships: []
      }
      lgas: {
        Row: {
          area_sqkm: number | null
          created_at: string | null
          geometry: unknown | null
          id: number
          lga_code: string | null
          name: string
          population: number | null
          state_territory_id: number | null
          updated_at: string | null
        }
        Insert: {
          area_sqkm?: number | null
          created_at?: string | null
          geometry?: unknown | null
          id?: number
          lga_code?: string | null
          name: string
          population?: number | null
          state_territory_id?: number | null
          updated_at?: string | null
        }
        Update: {
          area_sqkm?: number | null
          created_at?: string | null
          geometry?: unknown | null
          id?: number
          lga_code?: string | null
          name?: string
          population?: number | null
          state_territory_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lgas_state_territory_id_fkey"
            columns: ["state_territory_id"]
            isOneToOne: false
            referencedRelation: "states_territories"
            referencedColumns: ["id"]
          },
        ]
      }
      mbs_certificates: {
        Row: {
          blockchain_hash: string | null
          certificate_number: string
          created_at: string | null
          declaration_verified: boolean
          id: string
          issue_date: string
          mbs_item_codes: string[] | null
          patient_medicare_hash: string | null
          patient_postcode: string | null
          pdf_url: string | null
          practitioner_id: string | null
          valid_until: string | null
          verification_id: string | null
        }
        Insert: {
          blockchain_hash?: string | null
          certificate_number: string
          created_at?: string | null
          declaration_verified: boolean
          id?: string
          issue_date: string
          mbs_item_codes?: string[] | null
          patient_medicare_hash?: string | null
          patient_postcode?: string | null
          pdf_url?: string | null
          practitioner_id?: string | null
          valid_until?: string | null
          verification_id?: string | null
        }
        Update: {
          blockchain_hash?: string | null
          certificate_number?: string
          created_at?: string | null
          declaration_verified?: boolean
          id?: string
          issue_date?: string
          mbs_item_codes?: string[] | null
          patient_medicare_hash?: string | null
          patient_postcode?: string | null
          pdf_url?: string | null
          practitioner_id?: string | null
          valid_until?: string | null
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mbs_certificates_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mbs_certificates_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "postcode_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      medicare_access_logs: {
        Row: {
          agrn_checked: string | null
          audit_notes: string | null
          claim_reference: string | null
          eligibility_reason: string | null
          id: string
          medicare_item_numbers: string[] | null
          patient_lga: string | null
          patient_postcode: string | null
          practitioner_number: string | null
          provider_name: string | null
          query_date: string | null
          was_eligible: boolean | null
        }
        Insert: {
          agrn_checked?: string | null
          audit_notes?: string | null
          claim_reference?: string | null
          eligibility_reason?: string | null
          id?: string
          medicare_item_numbers?: string[] | null
          patient_lga?: string | null
          patient_postcode?: string | null
          practitioner_number?: string | null
          provider_name?: string | null
          query_date?: string | null
          was_eligible?: boolean | null
        }
        Update: {
          agrn_checked?: string | null
          audit_notes?: string | null
          claim_reference?: string | null
          eligibility_reason?: string | null
          id?: string
          medicare_item_numbers?: string[] | null
          patient_lga?: string | null
          patient_postcode?: string | null
          practitioner_number?: string | null
          provider_name?: string | null
          query_date?: string | null
          was_eligible?: boolean | null
        }
        Relationships: []
      }
      nema_lga_profiles: {
        Row: {
          attribution: string
          content_type: string | null
          created_at: string
          document_size: number | null
          extracted_data: Json | null
          fetched_at: string
          id: string
          lga_code: string
          nema_url: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          attribution?: string
          content_type?: string | null
          created_at?: string
          document_size?: number | null
          extracted_data?: Json | null
          fetched_at?: string
          id?: string
          lga_code: string
          nema_url: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          attribution?: string
          content_type?: string | null
          created_at?: string
          document_size?: number | null
          extracted_data?: Json | null
          fetched_at?: string
          id?: string
          lga_code?: string
          nema_url?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_users: {
        Row: {
          concurrent_sessions: number | null
          created_at: string | null
          device_fingerprints: Json | null
          email: string
          id: string
          last_login_ip: unknown | null
          organization_id: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          concurrent_sessions?: number | null
          created_at?: string | null
          device_fingerprints?: Json | null
          email: string
          id?: string
          last_login_ip?: unknown | null
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          concurrent_sessions?: number | null
          created_at?: string | null
          device_fingerprints?: Json | null
          email?: string
          id?: string
          last_login_ip?: unknown | null
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          allowed_domains: string[] | null
          api_key: string | null
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string | null
          id: string
          name: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
          verifications_limit: number | null
          verifications_used: number | null
        }
        Insert: {
          allowed_domains?: string[] | null
          api_key?: string | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          id?: string
          name: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          verifications_limit?: number | null
          verifications_used?: number | null
        }
        Update: {
          allowed_domains?: string[] | null
          api_key?: string | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          id?: string
          name?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          verifications_limit?: number | null
          verifications_used?: number | null
        }
        Relationships: []
      }
      postcode_import_staging: {
        Row: {
          delivery_office: string | null
          import_batch_id: string | null
          latitude: number | null
          lga_name: string | null
          longitude: number | null
          postcode: string
          state_code: string | null
          suburb: string | null
        }
        Insert: {
          delivery_office?: string | null
          import_batch_id?: string | null
          latitude?: number | null
          lga_name?: string | null
          longitude?: number | null
          postcode: string
          state_code?: string | null
          suburb?: string | null
        }
        Update: {
          delivery_office?: string | null
          import_batch_id?: string | null
          latitude?: number | null
          lga_name?: string | null
          longitude?: number | null
          postcode?: string
          state_code?: string | null
          suburb?: string | null
        }
        Relationships: []
      }
      postcode_lga_mapping: {
        Row: {
          created_at: string | null
          id: number
          lga_id: number | null
          postcode: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          lga_id?: number | null
          postcode: string
        }
        Update: {
          created_at?: string | null
          id?: number
          lga_id?: number | null
          postcode?: string
        }
        Relationships: [
          {
            foreignKeyName: "postcode_lga_mapping_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
        ]
      }
      postcode_verifications: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          data_sources: Json | null
          declaration_authority: string | null
          declaration_end_date: string | null
          declaration_reference: string | null
          declaration_start_date: string | null
          disaster_id: string | null
          id: string
          ip_address: unknown | null
          is_disaster_zone: boolean
          lga_id: number | null
          mbs_eligible: boolean | null
          postcode: string
          processing_time_ms: number | null
          request_id: string | null
          suburb: string | null
          user_agent: string | null
          user_id: string | null
          verification_method: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          data_sources?: Json | null
          declaration_authority?: string | null
          declaration_end_date?: string | null
          declaration_reference?: string | null
          declaration_start_date?: string | null
          disaster_id?: string | null
          id?: string
          ip_address?: unknown | null
          is_disaster_zone: boolean
          lga_id?: number | null
          mbs_eligible?: boolean | null
          postcode: string
          processing_time_ms?: number | null
          request_id?: string | null
          suburb?: string | null
          user_agent?: string | null
          user_id?: string | null
          verification_method?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          data_sources?: Json | null
          declaration_authority?: string | null
          declaration_end_date?: string | null
          declaration_reference?: string | null
          declaration_start_date?: string | null
          disaster_id?: string | null
          id?: string
          ip_address?: unknown | null
          is_disaster_zone?: boolean
          lga_id?: number | null
          mbs_eligible?: boolean | null
          postcode?: string
          processing_time_ms?: number | null
          request_id?: string | null
          suburb?: string | null
          user_agent?: string | null
          user_id?: string | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "postcode_verifications_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postcode_verifications_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postcode_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      postcodes: {
        Row: {
          created_at: string | null
          delivery_office: string | null
          id: number
          latitude: number | null
          location: unknown | null
          longitude: number | null
          population: number | null
          postcode: string
          primary_lga_id: number | null
          state_territory_id: number | null
          suburb: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_office?: string | null
          id?: number
          latitude?: number | null
          location?: unknown | null
          longitude?: number | null
          population?: number | null
          postcode: string
          primary_lga_id?: number | null
          state_territory_id?: number | null
          suburb?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_office?: string | null
          id?: number
          latitude?: number | null
          location?: unknown | null
          longitude?: number | null
          population?: number | null
          postcode?: string
          primary_lga_id?: number | null
          state_territory_id?: number | null
          suburb?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "postcodes_primary_lga_id_fkey"
            columns: ["primary_lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postcodes_state_territory_id_fkey"
            columns: ["state_territory_id"]
            isOneToOne: false
            referencedRelation: "states_territories"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_registration: {
        Row: {
          abn: string | null
          address: string | null
          contact_phone: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          postcode: string | null
          practice_name: string
          provider_types: Database["public"]["Enums"]["provider_type_enum"][]
          state_code: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan_enum"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          abn?: string | null
          address?: string | null
          contact_phone?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          postcode?: string | null
          practice_name: string
          provider_types?: Database["public"]["Enums"]["provider_type_enum"][]
          state_code?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan_enum"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          abn?: string | null
          address?: string | null
          contact_phone?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          postcode?: string | null
          practice_name?: string
          provider_types?: Database["public"]["Enums"]["provider_type_enum"][]
          state_code?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan_enum"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      practitioner_credentials: {
        Row: {
          ahpra_number: string | null
          created_at: string
          id: string
          practice_name: string | null
          provider_name: string
          provider_type: Database["public"]["Enums"]["provider_type_enum"]
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          ahpra_number?: string | null
          created_at?: string
          id?: string
          practice_name?: string | null
          provider_name: string
          provider_type: Database["public"]["Enums"]["provider_type_enum"]
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          ahpra_number?: string | null
          created_at?: string
          id?: string
          practice_name?: string | null
          provider_name?: string
          provider_type?: Database["public"]["Enums"]["provider_type_enum"]
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      practitioner_verifications: {
        Row: {
          agrn_references: string[] | null
          compliance_notes: string | null
          disaster_ids: string[] | null
          id: string
          ip_address: unknown | null
          mbs_item_numbers: string[] | null
          patient_postcode: string | null
          practitioner_id: string | null
          user_agent: string | null
          verification_result: boolean | null
          verification_timestamp: string | null
          verification_urls: string[] | null
        }
        Insert: {
          agrn_references?: string[] | null
          compliance_notes?: string | null
          disaster_ids?: string[] | null
          id?: string
          ip_address?: unknown | null
          mbs_item_numbers?: string[] | null
          patient_postcode?: string | null
          practitioner_id?: string | null
          user_agent?: string | null
          verification_result?: boolean | null
          verification_timestamp?: string | null
          verification_urls?: string[] | null
        }
        Update: {
          agrn_references?: string[] | null
          compliance_notes?: string | null
          disaster_ids?: string[] | null
          id?: string
          ip_address?: unknown | null
          mbs_item_numbers?: string[] | null
          patient_postcode?: string | null
          practitioner_id?: string | null
          user_agent?: string | null
          verification_result?: boolean | null
          verification_timestamp?: string | null
          verification_urls?: string[] | null
        }
        Relationships: []
      }
      scrape_comparisons: {
        Row: {
          alert_sent: boolean | null
          change: number | null
          change_percentage: number | null
          created_at: string | null
          current_active: number | null
          id: number
          is_suspicious: boolean | null
          previous_active: number | null
          previous_run_id: string | null
          scrape_run_id: string | null
          state_code: string | null
        }
        Insert: {
          alert_sent?: boolean | null
          change?: number | null
          change_percentage?: number | null
          created_at?: string | null
          current_active?: number | null
          id?: number
          is_suspicious?: boolean | null
          previous_active?: number | null
          previous_run_id?: string | null
          scrape_run_id?: string | null
          state_code?: string | null
        }
        Update: {
          alert_sent?: boolean | null
          change?: number | null
          change_percentage?: number | null
          created_at?: string | null
          current_active?: number | null
          id?: number
          is_suspicious?: boolean | null
          previous_active?: number | null
          previous_run_id?: string | null
          scrape_run_id?: string | null
          state_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_comparisons_previous_run_id_fkey"
            columns: ["previous_run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_comparisons_scrape_run_id_fkey"
            columns: ["scrape_run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_runs: {
        Row: {
          active_disasters_found: number | null
          completed_at: string | null
          created_at: string | null
          disasters_updated: number | null
          id: string
          new_disasters_added: number | null
          rollback_performed: boolean | null
          scrape_type: string | null
          scraper_version: string
          started_at: string | null
          state_counts: Json | null
          total_disasters_found: number | null
          validation_errors: Json | null
          validation_passed: boolean | null
        }
        Insert: {
          active_disasters_found?: number | null
          completed_at?: string | null
          created_at?: string | null
          disasters_updated?: number | null
          id?: string
          new_disasters_added?: number | null
          rollback_performed?: boolean | null
          scrape_type?: string | null
          scraper_version: string
          started_at?: string | null
          state_counts?: Json | null
          total_disasters_found?: number | null
          validation_errors?: Json | null
          validation_passed?: boolean | null
        }
        Update: {
          active_disasters_found?: number | null
          completed_at?: string | null
          created_at?: string | null
          disasters_updated?: number | null
          id?: string
          new_disasters_added?: number | null
          rollback_performed?: boolean | null
          scrape_type?: string | null
          scraper_version?: string
          started_at?: string | null
          state_counts?: Json | null
          total_disasters_found?: number | null
          validation_errors?: Json | null
          validation_passed?: boolean | null
        }
        Relationships: []
      }
      scraper_audit: {
        Row: {
          completed_at: string | null
          created_at: string | null
          disasters_found: number | null
          error_details: Json | null
          errors: number | null
          id: string
          scraper: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          disasters_found?: number | null
          error_details?: Json | null
          errors?: number | null
          id?: string
          scraper?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          disasters_found?: number | null
          error_details?: Json | null
          errors?: number | null
          id?: string
          scraper?: string | null
        }
        Relationships: []
      }
      scraper_comparison_reports: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          disasters_compared: number | null
          discrepancies: Json | null
          id: string
          passed: boolean | null
          playwright_count: number | null
          puppeteer_count: number | null
          recommendation: string | null
          report_path: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          disasters_compared?: number | null
          discrepancies?: Json | null
          id?: string
          passed?: boolean | null
          playwright_count?: number | null
          puppeteer_count?: number | null
          recommendation?: string | null
          report_path?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          disasters_compared?: number | null
          discrepancies?: Json | null
          id?: string
          passed?: boolean | null
          playwright_count?: number | null
          puppeteer_count?: number | null
          recommendation?: string | null
          report_path?: string | null
        }
        Relationships: []
      }
      scraper_errors: {
        Row: {
          agrn_reference: string | null
          created_at: string | null
          error_message: string | null
          id: string
          item_data: Json | null
          occurred_at: string | null
        }
        Insert: {
          agrn_reference?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          item_data?: Json | null
          occurred_at?: string | null
        }
        Update: {
          agrn_reference?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          item_data?: Json | null
          occurred_at?: string | null
        }
        Relationships: []
      }
      scraper_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          records_inserted: number | null
          records_processed: number | null
          records_updated: number | null
          run_type: string
          source_url: string | null
          started_at: string | null
          status: string | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          run_type: string
          source_url?: string | null
          started_at?: string | null
          status?: string | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          run_type?: string
          source_url?: string | null
          started_at?: string | null
          status?: string | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      scraping_logs: {
        Row: {
          disasters_found: number | null
          disasters_validated: number | null
          error_message: string | null
          id: string
          source: string | null
          status: string | null
          timestamp: string | null
        }
        Insert: {
          disasters_found?: number | null
          disasters_validated?: number | null
          error_message?: string | null
          id?: string
          source?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          disasters_found?: number | null
          disasters_validated?: number | null
          error_message?: string | null
          id?: string
          source?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          id: number
          ip_address: unknown | null
          postcode: string
          result_status: string | null
          searched_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          id?: number
          ip_address?: unknown | null
          postcode: string
          result_status?: string | null
          searched_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number
          ip_address?: unknown | null
          postcode?: string
          result_status?: string | null
          searched_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      source_validations: {
        Row: {
          confidence_score: number
          conflict_resolution: Json | null
          created_at: string
          id: string
          primary_source: Json
          secondary_sources: Json
          validation_status: string
          verification_id: string
        }
        Insert: {
          confidence_score?: number
          conflict_resolution?: Json | null
          created_at?: string
          id?: string
          primary_source: Json
          secondary_sources: Json
          validation_status?: string
          verification_id: string
        }
        Update: {
          confidence_score?: number
          conflict_resolution?: Json | null
          created_at?: string
          id?: string
          primary_source?: Json
          secondary_sources?: Json
          validation_status?: string
          verification_id?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      states_territories: {
        Row: {
          code: string
          created_at: string | null
          emergency_website: string | null
          id: number
          name: string
          population: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          emergency_website?: string | null
          id?: number
          name: string
          population?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          emergency_website?: string | null
          id?: number
          name?: string
          population?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_unit: string | null
          metric_value: number | null
          tags: Json | null
          timestamp: string | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_unit?: string | null
          metric_value?: number | null
          tags?: Json | null
          timestamp?: string | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number | null
          tags?: Json | null
          timestamp?: string | null
        }
        Relationships: []
      }
      telehealth_eligibility_checks: {
        Row: {
          alert_acknowledged: boolean | null
          alert_shown: boolean | null
          check_result: string | null
          checked_at: string | null
          disaster_agrn: string | null
          id: string
          patient_postcode: string | null
          practitioner_id: string | null
        }
        Insert: {
          alert_acknowledged?: boolean | null
          alert_shown?: boolean | null
          check_result?: string | null
          checked_at?: string | null
          disaster_agrn?: string | null
          id?: string
          patient_postcode?: string | null
          practitioner_id?: string | null
        }
        Update: {
          alert_acknowledged?: boolean | null
          alert_shown?: boolean | null
          check_result?: string | null
          checked_at?: string | null
          disaster_agrn?: string | null
          id?: string
          patient_postcode?: string | null
          practitioner_id?: string | null
        }
        Relationships: []
      }
      test_disaster_declarations: {
        Row: {
          affected_areas: Json | null
          agrn_reference: string
          created_at: string | null
          data_source: string | null
          declaration_authority: string | null
          declaration_date: string | null
          declaration_status: string | null
          description: string | null
          disaster_type: string | null
          event_name: string
          expiry_date: string | null
          is_active_verified: boolean | null
          last_sync_timestamp: string | null
          lga_code: string | null
          raw_end_date: string | null
          raw_start_date: string | null
          scan_id: string | null
          scrape_run_id: string | null
          scraped_at: string | null
          scraper_version: string | null
          severity_level: number | null
          source_system: string | null
          source_url: string | null
          state_code: string | null
          telehealth_eligible: boolean | null
          updated_at: string | null
          validation_run_id: string | null
          validation_status: string | null
          verification_url: string | null
        }
        Insert: {
          affected_areas?: Json | null
          agrn_reference: string
          created_at?: string | null
          data_source?: string | null
          declaration_authority?: string | null
          declaration_date?: string | null
          declaration_status?: string | null
          description?: string | null
          disaster_type?: string | null
          event_name: string
          expiry_date?: string | null
          is_active_verified?: boolean | null
          last_sync_timestamp?: string | null
          lga_code?: string | null
          raw_end_date?: string | null
          raw_start_date?: string | null
          scan_id?: string | null
          scrape_run_id?: string | null
          scraped_at?: string | null
          scraper_version?: string | null
          severity_level?: number | null
          source_system?: string | null
          source_url?: string | null
          state_code?: string | null
          telehealth_eligible?: boolean | null
          updated_at?: string | null
          validation_run_id?: string | null
          validation_status?: string | null
          verification_url?: string | null
        }
        Update: {
          affected_areas?: Json | null
          agrn_reference?: string
          created_at?: string | null
          data_source?: string | null
          declaration_authority?: string | null
          declaration_date?: string | null
          declaration_status?: string | null
          description?: string | null
          disaster_type?: string | null
          event_name?: string
          expiry_date?: string | null
          is_active_verified?: boolean | null
          last_sync_timestamp?: string | null
          lga_code?: string | null
          raw_end_date?: string | null
          raw_start_date?: string | null
          scan_id?: string | null
          scrape_run_id?: string | null
          scraped_at?: string | null
          scraper_version?: string | null
          severity_level?: number | null
          source_system?: string | null
          source_url?: string | null
          state_code?: string | null
          telehealth_eligible?: boolean | null
          updated_at?: string | null
          validation_run_id?: string | null
          validation_status?: string | null
          verification_url?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          ahpra_number: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          medical_specialty: string | null
          phone: string | null
          practice_address: string | null
          practice_name: string | null
          provider_number: string | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_tier: string | null
          updated_at: string | null
          usage_limit: number | null
          user_type: string
          verified_practitioner: boolean | null
        }
        Insert: {
          ahpra_number?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          medical_specialty?: string | null
          phone?: string | null
          practice_address?: string | null
          practice_name?: string | null
          provider_number?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          user_type?: string
          verified_practitioner?: boolean | null
        }
        Update: {
          ahpra_number?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          medical_specialty?: string | null
          phone?: string | null
          practice_address?: string | null
          practice_name?: string | null
          provider_number?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          user_type?: string
          verified_practitioner?: boolean | null
        }
        Relationships: []
      }
      validation_audit: {
        Row: {
          alerted: boolean | null
          created_at: string | null
          crosscheck_count: number | null
          discrepancies: Json | null
          id: string
          primary_count: number | null
          status: string | null
          validation_date: string | null
        }
        Insert: {
          alerted?: boolean | null
          created_at?: string | null
          crosscheck_count?: number | null
          discrepancies?: Json | null
          id?: string
          primary_count?: number | null
          status?: string | null
          validation_date?: string | null
        }
        Update: {
          alerted?: boolean | null
          created_at?: string | null
          crosscheck_count?: number | null
          discrepancies?: Json | null
          id?: string
          primary_count?: number | null
          status?: string | null
          validation_date?: string | null
        }
        Relationships: []
      }
      validation_comparisons: {
        Row: {
          comparison_date: string | null
          discrepancy_found: boolean | null
          id: number
          live_website_count: number | null
          notes: string | null
          primary_scraper_count: number
          resolved: boolean | null
          state_code: string | null
          validation_scraper_count: number | null
        }
        Insert: {
          comparison_date?: string | null
          discrepancy_found?: boolean | null
          id?: number
          live_website_count?: number | null
          notes?: string | null
          primary_scraper_count: number
          resolved?: boolean | null
          state_code?: string | null
          validation_scraper_count?: number | null
        }
        Update: {
          comparison_date?: string | null
          discrepancy_found?: boolean | null
          id?: number
          live_website_count?: number | null
          notes?: string | null
          primary_scraper_count?: number
          resolved?: boolean | null
          state_code?: string | null
          validation_scraper_count?: number | null
        }
        Relationships: []
      }
      validation_rules: {
        Row: {
          created_at: string | null
          expected_max: number | null
          expected_min: number | null
          id: number
          is_active: boolean | null
          pattern: string | null
          rule_name: string
          rule_type: string | null
          severity: string | null
          state_code: string | null
        }
        Insert: {
          created_at?: string | null
          expected_max?: number | null
          expected_min?: number | null
          id?: number
          is_active?: boolean | null
          pattern?: string | null
          rule_name: string
          rule_type?: string | null
          severity?: string | null
          state_code?: string | null
        }
        Update: {
          created_at?: string | null
          expected_max?: number | null
          expected_min?: number | null
          id?: number
          is_active?: boolean | null
          pattern?: string | null
          rule_name?: string
          rule_type?: string | null
          severity?: string | null
          state_code?: string | null
        }
        Relationships: []
      }
      validation_runs: {
        Row: {
          active_disasters_playwright: number | null
          active_disasters_puppeteer: number | null
          created_at: string | null
          critical_errors: Json | null
          id: number
          is_valid: boolean
          mismatches: Json | null
          playwright_count: number | null
          playwright_time_ms: number | null
          puppeteer_count: number | null
          puppeteer_time_ms: number | null
          run_id: string
          timestamp: string
        }
        Insert: {
          active_disasters_playwright?: number | null
          active_disasters_puppeteer?: number | null
          created_at?: string | null
          critical_errors?: Json | null
          id?: number
          is_valid: boolean
          mismatches?: Json | null
          playwright_count?: number | null
          playwright_time_ms?: number | null
          puppeteer_count?: number | null
          puppeteer_time_ms?: number | null
          run_id: string
          timestamp: string
        }
        Update: {
          active_disasters_playwright?: number | null
          active_disasters_puppeteer?: number | null
          created_at?: string | null
          critical_errors?: Json | null
          id?: number
          is_valid?: boolean
          mismatches?: Json | null
          playwright_count?: number | null
          playwright_time_ms?: number | null
          puppeteer_count?: number | null
          puppeteer_time_ms?: number | null
          run_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      verification_logs: {
        Row: {
          compliance_note: string | null
          created_at: string
          declaration_ids: string[] | null
          disaster_declarations: Json | null
          exemption_type: string | null
          id: string
          patient_postcode: string
          practice_id: string | null
          provider_type: Database["public"]["Enums"]["provider_type_enum"]
          user_id: string | null
          verification_result: boolean
        }
        Insert: {
          compliance_note?: string | null
          created_at?: string
          declaration_ids?: string[] | null
          disaster_declarations?: Json | null
          exemption_type?: string | null
          id?: string
          patient_postcode: string
          practice_id?: string | null
          provider_type: Database["public"]["Enums"]["provider_type_enum"]
          user_id?: string | null
          verification_result: boolean
        }
        Update: {
          compliance_note?: string | null
          created_at?: string
          declaration_ids?: string[] | null
          disaster_declarations?: Json | null
          exemption_type?: string | null
          id?: string
          patient_postcode?: string
          practice_id?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type_enum"]
          user_id?: string | null
          verification_result?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "verification_logs_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practice_registration"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_disasters_summary: {
        Row: {
          affected_lgas: number | null
          earliest_declaration: string | null
          latest_declaration: string | null
          state_code: string | null
          total_active: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown | null
          f_table_catalog: unknown | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown | null
          f_table_catalog: string | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      postcode_disaster_status: {
        Row: {
          has_active_disaster: boolean | null
          lga_id: number | null
          lga_name: string | null
          postcode: string | null
          state_territory_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lgas_state_territory_id_fkey"
            columns: ["state_territory_id"]
            isOneToOne: false
            referencedRelation: "states_territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postcode_lga_mapping_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_scripts_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_bestsrid: {
        Args: { "": unknown }
        Returns: number
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_pointoutside: {
        Args: { "": unknown }
        Returns: unknown
      }
      _st_sortablehash: {
        Args: { geom: unknown }
        Returns: number
      }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      addauth: {
        Args: { "": string }
        Returns: boolean
      }
      addgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
          | {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
          | {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
        Returns: string
      }
      auto_fix_disaster_dates: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      box: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box3d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3dtobox: {
        Args: { "": unknown }
        Returns: unknown
      }
      bytea: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      check_postcode_disaster_status: {
        Args: { input_postcode: string }
        Returns: {
          active_disasters: Json
          is_disaster_zone: boolean
          lga_name: string
          mbs_eligible: boolean
          postcode: string
          state_name: string
          suburb: string
        }[]
      }
      disablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dropgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
          | { column_name: string; schema_name: string; table_name: string }
          | { column_name: string; table_name: string }
        Returns: string
      }
      dropgeometrytable: {
        Args:
          | { catalog_name: string; schema_name: string; table_name: string }
          | { schema_name: string; table_name: string }
          | { table_name: string }
        Returns: string
      }
      enablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      gbt_bit_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bpchar_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bytea_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_inet_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_numeric_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_text_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_timetz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_tstz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      generate_certificate_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      geography: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      geography_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geography_gist_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_gist_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_send: {
        Args: { "": unknown }
        Returns: string
      }
      geography_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geography_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry: {
        Args:
          | { "": string }
          | { "": string }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
        Returns: unknown
      }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_sortsupport_2d: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_hash: {
        Args: { "": unknown }
        Returns: number
      }
      geometry_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_send: {
        Args: { "": unknown }
        Returns: string
      }
      geometry_sortsupport: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_spgist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_3d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geometry_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometrytype: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      get_proj4_from_srid: {
        Args: { "": number }
        Returns: string
      }
      gettransactionid: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      gidx_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gidx_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      json: {
        Args: { "": unknown }
        Returns: Json
      }
      jsonb: {
        Args: { "": unknown }
        Returns: Json
      }
      longtransactionsenabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      path: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_asflatgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_geometry_clusterintersecting_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_clusterwithin_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_collect_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_makeline_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_polygonize_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      point: {
        Args: { "": unknown }
        Returns: unknown
      }
      polygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      populate_geometry_columns: {
        Args:
          | { tbl_oid: unknown; use_typmod?: boolean }
          | { use_typmod?: boolean }
        Returns: number
      }
      postgis_addbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_dropbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_extensions_upgrade: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_full_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_geos_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_geos_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_getbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_hasbbox: {
        Args: { "": unknown }
        Returns: boolean
      }
      postgis_index_supportfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_lib_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_revision: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libjson_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_liblwgeom_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libprotobuf_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libxml_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_proj_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_installed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_released: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_svn_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_typmod_dims: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_srid: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_type: {
        Args: { "": number }
        Returns: string
      }
      postgis_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_wagyu_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      spheroid_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      spheroid_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlength: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dperimeter: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle: {
        Args:
          | { line1: unknown; line2: unknown }
          | { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
        Returns: number
      }
      st_area: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_area2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_asbinary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_asewkt: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asgeojson: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; options?: number }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
        Returns: string
      }
      st_asgml: {
        Args:
          | { "": string }
          | {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
          | {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
          | {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_ashexewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_askml: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
          | { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
        Returns: string
      }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: {
        Args: { format?: string; geom: unknown }
        Returns: string
      }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; rel?: number }
          | { geom: unknown; maxdecimaldigits?: number; rel?: number }
        Returns: string
      }
      st_astext: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_astwkb: {
        Args:
          | {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
          | {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
        Returns: string
      }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_boundary: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer: {
        Args:
          | { geom: unknown; options?: string; radius: number }
          | { geom: unknown; quadsegs: number; radius: number }
        Returns: unknown
      }
      st_buildarea: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_centroid: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      st_cleangeometry: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_clusterintersecting: {
        Args: { "": unknown[] }
        Returns: unknown[]
      }
      st_collect: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collectionextract: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_collectionhomogenize: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_convexhull: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_coorddim: {
        Args: { geometry: unknown }
        Returns: number
      }
      st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_dimension: {
        Args: { "": unknown }
        Returns: number
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance: {
        Args:
          | { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_distancesphere: {
        Args:
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; radius: number }
        Returns: number
      }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dump: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumppoints: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumprings: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumpsegments: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_endpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_envelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_expand: {
        Args:
          | { box: unknown; dx: number; dy: number }
          | { box: unknown; dx: number; dy: number; dz?: number }
          | { dm?: number; dx: number; dy: number; dz?: number; geom: unknown }
        Returns: unknown
      }
      st_exteriorring: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_flipcoordinates: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force3d: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_forcecollection: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcecurve: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygonccw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygoncw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcerhr: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcesfs: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_generatepoints: {
        Args:
          | { area: unknown; npoints: number }
          | { area: unknown; npoints: number; seed: number }
        Returns: unknown
      }
      st_geogfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geogfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geographyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geohash: {
        Args:
          | { geog: unknown; maxchars?: number }
          | { geom: unknown; maxchars?: number }
        Returns: string
      }
      st_geomcollfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomcollfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometrytype: {
        Args: { "": unknown }
        Returns: string
      }
      st_geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromgeojson: {
        Args: { "": Json } | { "": Json } | { "": string }
        Returns: unknown
      }
      st_geomfromgml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromkml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfrommarc21: {
        Args: { marc21xml: string }
        Returns: unknown
      }
      st_geomfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromtwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_gmltosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_hasarc: {
        Args: { geometry: unknown }
        Returns: boolean
      }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_isclosed: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_iscollection: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isempty: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygonccw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygoncw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isring: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_issimple: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvalid: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
      }
      st_isvalidreason: {
        Args: { "": unknown }
        Returns: string
      }
      st_isvalidtrajectory: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_length: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_length2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_letters: {
        Args: { font?: Json; letters: string }
        Returns: unknown
      }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefrommultipoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_linefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linemerge: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linestringfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linetocurve: {
        Args: { geometry: unknown }
        Returns: unknown
      }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_m: {
        Args: { "": unknown }
        Returns: number
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makepolygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { "": unknown } | { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_maximuminscribedcircle: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_memsize: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_minimumboundingradius: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_minimumclearance: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumclearanceline: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_mlinefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mlinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multi: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_multilinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multilinestringfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_ndims: {
        Args: { "": unknown }
        Returns: number
      }
      st_node: {
        Args: { g: unknown }
        Returns: unknown
      }
      st_normalize: {
        Args: { geom: unknown }
        Returns: unknown
      }
      st_npoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_nrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numgeometries: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorring: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpatches: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_orientedenvelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { "": unknown } | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_perimeter2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_pointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointonsurface: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_points: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonize: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: string
      }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_reverse: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid: {
        Args: { geog: unknown; srid: number } | { geom: unknown; srid: number }
        Returns: unknown
      }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shiftlongitude: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid: {
        Args: { geog: unknown } | { geom: unknown }
        Returns: number
      }
      st_startpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_summary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_transform: {
        Args:
          | { from_proj: string; geom: unknown; to_proj: string }
          | { from_proj: string; geom: unknown; to_srid: number }
          | { geom: unknown; to_proj: string }
        Returns: unknown
      }
      st_triangulatepolygon: {
        Args: { g1: unknown }
        Returns: unknown
      }
      st_union: {
        Args:
          | { "": unknown[] }
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; gridsize: number }
        Returns: unknown
      }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_wkbtosql: {
        Args: { wkb: string }
        Returns: unknown
      }
      st_wkttosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      st_x: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmin: {
        Args: { "": unknown }
        Returns: number
      }
      st_y: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymax: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymin: {
        Args: { "": unknown }
        Returns: number
      }
      st_z: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmflag: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmin: {
        Args: { "": unknown }
        Returns: number
      }
      text: {
        Args: { "": unknown }
        Returns: string
      }
      unlockrows: {
        Args: { "": string }
        Returns: number
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_disaster_dates: {
        Args: Record<PropertyKey, never>
        Returns: {
          affected_records: string[]
          issue_count: number
          issue_type: string
        }[]
      }
    }
    Enums: {
      declaration_status_enum: "active" | "expired" | "revoked" | "superseded"
      disaster_severity:
        | "minimal"
        | "minor"
        | "moderate"
        | "major"
        | "catastrophic"
      disaster_type:
        | "bushfire"
        | "flood"
        | "cyclone"
        | "earthquake"
        | "pandemic"
        | "industrial"
        | "cyber"
        | "extreme_weather"
      disaster_type_enum:
        | "bushfire"
        | "flood"
        | "cyclone"
        | "earthquake"
        | "severe_storm"
        | "drought"
        | "heatwave"
        | "landslide"
        | "tsunami"
        | "other"
      provider_type: "GP" | "NP" | "SPECIALIST" | "ALLIED_HEALTH"
      provider_type_enum: "GP" | "NP" | "Mixed"
      subscription_plan_enum:
        | "starter"
        | "np_specialist"
        | "professional"
        | "enterprise"
        | "corporate"
      verification_status:
        | "pending"
        | "verified"
        | "disputed"
        | "rejected"
        | "expired"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown | null
      }
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
      declaration_status_enum: ["active", "expired", "revoked", "superseded"],
      disaster_severity: [
        "minimal",
        "minor",
        "moderate",
        "major",
        "catastrophic",
      ],
      disaster_type: [
        "bushfire",
        "flood",
        "cyclone",
        "earthquake",
        "pandemic",
        "industrial",
        "cyber",
        "extreme_weather",
      ],
      disaster_type_enum: [
        "bushfire",
        "flood",
        "cyclone",
        "earthquake",
        "severe_storm",
        "drought",
        "heatwave",
        "landslide",
        "tsunami",
        "other",
      ],
      provider_type: ["GP", "NP", "SPECIALIST", "ALLIED_HEALTH"],
      provider_type_enum: ["GP", "NP", "Mixed"],
      subscription_plan_enum: [
        "starter",
        "np_specialist",
        "professional",
        "enterprise",
        "corporate",
      ],
      verification_status: [
        "pending",
        "verified",
        "disputed",
        "rejected",
        "expired",
      ],
    },
  },
} as const
