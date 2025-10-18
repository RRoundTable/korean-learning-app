-- Migration: update_existing_scenarios_status
-- Created: 2025-01-27T00:00:00.000Z
-- Description: Update existing scenarios to have 'draft' status if NULL

-- Update existing scenarios that have NULL status to 'draft'
UPDATE scenarios SET status = 'draft' WHERE status IS NULL;
