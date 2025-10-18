-- Migration: add_status_to_scenarios
-- Created: 2025-01-27T00:00:00.000Z
-- Description: Add status field to scenarios table for admin management

-- Add status column to scenarios table
ALTER TABLE scenarios ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'public', 'archived'));

-- Add index for status filtering
CREATE INDEX idx_scenarios_status ON scenarios(status);
