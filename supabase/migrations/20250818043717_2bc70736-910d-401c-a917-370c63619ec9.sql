-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'super_admin', 'viewer')) DEFAULT 'viewer',
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Search analytics logs
CREATE TABLE IF NOT EXISTS public.search_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  postcode TEXT NOT NULL,
  result_status TEXT CHECK (result_status IN ('eligible', 'not_eligible', 'error')),
  ip_address INET,
  user_agent TEXT,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client subscriptions tracking
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscription_type TEXT CHECK (subscription_type IN ('free', 'starter', 'professional', 'enterprise')) DEFAULT 'free',
  api_key TEXT UNIQUE,
  monthly_searches INTEGER DEFAULT 0,
  max_monthly_searches INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Validation comparisons table
CREATE TABLE IF NOT EXISTS public.validation_comparisons (
  id SERIAL PRIMARY KEY,
  primary_scraper_count INTEGER NOT NULL,
  validation_scraper_count INTEGER,
  live_website_count INTEGER,
  discrepancy_found BOOLEAN DEFAULT false,
  comparison_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  state_code TEXT,
  notes TEXT,
  resolved BOOLEAN DEFAULT false
);

-- Scraper runs history
CREATE TABLE IF NOT EXISTS public.scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT CHECK (run_type IN ('primary', 'validation', 'comparison')) NOT NULL,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'cancelled')) DEFAULT 'running',
  records_processed INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  source_url TEXT
);

-- System health metrics
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  threshold_min NUMERIC,
  threshold_max NUMERIC,
  is_healthy BOOLEAN DEFAULT true,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS public.api_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all admin tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access
CREATE POLICY "Admin users full access" ON public.admin_users
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admin access to search logs" ON public.search_logs
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admin access to client subscriptions" ON public.client_subscriptions
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admin access to validation comparisons" ON public.validation_comparisons
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE role IN ('admin', 'super_admin', 'viewer'))
  );

CREATE POLICY "Admin access to scraper runs" ON public.scraper_runs
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE role IN ('admin', 'super_admin', 'viewer'))
  );

CREATE POLICY "Admin access to health metrics" ON public.health_metrics
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE role IN ('admin', 'super_admin', 'viewer'))
  );

CREATE POLICY "Admin access to API usage" ON public.api_usage
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE role IN ('admin', 'super_admin'))
  );

-- Create function to check admin access
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = is_admin.user_id 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_logs_searched_at ON public.search_logs(searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_postcode ON public.search_logs(postcode);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded_at ON public.health_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_started_at ON public.scraper_runs(started_at DESC);