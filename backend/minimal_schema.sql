-- MINIMAL DATABASE SCHEMA - EXACTLY WHAT THE CODE EXPECTS
-- This is the minimal setup that will work with your existing code

-- 1. USERS TABLE (Main table - REQUIRED)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT 'User',
    enhanced_prompts INTEGER DEFAULT 0,
    subscription_tier TEXT DEFAULT 'free',
    daily_prompts_used INTEGER DEFAULT 0,
    last_prompt_reset DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS and grant permissions
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON users FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON users TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- 2. ENHANCEMENT_EVENTS TABLE (Optional - for tracking)
CREATE TABLE IF NOT EXISTS enhancement_events (
    event_id UUID PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enhancement_events_user_email ON enhancement_events(user_email);
ALTER TABLE enhancement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access (events)" ON enhancement_events FOR ALL USING (auth.role() = 'service_role');

-- 3. ENHANCEMENT_USAGE TABLE (Optional - for analytics)
CREATE TABLE IF NOT EXISTS enhancement_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    platform TEXT,
    provider TEXT,
    target_model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enhancement_usage_user_email ON enhancement_usage(user_email);
ALTER TABLE enhancement_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access (usage)" ON enhancement_usage FOR ALL USING (auth.role() = 'service_role');

-- 4. SIMPLE FUNCTION FOR INCREMENTING USER COUNTS
CREATE OR REPLACE FUNCTION increment_user_prompts(p_email TEXT)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    -- Ensure user exists
    INSERT INTO users (email) VALUES (p_email) ON CONFLICT (email) DO NOTHING;
    
    -- Increment count
    UPDATE users 
    SET enhanced_prompts = COALESCE(enhanced_prompts, 0) + 1
    WHERE email = p_email
    RETURNING enhanced_prompts INTO new_count;
    
    RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_user_prompts(TEXT) TO service_role;
