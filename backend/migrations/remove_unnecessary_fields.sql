-- Migration to remove unnecessary fields from tasks table
-- This migration removes description, assignee, and estimated_hours columns
-- as requested to simplify the task creation interface

-- Remove description column (functionality merged into content field)
ALTER TABLE tasks DROP COLUMN description;

-- Remove assignee column (not needed, using is_ai_task flag instead)
ALTER TABLE tasks DROP COLUMN assignee;

-- Remove estimated_hours column (not needed for simplified interface)
ALTER TABLE tasks DROP COLUMN estimated_hours;
