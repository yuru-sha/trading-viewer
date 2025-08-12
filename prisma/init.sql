-- Initial database setup for TradingViewer
-- This file runs when the PostgreSQL container is first created

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create database if not exists (handled by Docker environment variables)
-- Just set up initial configuration

-- Set timezone
SET timezone = 'UTC';

-- Performance tuning for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Create indexes for better query performance (after migrations run)
-- These will be created by Prisma migrations, but we define them here for reference
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_symbols_symbol ON "Symbol"(symbol);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candles_symbol_timestamp ON "Candle"(symbol_id, timestamp);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_symbol_timestamp ON "Quote"(symbol_id, timestamp);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_prefs_user ON "UserPreferences"(user_id);

-- Grant permissions (if needed for specific users)
-- GRANT ALL PRIVILEGES ON DATABASE tradingviewer TO tradingviewer;

-- Reload configuration
SELECT pg_reload_conf();