-- Fix RPC function to match exact code expectations
-- Run this in Supabase SQL Editor

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS record_enhancement_v3(UUID, TEXT, TEXT);

-- Create the exact function the code expects
CREATE OR REPLACE FUNCTION record_enhancement_v3(
    p_event_id UUID, 
    p_email TEXT, 
    p_platform TEXT
)
RETURNS TABLE (
    total_prompts INTEGER,
    daily_used INTEGER,
    user_tier TEXT,
    limit_reached BOOLEAN
) AS $$
DECLARE
    v_rows INTEGER := 0;
    v_tier TEXT;
    v_used INTEGER;
    v_platform TEXT := lower(coalesce(p_platform, 'chatgpt'));
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
    IF v_tier = 'free' AND v_used >= 10 THEN
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
               CASE WHEN u.subscription_tier = 'free' AND u.daily_prompts_used >= 10 THEN TRUE ELSE FALSE END
          FROM users u
         WHERE u.email = p_email;
        RETURN;
    END IF;

    -- First time seeing this event: increment counters (free users also increment daily usage)
    UPDATE users
       SET enhanced_prompts = COALESCE(enhanced_prompts, 0) + 1,
           daily_prompts_used = CASE WHEN v_tier = 'free' THEN COALESCE(daily_prompts_used, 0) + 1 ELSE daily_prompts_used END,
           platform_chatgpt_count = CASE WHEN v_platform = 'chatgpt' THEN COALESCE(platform_chatgpt_count, 0) + 1 ELSE platform_chatgpt_count END,
           platform_claude_count = CASE WHEN v_platform = 'claude' THEN COALESCE(platform_claude_count, 0) + 1 ELSE platform_claude_count END,
           platform_gemini_count = CASE WHEN v_platform = 'gemini' THEN COALESCE(platform_gemini_count, 0) + 1 ELSE platform_gemini_count END,
           platform_perplexity_count = CASE WHEN v_platform = 'perplexity' THEN COALESCE(platform_perplexity_count, 0) + 1 ELSE platform_perplexity_count END,
           platform_meta_count = CASE WHEN v_platform = 'meta' THEN COALESCE(platform_meta_count, 0) + 1 ELSE platform_meta_count END
     WHERE email = p_email;

    RETURN QUERY
    SELECT u.enhanced_prompts, u.daily_prompts_used, u.subscription_tier,
           CASE WHEN u.subscription_tier = 'free' AND u.daily_prompts_used >= 10 THEN TRUE ELSE FALSE END
      FROM users u
     WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT 'Function created successfully' as status;
