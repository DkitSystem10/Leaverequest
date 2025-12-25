/* 
  SQL Script to ALTER existing 'attendance' table to match application requirements.
  Run this in your Supabase SQL Editor.
*/

-- 1. First, create the table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS attendance_in (
    id BIGSERIAL PRIMARY KEY
);

-- 2. Add or Alter columns to match the application's camelCase expectations
-- We use quoted identifiers ("employeeId") to force camelCase and strictly match the frontend code.

-- Employee ID
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'employeeId') THEN
    ALTER TABLE attendance_in ADD COLUMN "employeeId" TEXT;
  END IF; 
END $$;

-- Date
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'date') THEN
    ALTER TABLE attendance_in ADD COLUMN "date" DATE;
  END IF; 
END $$;

-- Check In Time
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'inTime') THEN
    ALTER TABLE attendance_in ADD COLUMN "inTime" TEXT;
  END IF; 
END $$;

-- Check Out Time
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'outTime') THEN
    ALTER TABLE attendance_in ADD COLUMN "outTime" TEXT;
  END IF; 
END $$;

-- Status
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'status') THEN
    ALTER TABLE attendance_in ADD COLUMN "status" TEXT;
  END IF; 
END $$;

-- Working Hours
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'workingHours') THEN
    ALTER TABLE attendance_in ADD COLUMN "workingHours" NUMERIC DEFAULT 0;
  END IF; 
END $$;

-- Metrics Flags
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'isLate') THEN
    ALTER TABLE attendance_in ADD COLUMN "isLate" BOOLEAN DEFAULT FALSE;
  END IF; 
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'isPermission') THEN
    ALTER TABLE attendance_in ADD COLUMN "isPermission" BOOLEAN DEFAULT FALSE;
  END IF; 
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'isExtra') THEN
    ALTER TABLE attendance_in ADD COLUMN "isExtra" BOOLEAN DEFAULT FALSE;
  END IF; 
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'isFullPresent') THEN
    ALTER TABLE attendance_in ADD COLUMN "isFullPresent" BOOLEAN DEFAULT FALSE;
  END IF; 
END $$;

-- 3. Add Unique Constraint to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_in_employeeId_date_key'
  ) THEN
    ALTER TABLE attendance_in ADD CONSTRAINT "attendance_in_employeeId_date_key" UNIQUE ("employeeId", "date");
  END IF;
END $$;

-- 4. Disable RLS (since we use custom auth)
ALTER TABLE attendance_in DISABLE ROW LEVEL SECURITY;
