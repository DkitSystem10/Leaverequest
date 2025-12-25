/* 
  SQL Script to set up the 'attendance_in' table for manual entry.
  Run this in your Supabase SQL Editor.
*/

-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS attendance_in (
    id BIGSERIAL PRIMARY KEY
);

-- 2. Add columns with CamelCase quoted identifiers to match frontend
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'employeeId') THEN
    ALTER TABLE attendance_in ADD COLUMN "employeeId" TEXT;
  END IF; 
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'date') THEN
    ALTER TABLE attendance_in ADD COLUMN "date" DATE;
  END IF; 
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'inTime') THEN
    ALTER TABLE attendance_in ADD COLUMN "inTime" TEXT;
  END IF; 
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'outTime') THEN
    ALTER TABLE attendance_in ADD COLUMN "outTime" TEXT;
  END IF; 
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'status') THEN
    ALTER TABLE attendance_in ADD COLUMN "status" TEXT;
  END IF; 
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_in' AND column_name = 'workingHours') THEN
    ALTER TABLE attendance_in ADD COLUMN "workingHours" NUMERIC DEFAULT 0;
  END IF; 
END $$;

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

-- 3. Add Unique Constraint
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
