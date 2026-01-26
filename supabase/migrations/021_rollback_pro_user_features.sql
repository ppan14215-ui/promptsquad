-- Rollback migration: Remove PRO user role features that broke skill visibility
-- This undoes the changes from migration 020_pro_user_and_private_customizations.sql

-- Drop the modified get_mascot_skills function
DROP FUNCTION IF EXISTS get_mascot_skills(p_mascot_id TEXT);

-- Recreate the original get_mascot_skills function (without user_id filtering)
CREATE OR REPLACE FUNCTION get_mascot_skills(p_mascot_id TEXT)
RETURNS TABLE (
  id TEXT,
  mascot_id TEXT,
  skill_label TEXT,
  skill_prompt TEXT,
  is_full_access BOOLEAN,
  sort_order INT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.id,
    ms.mascot_id,
    ms.skill_label,
    ms.skill_prompt,
    ms.is_full_access,
    ms.sort_order,
    ms.is_active,
    ms.created_at,
    ms.updated_at
  FROM mascot_skills ms
  WHERE ms.mascot_id = p_mascot_id
    AND ms.is_active = true
  ORDER BY ms.sort_order ASC, ms.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop RLS policies if they exist
DROP POLICY IF EXISTS "Users can view all active skills" ON mascot_skills;
DROP POLICY IF EXISTS "Admins can manage all skills" ON mascot_skills;
DROP POLICY IF EXISTS "PRO users can manage their own skills" ON mascot_skills;
DROP POLICY IF EXISTS "Users can view all personalities" ON mascot_personality;
DROP POLICY IF EXISTS "Admins can manage all personalities" ON mascot_personality;
DROP POLICY IF EXISTS "PRO users can manage their own personalities" ON mascot_personality;

-- Disable RLS on tables (restore original state)
ALTER TABLE mascot_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE mascot_personality DISABLE ROW LEVEL SECURITY;

-- Remove user_id columns from tables
ALTER TABLE mascot_skills DROP COLUMN IF EXISTS user_id;
ALTER TABLE mascot_personality DROP COLUMN IF EXISTS user_id;
ALTER TABLE mascots DROP COLUMN IF EXISTS user_id;
