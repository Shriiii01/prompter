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