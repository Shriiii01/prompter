-- CORRECT DATABASE SCHEMA - EXACTLY WHAT YOUR CODE EXPECTS
-- Based on actual code analysis, not guesses

-- 1. USER_STATS TABLE (Used by older database service code)
CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY,
    prompt_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Enable RLS and grant permissions
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access (user_stats)" ON user_stats FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON user_stats TO service_role;

-- 2. ENHANCEMENT_LOGS TABLE (Used by older database service code)
CREATE TABLE IF NOT EXISTS enhancement_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    original_prompt TEXT NOT NULL,
    enhanced_prompt TEXT NOT NULL,
    provider TEXT,
    target_model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_enhancement_logs_user_id ON enhancement_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_enhancement_logs_created_at ON enhancement_logs(created_at);

-- Enable RLS and grant permissions
ALTER TABLE enhancement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access (enhancement_logs)" ON enhancement_logs FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON enhancement_logs TO service_role;

-- 3. USERS TABLE (Used by newer API endpoints)
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
CREATE POLICY "Service role full access (users)" ON users FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON users TO service_role;

-- 4. ENHANCEMENT_EVENTS TABLE (Used by newer schema)
CREATE TABLE IF NOT EXISTS enhancement_events (
    event_id UUID PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enhancement_events_user_email ON enhancement_events(user_email);
ALTER TABLE enhancement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access (events)" ON enhancement_events FOR ALL USING (auth.role() = 'service_role');

-- 5. ENHANCEMENT_USAGE TABLE (Used by newer schema)
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

-- Grant all permissions
GRANT USAGE ON SCHEMA public TO service_role;

-- Simple function for incrementing user prompts (for newer code)
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

