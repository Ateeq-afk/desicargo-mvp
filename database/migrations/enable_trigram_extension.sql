-- Enable pg_trgm extension for fuzzy text search
-- This enables similarity() function and % operator for trigram matching

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on customer name and phone for fast similarity search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_name_gin ON customers USING gin (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_phone_gin ON customers USING gin (phone gin_trgm_ops);

-- Set similarity threshold (0.3 means 30% similarity required)
-- This can be adjusted per session with: SET pg_trgm.similarity_threshold = 0.3;
SELECT set_limit(0.3);