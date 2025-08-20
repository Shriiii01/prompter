-- Simple User Tracking Schema with Subscription Support
-- Run this in your Supabase SQL editor

-- Create simple users table with subscription support
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    enhanced_prompts INTEGER DEFAULT 0,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    daily_prompts_used INTEGER DEFAULT 0,
    last_prompt_reset DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role full access" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON users TO service_role;
GRANT USAGE ON SCHEMA public TO service_role; 

-- Per-platform counters on users for fast aggregation (safe to re-run)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS platform_chatgpt_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS platform_claude_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS platform_gemini_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS platform_perplexity_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS platform_meta_count INTEGER DEFAULT 0;

-- Enhancement events table for idempotent, append-only tracking
CREATE TABLE IF NOT EXISTS enhancement_events (
    event_id UUID PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enhancement_events_user_email ON enhancement_events(user_email);

-- Allow service role to manage events
ALTER TABLE enhancement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access (events)" ON enhancement_events
    FOR ALL USING (auth.role() = 'service_role');

-- Atomic function to record an enhancement with idempotency and limits
-- Returns updated counters and whether free-tier limit has been reached
CREATE OR REPLACE FUNCTION record_enhancement(p_event_id UUID, p_email TEXT)
RETURNS TABLE (
    enhanced_prompts INTEGER,
    daily_prompts_used INTEGER,
    subscription_tier TEXT,
    limit_reached BOOLEAN
) AS $$
DECLARE
    v_rows INTEGER := 0;
    v_tier TEXT;
    v_used INTEGER;
BEGIN
    -- Ensure the user exists
    INSERT INTO users (email)
    VALUES (p_email)
    ON CONFLICT (email) DO NOTHING;

    -- Reset daily counters if date changed
    UPDATE users
    SET daily_prompts_used = 0,
        last_prompt_reset = CURRENT_DATE
    WHERE email = p_email
      AND (last_prompt_reset IS NULL OR last_prompt_reset <> CURRENT_DATE);

    -- Read current tier and usage
    SELECT subscription_tier, COALESCE(daily_prompts_used, 0)
      INTO v_tier, v_used
      FROM users
     WHERE email = p_email
     LIMIT 1;

    -- Guard: if free user already at limit, do not insert event, just return current state
    IF v_tier = 'free' AND v_used >= 5 THEN
        RETURN QUERY
        SELECT u.enhanced_prompts, u.daily_prompts_used, u.subscription_tier, TRUE
          FROM users u
         WHERE u.email = p_email;
        RETURN;
    END IF;

    -- Idempotent event insert
    INSERT INTO enhancement_events (event_id, user_email)
    VALUES (p_event_id, p_email)
    ON CONFLICT (event_id) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    -- If this event was already processed, return current state without increment
    IF v_rows = 0 THEN
        RETURN QUERY
        SELECT u.enhanced_prompts, u.daily_prompts_used, u.subscription_tier,
               CASE WHEN u.subscription_tier = 'free' AND u.daily_prompts_used >= 5 THEN TRUE ELSE FALSE END
          FROM users u
         WHERE u.email = p_email;
        RETURN;
    END IF;

    -- First time seeing this event: increment counters (free users also increment daily usage)
    UPDATE users
       SET enhanced_prompts = COALESCE(enhanced_prompts, 0) + 1,
           daily_prompts_used = CASE WHEN v_tier = 'free' THEN COALESCE(daily_prompts_used, 0) + 1 ELSE daily_prompts_used END
     WHERE email = p_email;

    RETURN QUERY
    SELECT u.enhanced_prompts, u.daily_prompts_used, u.subscription_tier,
           CASE WHEN u.subscription_tier = 'free' AND u.daily_prompts_used >= 5 THEN TRUE ELSE FALSE END
      FROM users u
     WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Platform usage analytics (per enhancement)
-- ============================================
CREATE TABLE IF NOT EXISTS enhancement_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('chatgpt','claude','gemini','perplexity','meta')),
    provider TEXT,
    target_model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enhancement_usage_platform_created_at
    ON enhancement_usage(platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhancement_usage_user_created_at
    ON enhancement_usage(user_email, created_at DESC);

ALTER TABLE enhancement_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access (usage)" ON enhancement_usage
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- V2 RPC: Idempotent enhancement + per-platform counters
-- ============================================
CREATE OR REPLACE FUNCTION public.record_enhancement_v2(p_event_id UUID, p_email TEXT, p_platform TEXT)
RETURNS TABLE (
  enhanced_prompts INTEGER,
  daily_prompts_used INTEGER,
  subscription_tier TEXT,
  limit_reached BOOLEAN
) AS $$
DECLARE
  v_rows INTEGER := 0;
  v_tier TEXT;
  v_used INTEGER;
  v_platform TEXT := lower(coalesce(p_platform, 'chatgpt'));
BEGIN
  INSERT INTO public.users (email) VALUES (p_email) ON CONFLICT (email) DO NOTHING;

  UPDATE public.users
     SET daily_prompts_used = 0, last_prompt_reset = CURRENT_DATE
   WHERE email = p_email
     AND (last_prompt_reset IS NULL OR last_prompt_reset <> CURRENT_DATE);

  SELECT u.subscription_tier, COALESCE(u.daily_prompts_used, 0)
    INTO v_tier, v_used
    FROM public.users u WHERE u.email = p_email LIMIT 1;

  IF v_tier = 'free' AND v_used >= 5 THEN
    RETURN QUERY SELECT u.enhanced_prompts, u.daily_prompts_used, u.subscription_tier, TRUE
      FROM public.users u WHERE u.email = p_email;
    RETURN;
  END IF;

  INSERT INTO public.enhancement_events (event_id, user_email)
  VALUES (p_event_id, p_email)
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN QUERY SELECT u.enhanced_prompts, u.daily_prompts_used, u.subscription_tier,
      CASE WHEN u.subscription_tier='free' AND u.daily_prompts_used >= 5 THEN TRUE ELSE FALSE END
      FROM public.users u WHERE u.email = p_email;
    RETURN;
  END IF;

  UPDATE public.users u
     SET enhanced_prompts = COALESCE(u.enhanced_prompts, 0) + 1,
         daily_prompts_used = CASE WHEN v_tier='free' THEN COALESCE(u.daily_prompts_used, 0) + 1 ELSE u.daily_prompts_used END,
         platform_chatgpt_count = CASE WHEN v_platform='chatgpt' THEN COALESCE(u.platform_chatgpt_count,0)+1 ELSE u.platform_chatgpt_count END,
         platform_claude_count = CASE WHEN v_platform='claude' THEN COALESCE(u.platform_claude_count,0)+1 ELSE u.platform_claude_count END,
         platform_gemini_count = CASE WHEN v_platform='gemini' THEN COALESCE(u.platform_gemini_count,0)+1 ELSE u.platform_gemini_count END,
         platform_perplexity_count = CASE WHEN v_platform='perplexity' THEN COALESCE(u.platform_perplexity_count,0)+1 ELSE u.platform_perplexity_count END,
         platform_meta_count = CASE WHEN v_platform='meta' THEN COALESCE(u.platform_meta_count,0)+1 ELSE u.platform_meta_count END
   WHERE u.email = p_email;

  RETURN QUERY SELECT u.enhanced_prompts, u.daily_prompts_used, u.subscription_tier,
    CASE WHEN u.subscription_tier='free' AND u.daily_prompts_used >= 5 THEN TRUE ELSE FALSE END
    FROM public.users u WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;