-- Atomic conditional increment for ai_usage to prevent TOCTOU races.
-- Returns new count (1..p_limit) on success, or -1 if limit already reached.
-- Called from routers/ai.py via supabase.rpc("try_increment_ai_usage", ...).
CREATE OR REPLACE FUNCTION try_increment_ai_usage(
    p_user_id TEXT,
    p_date    DATE,
    p_limit   INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    INSERT INTO ai_usage (user_id, usage_date, ai_call_count)
    VALUES (p_user_id, p_date, 0)
    ON CONFLICT (user_id, usage_date) DO NOTHING;

    UPDATE ai_usage
    SET ai_call_count = ai_call_count + 1
    WHERE user_id    = p_user_id
      AND usage_date = p_date
      AND ai_call_count < p_limit
    RETURNING ai_call_count INTO v_new_count;

    IF v_new_count IS NULL THEN
        RETURN -1;
    END IF;

    RETURN v_new_count;
END;
$$;
