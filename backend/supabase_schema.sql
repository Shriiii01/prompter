-- Simple User Tracking Schema
-- Run this in your Supabase SQL editor

-- Create simple users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    enhanced_prompts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role full access" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Create RPC function for atomic increment
CREATE OR REPLACE FUNCTION increment_user_prompts(user_email TEXT)
RETURNS TABLE(enhanced_prompts INTEGER) AS $$
BEGIN
    UPDATE users 
    SET enhanced_prompts = enhanced_prompts + 1 
    WHERE email = user_email;
    
    RETURN QUERY 
    SELECT users.enhanced_prompts 
    FROM users 
    WHERE users.email = user_email;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON users TO service_role;
GRANT USAGE ON SCHEMA public TO service_role; 
GRANT EXECUTE ON FUNCTION increment_user_prompts(TEXT) TO service_role; 