export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          bio: string | null
          location: string | null
          state: string | null
          postcode: string | null
          is_verified: boolean
          verification_documents: Json | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          bio?: string | null
          location?: string | null
          state?: string | null
          postcode?: string | null
          is_verified?: boolean
          verification_documents?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          bio?: string | null
          location?: string | null
          state?: string | null
          postcode?: string | null
          is_verified?: boolean
          verification_documents?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string
          category: string
          subcategory: string | null
          daily_rate: number
          weekly_rate: number | null
          monthly_rate: number | null
          deposit_amount: number
          images: string[]
          location: string
          state: string
          postcode: string
          latitude: number | null
          longitude: number | null
          is_available: boolean
          delivery_methods: string[]
          condition: string
          brand: string | null
          model: string | null
          year: number | null
          features: string[]
          rules: string[]
          tags: string[]
          view_count: number
          favorite_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description: string
          category: string
          subcategory?: string | null
          daily_rate: number
          weekly_rate?: number | null
          monthly_rate?: number | null
          deposit_amount: number
          images: string[]
          location: string
          state: string
          postcode: string
          latitude?: number | null
          longitude?: number | null
          is_available?: boolean
          delivery_methods: string[]
          condition: string
          brand?: string | null
          model?: string | null
          year?: number | null
          features?: string[]
          rules?: string[]
          tags?: string[]
          view_count?: number
          favorite_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string
          category?: string
          subcategory?: string | null
          daily_rate?: number
          weekly_rate?: number | null
          monthly_rate?: number | null
          deposit_amount?: number
          images?: string[]
          location?: string
          state?: string
          postcode?: string
          latitude?: number | null
          longitude?: number | null
          is_available?: boolean
          delivery_methods?: string[]
          condition?: string
          brand?: string | null
          model?: string | null
          year?: number | null
          features?: string[]
          rules?: string[]
          tags?: string[]
          view_count?: number
          favorite_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          listing_id: string
          renter_id: string
          owner_id: string
          start_date: string
          end_date: string
          total_days: number
          daily_rate: number
          subtotal: number
          service_fee: number
          total_amount: number
          deposit_amount: number
          status: string
          delivery_method: string
          delivery_address: string | null
          pickup_address: string | null
          special_instructions: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          renter_id: string
          owner_id: string
          start_date: string
          end_date: string
          total_days: number
          daily_rate: number
          subtotal: number
          service_fee: number
          total_amount: number
          deposit_amount: number
          status: string
          delivery_method: string
          delivery_address?: string | null
          pickup_address?: string | null
          special_instructions?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          renter_id?: string
          owner_id?: string
          start_date?: string
          end_date?: string
          total_days?: number
          daily_rate?: number
          subtotal?: number
          service_fee?: number
          total_amount?: number
          deposit_amount?: number
          status?: string
          delivery_method?: string
          delivery_address?: string | null
          pickup_address?: string | null
          special_instructions?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          listing_id: string | null
          booking_id: string | null
          participants: string[]
          last_message: string | null
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id?: string | null
          booking_id?: string | null
          participants: string[]
          last_message?: string | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string | null
          booking_id?: string | null
          participants?: string[]
          last_message?: string | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          message_type: string
          attachment_url: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          message_type?: string
          attachment_url?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          message_type?: string
          attachment_url?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string | null
          review_type: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment?: string | null
          review_type: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          reviewer_id?: string
          reviewee_id?: string
          rating?: number
          comment?: string | null
          review_type?: string
          created_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          listing_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          data: Json | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          data?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          data?: Json | null
          is_read?: boolean
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_item_id: string
          report_type: string
          reason: string
          description: string | null
          status: string
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_item_id: string
          report_type: string
          reason: string
          description?: string | null
          status?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_item_id?: string
          report_type?: string
          reason?: string
          description?: string | null
          status?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
      delivery_method: 'pickup' | 'delivery' | 'both'
      listing_condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
      message_type: 'text' | 'image' | 'system'
      review_type: 'renter_to_owner' | 'owner_to_renter'
      notification_type: 'booking' | 'message' | 'review' | 'system'
      report_type: 'listing' | 'user' | 'booking'
      report_status: 'pending' | 'investigating' | 'resolved' | 'dismissed'
    }
  }
} 