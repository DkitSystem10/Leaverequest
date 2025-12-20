-- Database Dump for Leave Request System
-- Generated based on src/utils/dataService.js

-- --------------------------------------------------------
-- Table structure for table `departments`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    head_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Data for table `departments`
-- --------------------------------------------------------

INSERT INTO departments (id, name, description, head_id) VALUES
('DEPT001', 'Technology', 'IT and Engineering department', 'MGR002'),
('DEPT002', 'Education', 'Training and Education department', 'MGR002'),
('DEPT003', 'Finance', 'Finance and Accounts', 'MGR002'),
('DEPT004', 'Associates', 'General Associates', 'MGR002'),
('DEPT005', 'Intern', 'Internship Program', 'MGR002'),
('DEPT006', 'HR', 'Human Resources', 'HR001'),
('DEPT007', 'Sales', 'Sales and Marketing', 'MGR002'),
('DEPT008', 'Marketing', 'Marketing and Branding', 'MGR002'),
('DEPT009', 'Admin', 'Administration', 'ADMIN001'),
('DEPT010', 'Manager', 'Management', 'ADMIN001');

-- --------------------------------------------------------
-- Table structure for table `employees`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    role VARCHAR(50) NOT NULL,
    designation VARCHAR(100),
    manager_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Data for table `employees`
-- --------------------------------------------------------

INSERT INTO employees (id, name, email, password, department, role, designation, manager_id, status, phone) VALUES
('DM3011', 'Rahmath', 'rahmath@durkkas.com', 'rrr123', 'Marketing', 'employee', 'Digital marketing', 'MGR002', 'active', '+91 98765 43210'),
('DM001', 'AArthi', 'aarthi@durkkas.com', 'arthi123', 'Marketing', 'employee', 'DigitalMarketing', 'MGR002', 'active', '+91 98765 43211'),
('DI3001', 'Jayakumar', 'jayakumar@durkkas.com', 'jay123', 'Technology', 'employee', 'Developer', 'MGR002', 'active', '+91 98765 43212'),
('DI3004', 'Mani', 'mani@durkkas.com', 'mani123', 'Technology', 'employee', 'Developer', 'MGR002', 'active', '+91 98765 43213'),
('DI3005', 'Bharathi', 'bharathi@durkkas.com', 'Bharathi123', 'Technology', 'employee', 'Developer', 'MGR002', 'active', '+91 98765 43214'),
('DI301', 'jay', 'jay@durkkas.com', 'jay@123', 'Engineering', 'employee', 'developer', 'MGR002', 'active', '+91 98765 43215'),
('EMP002', 'Jane Smith', 'jane@durkkas.com', 'jane123', 'Engineering', 'employee', 'Senior Software Engineer', 'MGR002', 'active', '+91 98765 43216'),
('EMP004', 'Alice Williams', 'alice@durkkas.com', 'alice123', 'Sales', 'employee', 'Sales Representative', 'MGR002', 'active', '+91 98765 43217'),
('EMP003', 'Bob Johnson', 'bob@durkkas.com', 'bob123', 'Marketing', 'employee', 'Marketing Executive', 'MGR002', 'active', '+91 98765 43218'),
('MGR002', 'Manager', 'manager@durkkas.com', 'manager123', 'Associates', 'manager', 'Manager', 'HR001', 'active', '+91 98765 43219'),
('HR001', 'HR Person', 'hr@durkkas.com', 'hr123', 'HR', 'hr', 'HR Manager', 'ADMIN001', 'active', '+91 98765 43220'),
('ADMIN001', 'Super Admin', 'admin@durkkas.com', 'admin123', 'Admin', 'superadmin', 'System Administrator', NULL, 'active', '+91 98765 43221');

-- --------------------------------------------------------
-- Table structure for table `holidays`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days INTEGER DEFAULT 1,
    type VARCHAR(20) DEFAULT 'Public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Data for table `holidays`
-- --------------------------------------------------------

INSERT INTO holidays (name, from_date, to_date, days, type) VALUES
('New Year', '2025-01-01', '2025-01-01', 1, 'Public');

-- --------------------------------------------------------
-- Table structure for table `tn_govt_holidays` (Reference)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS tn_govt_holidays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    name VARCHAR(100) NOT NULL,
    day VARCHAR(20)
);

-- --------------------------------------------------------
-- Data for table `tn_govt_holidays`
-- --------------------------------------------------------

INSERT INTO tn_govt_holidays (date, name, day) VALUES
('2025-01-01', 'New Year''s Day', 'Wednesday'),
('2025-01-14', 'Pongal', 'Tuesday'),
('2025-01-15', 'Thiruvalluvar Day', 'Wednesday'),
('2025-01-16', 'Uzhavar Thirunal', 'Thursday'),
('2025-01-26', 'Republic Day', 'Sunday'),
('2025-12-25', 'Christmas', 'Thursday');

-- --------------------------------------------------------
-- Table structure for table `requests`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id),
    employee_name VARCHAR(100),
    department VARCHAR(50),
    role VARCHAR(50),
    type VARCHAR(20) NOT NULL, -- 'leave', 'halfday', 'permission', 'od'
    leave_mode VARCHAR(20), -- 'paid', 'unpaid', etc.
    no_of_days NUMERIC(3,1),
    start_date DATE,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    alternative_employee_id VARCHAR(50),
    alternative_employee_name VARCHAR(100),
    half_day_session VARCHAR(20), -- 'Morning', 'Afternoon'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
    current_approver VARCHAR(20), -- 'manager', 'hr', 'superadmin'
    first_approver JSONB,
    manager_approval JSONB,
    hr_approval JSONB,
    super_admin_approval JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table structure for table `announcements`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    for_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- End of Dump
-- --------------------------------------------------------
