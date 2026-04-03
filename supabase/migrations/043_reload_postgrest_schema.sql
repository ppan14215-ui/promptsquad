-- Refresh PostgREST so new columns (e.g. mascots.description) are visible to the API.
NOTIFY pgrst, 'reload schema';
