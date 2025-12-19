-- Migration script to add 'od' (On Duty) to the request types
-- and ensure the check constraint reflects the new options.

-- 1. Update the 'type' check constraint on 'requests' table
-- We need to drop the old constraint and add a new one that includes 'od'
DO $$ 
BEGIN
    -- Drop the existing constraint if it matches the name in supabase-schema.sql
    -- Note: Supabase might generate a different constraint name if not explicitly named,
    -- but usually it follows table_column_check or we can find it.
    ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_type_check;
    
    -- Add the updated constraint
    ALTER TABLE public.requests ADD CONSTRAINT requests_type_check CHECK (type IN ('leave', 'permission', 'halfday', 'od'));
END $$;

-- 2. Add 'od' to the status overview or any other relevant reference tables if they exist
-- (Based on supabase-schema.sql, 'type' is just a VARCHAR with a CHECK constraint)

-- 3. Explanation of OD approval sequence (implemented in application logic):
-- Employee requests OD -> approved by Manager
-- Manager requests OD -> approved by HR
-- HR requests OD -> approved by Super Admin
-- Bypass logic: If Manager is on leave or OD, request goes to HR. If HR is on leave or OD, request goes to Super Admin.
