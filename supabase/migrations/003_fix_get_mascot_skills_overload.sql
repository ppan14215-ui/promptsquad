-- =============================================
-- FIX GET_MASCOT_SKILLS FUNCTION OVERLOADING
-- Drop UUID version to resolve PGRST203 error
-- =============================================

-- Drop the UUID version explicitly to resolve PostgREST function overloading conflict
-- PostgREST can't choose between VARCHAR and UUID versions, so we remove the UUID one
-- The VARCHAR version already exists from 001_fresh_start.sql

DROP FUNCTION IF EXISTS public.get_mascot_skills(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_mascot_skills(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_mascot_skills(public.uuid) CASCADE;
