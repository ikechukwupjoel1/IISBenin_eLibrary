-- Phase 1: Multi-Tenancy Foundation
-- This script creates the central 'institutions' table.
-- This table will hold a record for each tenant (e.g., school, library)
-- and store their specific configurations like feature flags and UI themes.

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    
    -- Configuration for per-institution features
    feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Configuration for UI customization (colors, logos, etc.)
    theme_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE institutions IS 'Manages the tenants (institutions) for the multi-tenant architecture.';
COMMENT ON COLUMN institutions.feature_flags IS 'Enable/disable features for a specific institution.';
COMMENT ON COLUMN institutions.theme_settings IS 'UI customization settings like colors and logos.';