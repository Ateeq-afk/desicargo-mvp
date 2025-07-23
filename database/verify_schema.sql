-- Verify Schema - Check if all tables and columns exist

-- Check if goods_master table has the new enhanced columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'goods_master'
ORDER BY ordinal_position;

-- Check if new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('goods_categories', 'packaging_types', 'goods_documents', 'goods_aliases', 'goods_attributes')
ORDER BY table_name;

-- Check if pg_trgm extension is enabled
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';

-- Check if customers table exists and has the expected columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;