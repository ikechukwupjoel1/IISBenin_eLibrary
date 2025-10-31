-- Adds an 'is_active' flag to the institutions table for the suspend feature.
-- All existing institutions will default to TRUE (active).

ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
