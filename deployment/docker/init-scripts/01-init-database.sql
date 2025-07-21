-- Database initialization script for GeoQuiz
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (handled by POSTGRES_DB environment variable)
-- Create user if it doesn't exist (handled by POSTGRES_USER environment variable)

-- Set timezone to UTC
SET timezone = 'UTC';

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE geoquiz TO geoquiz_user;

-- Create schema for application tables (if needed)
-- The Entity Framework migrations will handle table creation