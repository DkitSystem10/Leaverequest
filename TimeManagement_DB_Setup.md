# Time Management (Attendance) Database Setup

To connect the Time Management system to your database, you need to create the table in Supabase. 

**IMPORTANT**: When running the script below, copy **only** the code inside the block. Do not copy the heading above it.

### 1. SQL Script for Supabase
Open your Supabase **SQL Editor** and run the following command to create the `attendance_in` table:

```sql
-- 1. Create Attendance table
CREATE TABLE IF NOT EXISTS attendance_in (
    id BIGSERIAL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    date DATE NOT NULL,
    "inTime" TEXT,
    "outTime" TEXT,
    status TEXT,
    "workingHours" NUMERIC DEFAULT 0,
    "lateMinutes" NUMERIC DEFAULT 0,
    "permissionMinutes" NUMERIC DEFAULT 0,
    "extraMinutes" NUMERIC DEFAULT 0,
    "isLate" BOOLEAN DEFAULT FALSE,
    "isPermission" BOOLEAN DEFAULT FALSE,
    "isExtra" BOOLEAN DEFAULT FALSE,
    "isFullPresent" BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one record exists per employee per day
    UNIQUE("employeeId", date)
);

-- Enable RLS (Optional, recommended to disable if not using Supabase Auth)
ALTER TABLE attendance_in DISABLE ROW LEVEL SECURITY;

-- OR if you want to keep RLS enabled but allow everyone:
-- CREATE POLICY "Allow all actions for everyone" ON attendance_in FOR ALL TO public USING (true) WITH CHECK (true);
```

### 2. Configuration Details
- **Table Name**: `attendance_in` (Do not change this, as the `dataService.js` expects this specific name).
- **Column Names**: Note that names like `"employeeId"` and `"inTime"` use double quotes in SQL to preserve Case Sensitivity required by the frontend code.
- **Primary Key**: Automatically handled via `id` (BIGSERIAL).
- **Unique Constraint**: Prevents duplicate entries by ensuring an employee can only have one attendance record per day.

### 3. Verification
Once you run the SQL script:
1. Go to **Table Editor** in Supabase and verify the `attendance_in` table exists.
2. In the application, go to **Time Management**, enter a time, and click **Save All Changes**.
3. Check the Supabase table to see the data appearing in real-time.

---
**Note**: If you already have data in `localStorage`, the system will automatically try to save to the database first once the table is detected.
