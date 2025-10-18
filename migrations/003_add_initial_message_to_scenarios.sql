-- Migration: add_initial_message_to_scenarios
-- Created: 2025-10-18T01:58:58.446Z
-- Description: Add initial_message fields to scenarios table

-- Add initial_message_text and initial_message_translation columns to scenarios table
ALTER TABLE scenarios ADD COLUMN initial_message_text TEXT;
ALTER TABLE scenarios ADD COLUMN initial_message_translation TEXT;
