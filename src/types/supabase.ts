export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };

      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          key: string;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          key: string;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          last_used_at?: string | null;
        };
      };

      social_accounts: {
        Row: {
          id: string;
          user_id: string;
          platform:
            | 'youtube'
            | 'instagram'
            | 'twitter'
            | 'facebook'
            | 'tiktok'
            | 'linkedin';
          platform_user_id: string;
          platform_username: string;
          access_token: string;
          refresh_token: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform:
            | 'youtube'
            | 'instagram'
            | 'twitter'
            | 'facebook'
            | 'tiktok'
            | 'linkedin';
          platform_user_id: string;
          platform_username: string;
          access_token: string;
          refresh_token?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          platform_username?: string;
          access_token?: string;
          refresh_token?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
      };

      posts: {
        Row: {
          id: string;
          user_id: string;
          social_account_id: string | null;
          platform:
            | 'youtube'
            | 'instagram'
            | 'twitter'
            | 'facebook'
            | 'tiktok'
            | 'linkedin'
            | 'url';
          platform_post_id: string | null;
          post_url: string;
          title: string | null;
          content: string | null;
          author: string | null;
          published_at: string | null;
          likes_count: number | null;
          comments_count: number | null;
          shares_count: number | null;
          views_count: number | null;
          thumbnail_url: string | null;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          social_account_id?: string | null;
          platform:
            | 'youtube'
            | 'instagram'
            | 'twitter'
            | 'facebook'
            | 'tiktok'
            | 'linkedin'
            | 'url';
          platform_post_id?: string | null;
          post_url: string;
          title?: string | null;
          content?: string | null;
          author?: string | null;
          published_at?: string | null;
          likes_count?: number | null;
          comments_count?: number | null;
          shares_count?: number | null;
          views_count?: number | null;
          thumbnail_url?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string | null;
          content?: string | null;
          author?: string | null;
          published_at?: string | null;
          likes_count?: number | null;
          comments_count?: number | null;
          shares_count?: number | null;
          views_count?: number | null;
          thumbnail_url?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          updated_at?: string;
        };
      };

      analyses: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          sentiment_positive: number;
          sentiment_negative: number;
          sentiment_neutral: number;
          keywords: string[];
          key_questions: string[];
          summary_overview: string;
          summary_positive: string;
          summary_negative: string;
          summary_neutral: string;
          suggestions: string[];
          analysis_model: string;
          confidence_score: number | null;
          processing_time_ms: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          sentiment_positive: number;
          sentiment_negative: number;
          sentiment_neutral: number;
          keywords: string[];
          key_questions: string[];
          summary_overview: string;
          summary_positive: string;
          summary_negative: string;
          summary_neutral: string;
          suggestions: string[];
          analysis_model: string;
          confidence_score?: number | null;
          processing_time_ms?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          sentiment_positive?: number;
          sentiment_negative?: number;
          sentiment_neutral?: number;
          keywords?: string[];
          key_questions?: string[];
          summary_overview?: string;
          summary_positive?: string;
          summary_negative?: string;
          summary_neutral?: string;
          suggestions?: string[];
          analysis_model?: string;
          confidence_score?: number | null;
          processing_time_ms?: number | null;
          updated_at?: string;
        };
      };

      comments: {
        Row: {
          id: string;
          post_id: string;
          platform_comment_id: string | null;
          author_name: string | null;
          author_id: string | null;
          content: string;
          likes_count: number | null;
          replies_count: number | null;
          published_at: string | null;
          parent_comment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          platform_comment_id?: string | null;
          author_name?: string | null;
          author_id?: string | null;
          content: string;
          likes_count?: number | null;
          replies_count?: number | null;
          published_at?: string | null;
          parent_comment_id?: string | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          likes_count?: number | null;
          replies_count?: number | null;
        };
      };

      usage_logs: {
        Row: {
          id: string;
          user_id: string;
          action: 'url_analysis' | 'connected_account_analysis' | 'api_call';
          post_id: string | null;
          api_key_id: string | null;
          credits_used: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: 'url_analysis' | 'connected_account_analysis' | 'api_call';
          post_id?: string | null;
          api_key_id?: string | null;
          credits_used: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          credits_used?: number;
          metadata?: Json | null;
        };
      };

      user_credits: {
        Row: {
          id: string;
          user_id: string;
          credits_available: number;
          credits_used: number;
          plan: 'free' | 'basic' | 'pro' | 'enterprise';
          plan_expires_at: string | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          credits_available?: number;
          credits_used?: number;
          plan?: 'free' | 'basic' | 'pro' | 'enterprise';
          plan_expires_at?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          credits_available?: number;
          credits_used?: number;
          plan?: 'free' | 'basic' | 'pro' | 'enterprise';
          plan_expires_at?: string | null;
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
      };

      credit_packages: {
        Row: {
          id: string;
          name: string;
          description: string;
          credits: number;
          price_cents: number;
          stripe_price_id: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          credits: number;
          price_cents: number;
          stripe_price_id: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          credits?: number;
          price_cents?: number;
          stripe_price_id?: string;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };

      credit_purchases: {
        Row: {
          id: string;
          user_id: string;
          credit_package_id: string;
          stripe_payment_intent_id: string;
          stripe_session_id: string | null;
          amount_cents: number;
          credits_purchased: number;
          status: 'pending' | 'completed' | 'failed' | 'refunded';
          stripe_status: string;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          credit_package_id: string;
          stripe_payment_intent_id: string;
          stripe_session_id?: string | null;
          amount_cents: number;
          credits_purchased: number;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          stripe_status: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          stripe_status?: string;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          status:
            | 'active'
            | 'canceled'
            | 'incomplete'
            | 'incomplete_expired'
            | 'past_due'
            | 'trialing'
            | 'unpaid';
          plan: 'basic' | 'pro' | 'enterprise';
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          monthly_credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          status:
            | 'active'
            | 'canceled'
            | 'incomplete'
            | 'incomplete_expired'
            | 'past_due'
            | 'trialing'
            | 'unpaid';
          plan: 'basic' | 'pro' | 'enterprise';
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end?: boolean;
          monthly_credits: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?:
            | 'active'
            | 'canceled'
            | 'incomplete'
            | 'incomplete_expired'
            | 'past_due'
            | 'trialing'
            | 'unpaid';
          plan?: 'basic' | 'pro' | 'enterprise';
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          monthly_credits?: number;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      platform_type:
        | 'youtube'
        | 'instagram'
        | 'twitter'
        | 'facebook'
        | 'tiktok'
        | 'linkedin'
        | 'url';
      post_status: 'pending' | 'processing' | 'completed' | 'failed';
      user_action: 'url_analysis' | 'connected_account_analysis' | 'api_call';
      user_plan: 'free' | 'basic' | 'pro' | 'enterprise';
      purchase_status: 'pending' | 'completed' | 'failed' | 'refunded';
      subscription_status:
        | 'active'
        | 'canceled'
        | 'incomplete'
        | 'incomplete_expired'
        | 'past_due'
        | 'trialing'
        | 'unpaid';
    };
  };
}
