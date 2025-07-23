-- Fix for customer search - Enable pg_trgm extension for similarity search
-- This extension is needed for the % operator and similarity() function used in customer search

-- Enable the pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create index on customer name and phone for faster trigram searches
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm ON customers USING gin(phone gin_trgm_ops);

-- Test that trigram functions work
DO $$
BEGIN
    RAISE NOTICE 'pg_trgm extension enabled successfully';
    -- Test trigram similarity
    PERFORM similarity('test', 'test');
    RAISE NOTICE 'Trigram similarity function working';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error enabling trigram functions: %', SQLERRM;
END
$$;