-- Update daily limit from 5 to 10 free prompts per day
-- Run this in your Supabase SQL editor

-- Update the record_enhancement function
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
           daily_prompts_used = CASE WHEN v_tier = 'free' THEN COALESCE(daily_prompts_used, 0) + 1 ELSE daily_prompts_used END
     WHERE email = p_email;

    RETURN QUERY
    SELECT u.enhanced_prompts, u.daily_prompts_used, u.subscription_tier,
           CASE WHEN u.subscription_tier = 'free' AND u.daily_prompts_used >= 10 THEN TRUE ELSE FALSE END
      FROM users u
     WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the record_enhancement_v2 function
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

  IF v_tier = 'free' AND v_used >= 10 THEN
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
      CASE WHEN u.subscription_tier='free' AND u.daily_prompts_used >= 10 THEN TRUE ELSE FALSE END
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
    CASE WHEN u.subscription_tier='free' AND u.daily_prompts_used >= 10 THEN TRUE ELSE FALSE END
    FROM public.users u WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the record_enhancement_v3 function that the code actually calls
CREATE OR REPLACE FUNCTION record_enhancement_v3(p_event_id UUID, p_email TEXT, p_platform TEXT)
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
  INSERT INTO public.users (email) VALUES (p_email) ON CONFLICT (email) DO NOTHING;

  UPDATE public.users
     SET daily_prompts_used = 0, last_prompt_reset = CURRENT_DATE
   WHERE email = p_email
     AND (last_prompt_reset IS NULL OR last_prompt_reset <> CURRENT_DATE);

  SELECT u.subscription_tier, COALESCE(u.daily_prompts_used, 0)
    INTO v_tier, v_used
    FROM public.users u WHERE u.email = p_email LIMIT 1;

  IF v_tier = 'free' AND v_used >= 10 THEN
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
      CASE WHEN u.subscription_tier='free' AND u.daily_prompts_used >= 10 THEN TRUE ELSE FALSE END
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
    CASE WHEN u.subscription_tier='free' AND u.daily_prompts_used >= 10 THEN TRUE ELSE FALSE END
    FROM public.users u WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the changes
SELECT 'Daily limit updated to 10 free prompts per day' as status;
