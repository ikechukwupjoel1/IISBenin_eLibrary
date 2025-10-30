-- Add a flag to the institutions table to track the completion of the initial setup.

ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS is_setup_complete BOOLEAN NOT NULL DEFAULT FALSE;
