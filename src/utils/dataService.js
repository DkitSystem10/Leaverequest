// Data service with Supabase integration
import { supabase } from './supabaseClient';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.REACT_APP_SUPABASE_URL;
  return url &&
    url !== 'your_supabase_project_url' &&
    !url.includes('placeholder');
};

// Sample employees data (can be moved to Supabase later)
const employees = [
  { id: 'DM3011', name: 'Rahmath', email: 'rahmath@durkkas.com', password: 'rrr123', department: 'Marketing', role: 'employee', designation: 'Digital marketing', managerId: 'MGR002', status: 'active', phone: '+91 98765 43210' },
  { id: 'DM001', name: 'AArthi', email: 'aarthi@durkkas.com', password: 'arthi123', department: 'Marketing', role: 'employee', designation: 'DigitalMarketing', managerId: 'MGR002', status: 'active', phone: '+91 98765 43211' },
  { id: 'DI3001', name: 'Jayakumar', email: 'jayakumar@durkkas.com', password: 'jay123', department: 'Technology', role: 'employee', designation: 'Developer', managerId: 'MGR002', status: 'active', phone: '+91 98765 43212' },
  { id: 'DI3004', name: 'Mani', email: 'mani@durkkas.com', password: 'mani123', department: 'Technology', role: 'employee', designation: 'Developer', managerId: 'MGR002', status: 'active', phone: '+91 98765 43213' },
  { id: 'DI3005', name: 'Bharathi', email: 'bharathi@durkkas.com', password: 'Bharathi123', department: 'Technology', role: 'employee', designation: 'Developer', managerId: 'MGR002', status: 'active', phone: '+91 98765 43214' },
  { id: 'DI301', name: 'jay', email: 'jay@durkkas.com', password: 'jay@123', department: 'Engineering', role: 'employee', designation: 'developer', managerId: 'MGR002', status: 'active', phone: '+91 98765 43215' },
  { id: 'EMP002', name: 'Jane Smith', email: 'jane@durkkas.com', password: 'jane123', department: 'Engineering', role: 'employee', designation: 'Senior Software Engineer', managerId: 'MGR002', status: 'active', phone: '+91 98765 43216' },
  { id: 'EMP004', name: 'Alice Williams', email: 'alice@durkkas.com', password: 'alice123', department: 'Sales', role: 'employee', designation: 'Sales Representative', managerId: 'MGR002', status: 'active', phone: '+91 98765 43217' },
  { id: 'EMP003', name: 'Bob Johnson', email: 'bob@durkkas.com', password: 'bob123', department: 'Marketing', role: 'employee', designation: 'Marketing Executive', managerId: 'MGR002', status: 'active', phone: '+91 98765 43218' },
  { id: 'MGR002', name: 'Manager', email: 'manager@durkkas.com', password: 'manager123', department: 'Associates', role: 'manager', designation: 'Manager', managerId: 'HR001', status: 'active', phone: '+91 98765 43219' },
  { id: 'HR001', name: 'HR Person', email: 'hr@durkkas.com', password: 'hr123', department: 'HR', role: 'hr', designation: 'HR Manager', managerId: 'ADMIN001', status: 'active', phone: '+91 98765 43220' },
  { id: 'ADMIN001', name: 'Super Admin', email: 'admin@durkkas.com', password: 'admin123', department: 'Admin', role: 'superadmin', designation: 'System Administrator', managerId: null, status: 'active', phone: '+91 98765 43221' },
];

// Shared Holidays Data
let holidays = [
  { id: 1, name: 'New Year', fromDate: '2025-01-01', toDate: '2025-01-01', days: 1, type: 'Public' }
];

// Mock Tamil Nadu Government Holidays (Reference Data)
const tnGovtHolidays = [
  { date: '2025-01-01', name: 'New Year\'s Day', day: 'Wednesday' },
  { date: '2025-01-14', name: 'Pongal', day: 'Tuesday' },
  { date: '2025-01-15', name: 'Thiruvalluvar Day', day: 'Wednesday' },
  { date: '2025-01-16', name: 'Uzhavar Thirunal', day: 'Thursday' },
  { date: '2025-01-26', name: 'Republic Day', day: 'Sunday' },
  { date: '2025-12-25', name: 'Christmas', day: 'Thursday' },
];

// Sample departments data
const departments = [
  { id: 'DEPT001', name: 'Technology', description: 'IT and Engineering department', head: 'MGR002' },
  { id: 'DEPT002', name: 'Education', description: 'Training and Education department', head: 'MGR002' },
  { id: 'DEPT003', name: 'Finance', description: 'Finance and Accounts', head: 'MGR002' },
  { id: 'DEPT004', name: 'Associates', description: 'General Associates', head: 'MGR002' },
  { id: 'DEPT005', name: 'Intern', description: 'Internship Program', head: 'MGR002' },
  { id: 'DEPT006', name: 'HR', description: 'Human Resources', head: 'HR001' },
  { id: 'DEPT007', name: 'Sales', description: 'Sales and Marketing', head: 'MGR002' },
  { id: 'DEPT008', name: 'Marketing', description: 'Marketing and Branding', head: 'MGR002' },
  { id: 'DEPT009', name: 'Admin', description: 'Administration', head: 'ADMIN001' },
  { id: 'DEPT010', name: 'Manager', description: 'Management', head: 'ADMIN001' }
];

export const dataService = {
  // Employee methods
  getEmployeeByCode: async (code) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', code)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching employee:', error);
        // Fallback to local data
        return employees.find(emp => emp.id === code);
      }

      return data || employees.find(emp => emp.id === code);
    } catch (error) {
      console.error('Error in getEmployeeByCode:', error);
      return employees.find(emp => emp.id === code);
    }
  },


  // Authenticate by Employee Code, Department, and Password
  authenticateEmployeeByCode: async (empCode, department, password) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', empCode)
        .eq('department', department)
        .eq('password', password)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error authenticating:', error);
        const employee = employees.find(emp =>
          emp.id === empCode &&
          emp.department === department &&
          emp.password === password
        );
        if (employee && (employee.status === 'Deactive' || employee.status === 'Deactivated')) return null;
        return employee || null;
      }

      if (data) {
        if (data.status === 'Deactive' || data.status === 'deactive' || data.status === 'deactivated' || data.status === 'Deactivated') {
          throw new Error('Your account has been deactivated.');
        }
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password,
          department: data.department,
          role: data.role,
          designation: data.designation,
          managerId: data.manager_id,
          status: data.status,
          phone: data.phone
        };
      }

      const employee = employees.find(emp =>
        emp.id === empCode &&
        emp.department === department &&
        emp.password === password
      );
      if (employee && employee.status === 'Deactive') {
        throw new Error('Your account has been deactivated.');
      }
      return employee || null;
    } catch (error) {
      if (error.message.includes('deactivated')) throw error;
      console.error('Error in authenticateEmployeeByCode:', error);
      const employee = employees.find(emp =>
        emp.id === empCode &&
        emp.department === department &&
        emp.password === password
      );
      if (employee && employee.status === 'Deactive') return null;
      return employee || null;
    }
  },

  getAllEmployees: () => {
    // Return local employees array (synchronous for backward compatibility)
    return employees;
  },

  getActiveEmployees: () => {
    return employees.filter(emp => emp.status === 'active' || emp.status === 'Active' || !emp.status);
  },

  // Fetch all employees from database (async)
  fetchAllEmployeesFromDB: async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching employees:', error);
        return employees;
      }

      // Merge with local data if Supabase returns data
      if (data && data.length > 0) {
        const dbEmployees = data.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          password: emp.password,
          department: emp.department,
          role: emp.role,
          designation: emp.designation,
          managerId: emp.manager_id,
          status: emp.status,
          phone: emp.phone
        }));

        // Update local employees array with DB data
        employees.length = 0;
        employees.push(...dbEmployees);

        return dbEmployees;
      }

      return employees;
    } catch (error) {
      console.error('Error in fetchAllEmployeesFromDB:', error);
      return employees;
    }
  },

  getEmployeesByDepartment: (department) => {
    return employees.filter(emp => emp.department === department);
  },

  // Department methods
  getAllDepartments: async () => {
    try {
      if (!isSupabaseConfigured()) {
        return departments;
      }

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error && error.code !== 'PGRST116') { // Ignore if table doesn't exist
        console.warn('Error fetching departments from DB, using local:', error);
        return departments;
      }

      if (data && data.length > 0) {
        // Sync local departments
        const dbDepts = data.map(d => ({
          id: d.id,
          name: d.name,
          description: d.description,
          head: d.head_id
        }));

        // Merge without duplicates based on ID
        const newDepts = dbDepts.filter(nd => !departments.some(ld => ld.id === nd.id));
        departments.push(...newDepts);

        return dbDepts;
      }

      return departments;
    } catch (error) {
      console.error('Error in getAllDepartments:', error);
      return departments;
    }
  },

  createDepartment: async (deptData) => {
    try {
      // Check local duplicate
      if (departments.some(d => d.name.toLowerCase() === deptData.name.toLowerCase())) {
        throw new Error(`Department "${deptData.name}" already exists.`);
      }

      // Supabase insert
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('departments')
          .insert([{
            id: deptData.id,
            name: deptData.name,
            description: deptData.description,
            head_id: deptData.head || null,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) {
          // If table doesn't exist, we just continue to local (dev mode)
          if (error.code === '42P01') {
            console.warn('Departments table missing, saving locally only');
          } else {
            console.error('Error creating department in DB:', error);
            throw error;
          }
        }
      }

      // Add to local
      departments.push(deptData);
      return { success: true, data: deptData };
    } catch (error) {
      console.error('Error in createDepartment:', error);
      throw error;
    }
  },

  // Create new employee
  createEmployee: async (employeeData) => {
    try {
      // Check if employee ID already exists in local array
      const localExisting = employees.find(emp => emp.id === employeeData.id || emp.email === employeeData.email);
      if (localExisting) {
        throw new Error(localExisting.id === employeeData.id
          ? `Employee ID "${employeeData.id}" already exists. Please use a different ID.`
          : `Email "${employeeData.email}" already exists. Please use a different email.`);
      }

      // Check if employee ID already exists in database
      const existingEmployee = await supabase
        .from('employees')
        .select('id')
        .eq('id', employeeData.id)
        .single();

      if (existingEmployee.data) {
        throw new Error(`Employee ID "${employeeData.id}" already exists. Please use a different ID.`);
      }

      // Check if email already exists in database
      const existingEmail = await supabase
        .from('employees')
        .select('email')
        .eq('email', employeeData.email)
        .single();

      if (existingEmail.data) {
        throw new Error(`Email "${employeeData.email}" already exists. Please use a different email.`);
      }

      // Insert new employee
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          id: employeeData.id,
          name: employeeData.name,
          email: employeeData.email,
          password: employeeData.password,
          department: employeeData.department,
          role: employeeData.role,
          designation: employeeData.designation || null,
          manager_id: employeeData.managerId || null,
          phone: employeeData.phone || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating employee:', error);
        throw new Error(error.message || 'Failed to create employee. Please try again.');
      }

      // Add to local employees array
      const newEmployee = {
        id: data.id,
        name: data.name,
        email: data.email,
        password: data.password,
        department: data.department,
        role: data.role,
        designation: data.designation,
        managerId: data.manager_id,
        phone: data.phone
      };
      employees.push(newEmployee);

      return {
        success: true,
        data: {
          id: newEmployee.id,
          name: newEmployee.name,
          email: newEmployee.email,
          department: newEmployee.department,
          role: newEmployee.role,
          designation: newEmployee.designation,
          managerId: newEmployee.managerId,
          phone: newEmployee.phone
        }
      };
    } catch (error) {
      console.error('Error in createEmployee:', error);
      throw error;
    }
  },

  // Update existing employee
  updateEmployee: async (employeeData) => {
    try {
      // Check if employee exists in local array
      const existingIndex = employees.findIndex(emp => emp.id === employeeData.id);
      if (existingIndex === -1) {
        throw new Error(`Employee ID "${employeeData.id}" not found.`);
      }

      // If email is being changed, check if new email already exists
      if (employeeData.email !== employees[existingIndex].email) {
        const emailExists = employees.find(emp => emp.email === employeeData.email && emp.id !== employeeData.id);
        if (emailExists) {
          throw new Error(`Email "${employeeData.email}" is already in use by another employee.`);
        }

        // Check in database too
        const { data: existingEmail } = await supabase
          .from('employees')
          .select('id')
          .eq('email', employeeData.email)
          .neq('id', employeeData.id)
          .single();

        if (existingEmail) {
          throw new Error(`Email "${employeeData.email}" is already in use by another employee.`);
        }
      }

      // Prepare update data
      const updateData = {
        name: employeeData.name,
        email: employeeData.email,
        department: employeeData.department,
        role: employeeData.role,
        designation: employeeData.designation || null,
        manager_id: employeeData.managerId || null,
        phone: employeeData.phone,
        updated_at: new Date().toISOString()
      };

      // Only update password if provided
      if (employeeData.password && employeeData.password.trim() !== '') {
        updateData.password = employeeData.password;
      }

      // Update in database
      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', employeeData.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating employee:', error);
        throw new Error(error.message || 'Failed to update employee. Please try again.');
      }

      // Update local employees array
      employees[existingIndex] = {
        ...employees[existingIndex],
        name: data.name,
        email: data.email,
        department: data.department,
        role: data.role,
        designation: data.designation,
        designation: data.designation,
        managerId: data.manager_id,
        phone: data.phone,
        ...(employeeData.password && employeeData.password.trim() !== '' ? { password: employeeData.password } : {})
      };

      return {
        success: true,
        data: {
          id: employees[existingIndex].id,
          name: employees[existingIndex].name,
          email: employees[existingIndex].email,
          department: employees[existingIndex].department,
          role: employees[existingIndex].role,
          designation: employees[existingIndex].designation,
          managerId: employees[existingIndex].managerId,
          phone: employees[existingIndex].phone
        }
      };
    } catch (error) {
      console.error('Error in updateEmployee:', error);
      throw error;
    }
  },

  // Deactivate employee (Soft Delete)
  deactivateEmployee: async (employeeId) => {
    try {
      // Update local array
      const emp = employees.find(emp => emp.id === employeeId);
      if (emp) {
        emp.status = 'Deactivated';
      }

      // Update database
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('employees')
          .update({ status: 'Deactivated' })
          .eq('id', employeeId);

        if (error) {
          // If column doesn't exist or other error, try to add column or log warning
          console.warn('Error deactivating employee in DB (check if status column exists):', error);
          // Don't throw if just a column issue in dev, rely on local for now
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deactivateEmployee:', error);
      throw error;
    }
  },

  // Rejoin employee (Reactivate)
  rejoinEmployee: async (employeeId) => {
    try {
      // Update local array
      const emp = employees.find(emp => emp.id === employeeId);
      if (emp) {
        emp.status = 'Rejoined';
      }

      // Update database
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('employees')
          .update({ status: 'Rejoined' })
          .eq('id', employeeId);

        if (error) {
          console.warn('Error rejoining employee in DB:', error);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in rejoinEmployee:', error);
      throw error;
    }
  },

  // --- Holiday Management ---
  // Fetch holidays from DB (or local fallback)
  fetchHolidays: async () => {
    try {
      if (!isSupabaseConfigured()) {
        const stored = localStorage.getItem('company_holidays');
        if (stored) {
          const localHolidays = JSON.parse(stored);
          // Merge with default if needed, or just return local
          // Ensure we have unique IDs
          const allHolidays = [...holidays, ...localHolidays.filter(lh => !holidays.some(h => h.id === lh.id))];
          // Remove duplicates based on ID
          return Array.from(new Map(allHolidays.map(item => [item.id, item])).values());
        }
        return [...holidays];
      }

      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('from_date', { ascending: true });

      if (error) {
        if (error.code !== 'PGRST116' && error.code !== '42P01') { // Ignore missing table errors
          console.error('Error fetching holidays:', error);
        }
        // Fallback to local storage/memory
        const stored = localStorage.getItem('company_holidays');
        return stored ? JSON.parse(stored) : [...holidays];
      }

      // Normalize DB data
      return data.map(h => ({
        id: h.id,
        name: h.name,
        fromDate: h.from_date,
        toDate: h.to_date,
        days: h.days,
        type: h.type
      }));
    } catch (error) {
      console.error('Error in fetchHolidays:', error);
      return [...holidays];
    }
  },

  // Add new holiday to DB
  createHoliday: async (holidayData) => {
    try {
      const newHoliday = {
        ...holidayData,
        id: Date.now(), // Temporary ID for local use
      };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('holidays')
          .insert([{
            name: holidayData.name,
            from_date: holidayData.fromDate,
            to_date: holidayData.toDate,
            days: holidayData.days,
            type: holidayData.type,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) {
          console.error('Error creating holiday in DB:', error);
          // Fallback to local storage
          const current = JSON.parse(localStorage.getItem('company_holidays') || '[]');
          current.push(newHoliday);
          localStorage.setItem('company_holidays', JSON.stringify(current));
          holidays.push(newHoliday); // Update memory

          if (error.code === '42P01') {
            console.warn('Holidays table missing. Saved to local storage.');
            return { success: true, data: newHoliday, warning: 'Saved locally (DB table missing)' };
          }
          throw error;
        }

        const createdHoliday = {
          id: data.id,
          name: data.name,
          fromDate: data.from_date,
          toDate: data.to_date,
          days: data.days,
          type: data.type
        };

        // Automatically create an announcement for this holiday date
        // so that all dashboards (employee, manager, HR, super admin)
        // can highlight the holiday without any extra manual step.
        try {
          const message = `Tomorrow (${createdHoliday.name}) is a holiday. Enjoy your leave!`;
          // Use direct Supabase call instead of recursive call to avoid issues
          if (isSupabaseConfigured()) {
            const announcement = {
              message,
              for_date: createdHoliday.fromDate,
              created_at: new Date().toISOString(),
              is_active: true
            };
            await supabase.from('announcements').insert([announcement]);
          }
        } catch (announceError) {
          console.error('Error creating holiday announcement (non-blocking):', announceError);
        }

        return {
          success: true,
          data: createdHoliday
        };
      }

      // Local Storage only
      const current = JSON.parse(localStorage.getItem('company_holidays') || '[]');
      current.push(newHoliday);
      localStorage.setItem('company_holidays', JSON.stringify(current));
      holidays.push(newHoliday); // Update memory

      // Also create a local announcement for this holiday so that
      // all dashboards see the banner even without Supabase.
      try {
        const message = `Tomorrow (${newHoliday.name}) is a holiday. Enjoy your leave!`;
        // Create local announcement directly
        const localAnnouncement = {
          id: Date.now(),
          message,
          for_date: newHoliday.fromDate,
          created_at: new Date().toISOString(),
          is_active: true
        };
        const current = JSON.parse(localStorage.getItem('announcements') || '[]');
        current.push(localAnnouncement);
        localStorage.setItem('announcements', JSON.stringify(current));
      } catch (announceError) {
        console.error('Error creating local holiday announcement (non-blocking):', announceError);
      }

      return { success: true, data: newHoliday };
    } catch (error) {
      console.error('Error in createHoliday:', error);
      throw error;
    }
  },

  getHolidays: () => {
    // Deprecated synchronous accessor, try to get from local storage if available
    const stored = localStorage.getItem('company_holidays');
    if (stored) {
      return JSON.parse(stored);
    }
    return [...holidays];
  },

  addHoliday: (holiday) => {
    // Deprecated sync method - forward to createHoliday but it won't be async
    // This is just for backward compatibility if we missed any call sites
    const newHoliday = { ...holiday, id: Date.now() };
    holidays.push(newHoliday);

    // Also update local storage
    const current = JSON.parse(localStorage.getItem('company_holidays') || '[]');
    current.push(newHoliday);
    localStorage.setItem('company_holidays', JSON.stringify(current));

    return newHoliday;
  },

  getTNHolidays: () => {
    return tnGovtHolidays;
  },

  // Check if employee is on leave
  isEmployeeOnLeave: async (employeeId, checkDate = new Date()) => {
    try {
      const today = new Date(checkDate);
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .eq('type', 'leave')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr);

      if (error) {
        console.error('Error checking employee leave:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error in isEmployeeOnLeave:', error);
      return false;
    }
  },

  // Helper to create notification
  createNotification: (userId, message, type, requestId) => {
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notification = {
        id: notifId,
        userId,
        message,
        type,
        requestId,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Store in localStorage for now (simulating backend notification service)
      const key = `notifications_${userId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([notification, ...existing]));
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  },

  // Get notifications for a user
  getNotifications: (userId) => {
    try {
      const key = `notifications_${userId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  // Mark notification as read
  markNotificationAsRead: (userId, notificationId) => {
    try {
      const key = `notifications_${userId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = existing.map(n => n.id === notificationId ? { ...n, read: true } : n);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  // Request methods
  createRequest: async (requestData) => {
    try {
      // Generate a unique ID for the request
      const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Calculate number of days for leave requests (inclusive of start & end)
      let noOfDays = null;
      if (requestData.type === 'leave') {
        const start = new Date(requestData.startDate);
        const end = new Date(requestData.endDate || requestData.startDate);
        const diffMs = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
        noOfDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      }

      // Check for bypass conditions (Manager on leave, Requester is Manager/HR)
      let managerApproval = null;
      let hrApproval = null;
      let currentApprover = 'any';
      let employeeRole = 'employee'; // Default role

      try {
        if (requestData.employeeId && isSupabaseConfigured()) {
          const emp = await dataService.getEmployeeByCode(requestData.employeeId);

          // Store the employee's role
          if (emp && emp.role) {
            employeeRole = emp.role;
          }

          // CONDITION 0: If Requester IS HR, skip manager & HR approval, go to Super Admin
          if (emp && emp.role === 'hr') {
            console.log('Requester is HR, bypassing to Super Admin');
            managerApproval = {
              status: 'bypassed',
              reason: 'Requester is HR',
              approver_id: 'SYSTEM',
              approver_name: 'System',
              approved_at: new Date().toISOString()
            };
            hrApproval = {
              status: 'bypassed',
              reason: 'Requester is HR',
              approver_id: 'SYSTEM',
              approver_name: 'System',
              approved_at: new Date().toISOString()
            };
            currentApprover = 'superadmin';
          }
          // CONDITION 1: If Requester IS a Manager, skip manager approval
          else if (emp && emp.role === 'manager') {
            console.log('Requester is Manager, bypassing to HR');
            managerApproval = {
              status: 'bypassed',
              reason: 'Requester is Manager',
              approver_id: 'SYSTEM',
              approver_name: 'System',
              approved_at: new Date().toISOString()
            };
            currentApprover = 'hr';

            // Check if HR (Manager's manager) is on leave
            if (emp.managerId) {
              const startDate = requestData.startDate;
              const endDate = requestData.endDate || startDate;

              const { data: hrLeaves } = await supabase
                .from('requests')
                .select('id')
                .eq('employee_id', emp.managerId)
                .eq('status', 'approved')
                .in('type', ['leave', 'halfday', 'od'])
                .lte('start_date', endDate)
                .gte('end_date', startDate);

              if (hrLeaves && hrLeaves.length > 0) {
                console.log('HR is on leave, bypassing to Super Admin');
                hrApproval = {
                  status: 'bypassed',
                  reason: 'HR on Leave',
                  approver_id: 'SYSTEM',
                  approver_name: 'System',
                  approved_at: new Date().toISOString()
                };
                currentApprover = 'superadmin';
              }
            }
          }
          // CONDITION 2: If Requester is Employee, check if their Manager is on leave
          else if (emp && emp.managerId) {
            const startDate = requestData.startDate;
            const endDate = requestData.endDate || requestData.startDate;

            // Check if manager has approved leave/OD overlapping the request
            const { data: managerLeaves } = await supabase
              .from('requests')
              .select('id')
              .eq('employee_id', emp.managerId)
              .eq('status', 'approved')
              .in('type', ['leave', 'halfday', 'od']) // leave/halfday/OD prevents approval duties
              .lte('start_date', endDate)
              .gte('end_date', startDate);

            if (managerLeaves && managerLeaves.length > 0) {
              console.log('Manager is on leave, bypassing to HR');
              managerApproval = {
                status: 'bypassed',
                reason: 'Manager on Leave',
                approver_id: 'SYSTEM',
                approver_name: 'System',
                approved_at: new Date().toISOString()
              };
              currentApprover = 'hr';
            }
          }
        }
      } catch (err) {
        console.error("Error checking manager availability:", err);
      }

      const requestPayload = {
        id: requestId,
        employee_id: requestData.employeeId,
        employee_name: requestData.employeeName,
        department: requestData.department,
        role: employeeRole, // Add role to the request
        type: requestData.type,
        leave_mode: requestData.leaveMode || null,
        no_of_days: noOfDays,
        start_date: requestData.startDate,
        end_date: requestData.endDate || requestData.startDate,
        start_time: requestData.startTime || null,
        end_time: requestData.endTime || null,
        reason: requestData.reason,
        alternative_employee_id: requestData.alternativeEmployeeId,
        alternative_employee_name: requestData.alternativeEmployeeName,
        half_day_session: requestData.halfDaySession || null,
        status: 'pending',
        current_approver: currentApprover,
        first_approver: null,
        manager_approval: managerApproval,
        hr_approval: hrApproval,
        super_admin_approval: null,
        created_at: new Date().toISOString()
      };

      let { data, error } = await supabase
        .from('requests')
        .insert([requestPayload])
        .select()
        .single();

      // If error is about missing 'role' column, retry without it
      if (error && (error.message.includes("role") || error.message.includes("schema"))) {
        console.warn('Role column error. Retrying without role field and skipping select...');

        // Remove role field and retry
        const { role, ...payloadWithoutRole } = requestPayload;
        const retry = await supabase
          .from('requests')
          .insert([payloadWithoutRole]); // Removed .select() and .single()

        if (retry.error) {
          console.error('Retry failed:', retry.error);
          throw retry.error;
        }

        // Use payload data as we generated the ID ourselves
        data = payloadWithoutRole;
        error = null;
      }

      if (error) {
        console.error('Error creating request:', error);
        // Provide more detailed error message
        if (error.message && error.message.includes('not configured')) {
          throw new Error('Supabase is not configured. Please set up your .env file with Supabase credentials.');
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createRequest:', error);
      throw error;
    }
  },

  // --- Dashboard Statistics Methods ---

  // Get today's attendance statistics
  getTodayAttendanceStats: async () => {
    try {
      await dataService.fetchAllEmployeesFromDB();
      const allEmployees = dataService.getAllEmployees();
      const allRequests = await dataService.getAllRequests();

      const employees = Array.isArray(allEmployees) ? allEmployees : [];
      const requests = Array.isArray(allRequests) ? allRequests : [];

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Get today's requests (all types)
      const todayRequests = requests.filter(req => req.fromDate === todayStr || req.startDate === todayStr);

      // Get employees on leave today (approved leave/halfday requests)
      const employeesOnLeaveToday = new Set();
      todayRequests.forEach(req => {
        if (req.status === 'approved' && (req.type === 'leave' || req.type === 'halfday')) {
          employeesOnLeaveToday.add(req.employeeId || req.employee_id);
        }
      });

      // Get employees with approved permission today
      const employeesWithPermissionToday = new Set();
      todayRequests.forEach(req => {
        if (req.status === 'approved' && req.type === 'permission') {
          employeesWithPermissionToday.add(req.employeeId || req.employee_id);
        }
      });

      // Calculate statistics
      const activeUsers = employees.filter(emp => emp.status === 'Active' || emp.status === 'active').length;
      const presentUsers = Math.max(0, activeUsers - employeesOnLeaveToday.size - employeesWithPermissionToday.size);
      const absentUsers = employeesOnLeaveToday.size;
      const permissionUsers = employeesWithPermissionToday.size;

      return {
        activeUsers,
        presentUsers,
        absentUsers,
        permissionUsers,
        attendanceRate: activeUsers > 0 ? Math.round((presentUsers / activeUsers) * 100) : 0,
        date: todayStr
      };
    } catch (error) {
      console.error('Error in getTodayAttendanceStats:', error);
      return {
        activeUsers: 0,
        presentUsers: 0,
        absentUsers: 0,
        permissionUsers: 0,
        attendanceRate: 0,
        date: new Date().toISOString().split('T')[0]
      };
    }
  },

  // Get detailed attendance breakdown for today
  getTodayAttendanceDetails: async () => {
    try {
      const stats = await dataService.getTodayAttendanceStats();
      const allEmployees = dataService.getAllEmployees();
      const allRequests = await dataService.getAllRequests();

      const todayStr = new Date().toISOString().split('T')[0];
      const todayRequests = allRequests.filter(req => req.fromDate === todayStr || req.startDate === todayStr);

      // Categorize employees
      const presentEmployees = [];
      const absentEmployees = [];
      const permissionEmployees = [];

      allEmployees.forEach(emp => {
        if (emp.status !== 'Active' && emp.status !== 'active') return;

        const hasLeave = todayRequests.some(req =>
          req.status === 'approved' &&
          (req.type === 'leave' || req.type === 'halfday') &&
          (req.employeeId === emp.id || req.employee_id === emp.id)
        );

        const hasPermission = todayRequests.some(req =>
          req.status === 'approved' &&
          req.type === 'permission' &&
          (req.employeeId === emp.id || req.employee_id === emp.id)
        );

        if (hasLeave) {
          absentEmployees.push(emp);
        } else if (hasPermission) {
          permissionEmployees.push(emp);
        } else {
          presentEmployees.push(emp);
        }
      });

      return {
        presentEmployees,
        absentEmployees,
        permissionEmployees,
        ...stats
      };
    } catch (error) {
      console.error('Error in getTodayAttendanceDetails:', error);
      return {
        presentEmployees: [],
        absentEmployees: [],
        permissionEmployees: [],
        activeUsers: 0,
        presentUsers: 0,
        absentUsers: 0,
        permissionUsers: 0,
        attendanceRate: 0
      };
    }
  },

  // Helper function to normalize database response to camelCase
  normalizeRequest: (request) => {
    if (!request) return null;
    return {
      ...request,
      // Map snake_case to camelCase for compatibility
      employeeId: request.employee_id || request.employeeId,
      employeeName: request.employee_name || request.employeeName,
      leaveMode: request.leave_mode || request.leaveMode,
      noOfDays: request.no_of_days || request.noOfDays,
      startDate: request.start_date || request.startDate,
      endDate: request.end_date || request.endDate,
      startTime: request.start_time || request.startTime,
      endTime: request.end_time || request.endTime,
      alternativeEmployeeId: request.alternative_employee_id || request.alternativeEmployeeId,
      alternativeEmployeeName: request.alternative_employee_name || request.alternativeEmployeeName,
      halfDaySession: request.half_day_session || request.halfDaySession,
      currentApprover: request.current_approver || request.currentApprover,
      firstApprover: request.first_approver || request.firstApprover,
      managerApproval: request.manager_approval || request.managerApproval,
      hrApproval: request.hr_approval || request.hrApproval,
      superAdminApproval: request.super_admin_approval || request.superAdminApproval,
      createdAt: request.created_at || request.createdAt
    };
  },

  getRequestsByEmployee: async (employeeId) => {
    try {
      // Check if Supabase is properly configured
      if (!isSupabaseConfigured()) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Supabase not configured, returning empty array');
        }
        return [];
      }

      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        return [];
      }

      // Ensure we always return an array and normalize each request
      const requests = Array.isArray(data) ? data : [];
      return requests.map(req => dataService.normalizeRequest(req));
    } catch (error) {
      console.error('Error in getRequestsByEmployee:', error);
      return [];
    }
  },

  getRequestsByManager: async (managerId) => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching manager requests:', error);
        return [];
      }

      // Filter out requests already approved by manager and normalize
      return (data || []).filter(req => {
        const managerApproval = req.manager_approval || req.managerApproval;
        return !managerApproval;
      }).map(req => dataService.normalizeRequest(req));
    } catch (error) {
      console.error('Error in getRequestsByManager:', error);
      return [];
    }
  },

  getRequestsByHR: async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching HR requests:', error);
        return [];
      }

      return (data || []).filter(req => {
        const s = (req.status || '').toLowerCase();
        if (s !== 'pending') return false;

        const hrApproval = req.hr_approval || req.hrApproval;
        // Show if no HR approval object, OR HR approval object status is 'pending'
        return !hrApproval || hrApproval.status === 'pending';
      }).map(req => dataService.normalizeRequest(req));
    } catch (error) {
      console.error('Error in getRequestsByHR:', error);
      return [];
    }
  },

  getRequestsBySuperAdmin: async () => {
    try {
      // Super Admin should see:
      // 1. Requests where HR approval is bypassed (HR on leave/OD)
      // 2. HR's own leave requests when HR is on leave
      // 3. Direct requests to Super Admin

      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching SuperAdmin requests:', error);
        return [];
      }

      // Get HR employee ID
      const hrEmployee = employees.find(emp => emp.role === 'hr');
      const hrId = hrEmployee ? hrEmployee.id : 'HR001';

      // Check if HR is on leave today
      const today = new Date().toISOString().split('T')[0];
      let hrIsOnLeave = false;
      try {
        const { data: hrOnLeave } = await supabase
          .from('requests')
          .select('id')
          .eq('employee_id', hrId)
          .eq('status', 'approved')
          .in('type', ['leave', 'halfday', 'od'])
          .lte('start_date', today)
          .gte('end_date', today);
        hrIsOnLeave = hrOnLeave && hrOnLeave.length > 0;
      } catch (err) {
        console.error('Error checking HR leave status:', err);
      }

      return (data || []).filter(req => {
        const superAdminApproval = req.super_admin_approval || req.superAdminApproval;
        const hrApproval = req.hr_approval || req.hrApproval;

        // Show if:
        // 1. No super admin approval yet AND
        // 2. (HR approval is bypassed OR HR is on leave OR this is HR's own request)
        if (superAdminApproval) return false;

        if (hrApproval && hrApproval.status === 'bypassed') {
          return true; // HR bypassed, Super Admin should approve
        }

        if (hrIsOnLeave) {
          // If HR is on leave, show HR's requests and requests that need HR approval
          if (req.employee_id === hrId) {
            return true; // HR's own request
          }
          if (!hrApproval && req.current_approver === 'hr') {
            return true; // Request waiting for HR, but HR is on leave
          }
        }

        // Show requests directly assigned to Super Admin
        if (req.current_approver === 'superadmin') {
          return true;
        }

        return false;
      }).map(req => dataService.normalizeRequest(req));
    } catch (error) {
      console.error('Error in getRequestsBySuperAdmin:', error);
      return [];
    }
  },

  getAllRequests: async () => {
    try {
      if (!isSupabaseConfigured()) {
        return [];
      }

      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all requests:', error);
        return [];
      }

      const requests = Array.isArray(data) ? data : [];
      return requests.map(req => dataService.normalizeRequest(req));
    } catch (error) {
      console.error('Error in getAllRequests:', error);
      return [];
    }
  },

  getRequestsByStatus: async (status) => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests by status:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRequestsByStatus:', error);
      return [];
    }
  },

  // Check for conflicts - Alternative employee should not have leave on the same dates
  // AND should not be assigned as alternate for someone else's leave
  checkAlternativeEmployeeConflict: async (alternativeEmployeeId, startDate, endDate, startTime, endTime, excludeRequestId = null) => {
    try {
      if (!isSupabaseConfigured()) {
        // Fallback to local check if Supabase not configured
        return false;
      }

      // CONDITION 1: Check if alternative employee has any approved or pending leave/permission on the same dates
      let query1 = supabase
        .from('requests')
        .select('*')
        .eq('employee_id', alternativeEmployeeId) // Check if they are the requesting employee
        .in('status', ['pending', 'approved']) // Only check approved or pending requests
        .neq('status', 'rejected')
        .neq('status', 'cancelled');

      if (excludeRequestId) {
        query1 = query1.neq('id', excludeRequestId);
      }

      const { data: employeeRequests, error: error1 } = await query1;

      if (error1) {
        console.error('Error checking employee conflict:', error1);
        return false;
      }

      // Check date/time conflicts for employee's own requests
      const checkStart = new Date(startDate);
      checkStart.setHours(0, 0, 0, 0);
      const checkEnd = new Date(endDate || startDate);
      checkEnd.setHours(23, 59, 59, 999);

      if (employeeRequests && employeeRequests.length > 0) {
        for (const req of employeeRequests) {
          const reqStartDate = req.start_date || req.startDate;
          const reqEndDate = req.end_date || req.endDate || reqStartDate;

          const reqStart = new Date(reqStartDate);
          reqStart.setHours(0, 0, 0, 0);
          const reqEnd = new Date(reqEndDate);
          reqEnd.setHours(23, 59, 59, 999);

          // For leave requests (full day) - check if dates overlap
          if (req.type === 'leave' || req.type === 'halfday' || (!startTime && !endTime)) {
            // Check if there's any date overlap
            if (checkStart <= reqEnd && checkEnd >= reqStart) {
              return true; // Conflict found - employee has leave on these dates
            }
          }
          // For permission requests (time-based) - check if same date and time overlaps
          else if (req.type === 'permission' && startTime && endTime && req.start_time && req.end_time) {
            if (reqStartDate === startDate) {
              const reqStartTime = new Date(`${reqStartDate}T${req.start_time || req.startTime}`);
              const reqEndTime = new Date(`${reqStartDate}T${req.end_time || req.endTime}`);
              const checkStartTime = new Date(`${startDate}T${startTime}`);
              const checkEndTime = new Date(`${startDate}T${endTime}`);

              // Check if time ranges overlap
              if (checkStartTime < reqEndTime && checkEndTime > reqStartTime) {
                return true; // Conflict found - employee has permission on this time
              }
            }
          }
        }
      }

      // CONDITION 2: Check if this employee is already assigned as alternate for someone else's leave
      let query2 = supabase
        .from('requests')
        .select('*')
        .eq('alternative_employee_id', alternativeEmployeeId) // Check if they are the alternate employee
        .in('status', ['pending', 'approved']) // Only check approved or pending requests
        .neq('status', 'rejected')
        .neq('status', 'cancelled');

      if (excludeRequestId) {
        query2 = query2.neq('id', excludeRequestId);
      }

      const { data: alternateRequests, error: error2 } = await query2;

      if (error2) {
        console.error('Error checking alternate conflict:', error2);
        return false;
      }

      // Check if they're assigned as alternate for any requests during the same period
      if (alternateRequests && alternateRequests.length > 0) {
        for (const req of alternateRequests) {
          const reqStartDate = req.start_date || req.startDate;
          const reqEndDate = req.end_date || req.endDate || reqStartDate;

          const reqStart = new Date(reqStartDate);
          reqStart.setHours(0, 0, 0, 0);
          const reqEnd = new Date(reqEndDate);
          reqEnd.setHours(23, 59, 59, 999);

          // Check if there's any date overlap
          if (checkStart <= reqEnd && checkEnd >= reqStart) {
            return true; // Conflict found - employee is already alternate for someone else
          }
        }
      }

      return false; // No conflict
    } catch (error) {
      console.error('Error in checkAlternativeEmployeeConflict:', error);
      return false;
    }
  },

  // Approval methods - any of the 3 roles can approve first
  approveRequest: async (requestId, approverRole, approverId) => {
    try {
      // First, get the request
      const { data: request, error: fetchError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        console.error('Error fetching request:', fetchError);
        return null;
      }

      // Check if THIS role has already approved
      if (
        (approverRole === 'manager' && request.manager_approval) ||
        (approverRole === 'hr' && request.hr_approval) ||
        (approverRole === 'superadmin' && request.super_admin_approval)
      ) {
        return request;
      }

      const approver = employees.find(emp => emp.id === approverId);
      const approverName = approver ? approver.name : approverId;

      // Prepare approval data
      const approvalData = {
        status: 'approved',
        approver_id: approverId,
        approver_name: approverName,
        approved_at: new Date().toISOString()
      };

      // Update based on role
      const updateData = {
        status: 'approved' // Set global status to approved if anyone approves
      };

      if (approverRole === 'manager') {
        updateData.manager_approval = approvalData;

        // Create simple notification message
        let message = '';
        if (request.type === 'leave') {
          const start = new Date(request.start_date);
          const end = new Date(request.end_date);
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          message = `Your leave (${request.start_date} to ${request.end_date}) ${days} ${days > 1 ? 'days' : 'day'} leave approved`;
        } else if (request.type === 'halfday') {
          message = `Your half day leave (${request.start_date} ${request.half_day_session}) approved`;
        } else {
          message = `Your permission (${request.start_date} ${request.start_time}-${request.end_time}) approved`;
        }

        // Notify Employee
        dataService.createNotification(
          request.employee_id,
          message,
          'approval',
          requestId
        );
      } else if (approverRole === 'hr') {
        updateData.hr_approval = approvalData;

        // Create simple notification message  
        let message = '';
        if (request.type === 'leave') {
          const start = new Date(request.start_date);
          const end = new Date(request.end_date);
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          message = `Your leave (${request.start_date} to ${request.end_date}) ${days} ${days > 1 ? 'days' : 'day'} leave approved`;
        } else if (request.type === 'halfday') {
          message = `Your half day leave (${request.start_date} ${request.half_day_session}) approved`;
        } else {
          message = `Your permission (${request.start_date} ${request.start_time}-${request.end_time}) approved`;
        }

        // Notify Employee
        dataService.createNotification(
          request.employee_id,
          message,
          'approval',
          requestId
        );

        // Notify Manager & Superadmin
        if (request.employee_id) {
          dataService.getEmployeeByCode(request.employee_id).then(emp => {
            if (emp && emp.managerId) {
              dataService.createNotification(emp.managerId, `Leave request ${requestId} for ${emp.name} approved by HR`, 'info', requestId);
            }
          });
        }
        dataService.createNotification('ADMIN001', `Leave request ${requestId} approved by HR`, 'info', requestId);
      } else if (approverRole === 'superadmin') {
        updateData.super_admin_approval = approvalData;

        // Create simple notification message
        let message = '';
        if (request.type === 'leave') {
          const start = new Date(request.start_date);
          const end = new Date(request.end_date);
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          message = `Your leave (${request.start_date} to ${request.end_date}) ${days} ${days > 1 ? 'days' : 'day'} leave approved`;
        } else if (request.type === 'halfday') {
          message = `Your half day leave (${request.start_date} ${request.half_day_session}) approved`;
        } else {
          message = `Your permission (${request.start_date} ${request.start_time}-${request.end_time}) approved`;
        }

        // Notify Employee
        dataService.createNotification(
          request.employee_id,
          message,
          'approval',
          requestId
        );

        // Notify Manager & HR
        if (request.employee_id) {
          dataService.getEmployeeByCode(request.employee_id).then(emp => {
            if (emp && emp.managerId) {
              dataService.createNotification(emp.managerId, `Leave request ${requestId} for ${emp.name} approved by Superadmin`, 'info', requestId);
            }
          });
        }
        dataService.createNotification('HR001', `Leave request ${requestId} approved by Superadmin`, 'info', requestId);
      }

      // If this is the VERY first approval, set first_approver
      if (!request.first_approver) {
        updateData.first_approver = {
          role: approverRole,
          approver_id: approverId,
          approver_name: approverName,
          approved_at: new Date().toISOString()
        };
      }

      const { error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', requestId); // Removed .select() and .single()

      if (error) {
        console.error('Error approving request:', error);

        // Retry with ONLY status 'approved' if it failed (likely due to missing columns)
        if (error.message && (error.message.includes("column") || error.message.includes("schema"))) {
          console.warn('Retrying approval with status only...');
          const retry = await supabase
            .from('requests')
            .update({ status: 'approved' })
            .eq('id', requestId);

          if (retry.error) {
            console.error('Retry failed:', retry.error);
            return null;
          }
          // Return basic success
          return { ...request, status: 'approved' };
        }
        return null;
      }

      // Return local data since we know the update succeeded
      return { ...request, ...updateData };
    } catch (error) {
      console.error('Error in approveRequest:', error);
      return null;
    }
  },

  rejectRequest: async (requestId, approverRole, approverId, reason) => {
    try {
      // First, get the request
      const { data: request, error: fetchError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        console.error('Error fetching request:', fetchError);
        return null;
      }

      // Check if already processed
      if (request.status === 'rejected') {
        return request;
      }

      const approver = employees.find(emp => emp.id === approverId);
      const approverName = approver ? approver.name : approverId;

      const rejectionData = {
        status: 'rejected',
        approver_id: approverId,
        approver_name: approverName,
        reason: reason,
        rejected_at: new Date().toISOString()
      };

      const updateData = {
        status: 'rejected',
        current_approver: null
      };

      if (approverRole === 'manager') {
        updateData.manager_approval = rejectionData;
      } else if (approverRole === 'hr') {
        updateData.hr_approval = rejectionData;
      } else if (approverRole === 'superadmin') {
        updateData.super_admin_approval = rejectionData;
      }

      const { data, error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        console.error('Error rejecting request:', error);
        return null;
      }

      // Notify Employee of rejection with detailed information
      const requestType = request.type === 'leave' ? 'Leave' :
        request.type === 'halfday' ? 'Half Day Leave' : 'Permission';
      const dateInfo = request.type === 'leave'
        ? `from ${request.start_date} to ${request.end_date}`
        : request.type === 'halfday'
          ? `on ${request.start_date} (${request.half_day_session})`
          : `on ${request.start_date} (${request.start_time} - ${request.end_time})`;

      const roleTitle = approverRole === 'manager' ? 'Manager' :
        approverRole === 'hr' ? 'HR' : 'Super Admin';

      dataService.createNotification(
        request.employee_id,
        `❌ Your ${requestType} request ${dateInfo} has been rejected by ${roleTitle} (${approverName}). Reason: ${reason}`,
        'rejection',
        requestId
      );

      return data;
    } catch (error) {
      console.error('Error in rejectRequest:', error);
      return null;
    }
  },

  // Reporting methods
  getLeaveSummary: async (startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('type', 'leave')
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching leave summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getLeaveSummary:', error);
      return [];
    }
  },

  getPermissionSummary: async (startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('type', 'permission')
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching permission summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPermissionSummary:', error);
      return [];
    }
  },

  getDepartmentWiseSummary: async (department) => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('department', department)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching department summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDepartmentWiseSummary:', error);
      return [];
    }
  },

  getMonthlySummary: async (year, month) => {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching monthly summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMonthlySummary:', error);
      return [];
    }
  },

  // Get employees currently on leave
  getEmployeesOnLeave: async (department = null, date = new Date()) => {
    try {
      const today = new Date(date);
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      let query = supabase
        .from('requests')
        .select('*')
        .eq('status', 'approved')
        .eq('type', 'leave')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr);

      if (department) {
        query = query.eq('department', department);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching employees on leave:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getEmployeesOnLeave:', error);
      return [];
    }
  },

  // Get all departments leave status
  getAllDepartmentsLeaveStatus: async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const { data: onLeave, error: leaveError } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'approved')
        .eq('type', 'leave')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr);

      if (leaveError) {
        console.error('Error fetching leave status:', leaveError);
        return [];
      }

      const { data: allEmployees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('role', 'employee');

      if (empError) {
        console.error('Error fetching employees:', empError);
        return [];
      }

      // Group by department
      const departments = [...new Set(allEmployees.map(emp => emp.department))];

      return departments.map(dept => {
        const deptEmployees = allEmployees.filter(emp => emp.department === dept);
        const deptOnLeave = onLeave.filter(req => req.department === dept);
        const onLeaveIds = new Set(deptOnLeave.map(req => req.employee_id));
        const onLeaveEmployees = deptEmployees.filter(emp => onLeaveIds.has(emp.id));

        return {
          department: dept,
          totalEmployees: deptEmployees.length,
          onLeaveCount: onLeaveEmployees.length,
          onLeaveEmployees: onLeaveEmployees.map(emp => ({
            id: emp.id,
            name: emp.name,
            leaveRequests: deptOnLeave.filter(req => req.employee_id === emp.id)
          }))
        };
      });
    } catch (error) {
      console.error('Error in getAllDepartmentsLeaveStatus:', error);
      return [];
    }
  },

  // Get approval history for a request
  getApprovalHistory: async (requestId) => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !data) {
        console.error('Error fetching request:', error);
        return [];
      }

      const history = [];

      if (data.created_at) {
        history.push({
          action: 'created',
          by: data.employee_name,
          byId: data.employee_id,
          timestamp: data.created_at,
          status: 'submitted'
        });
      }

      if (data.manager_approval) {
        history.push({
          action: data.manager_approval.status,
          by: 'Manager',
          byId: data.manager_approval.approver_id,
          timestamp: data.manager_approval.approved_at || data.manager_approval.rejected_at,
          status: data.manager_approval.status,
          reason: data.manager_approval.reason || null
        });
      }

      if (data.hr_approval) {
        history.push({
          action: data.hr_approval.status,
          by: 'HR',
          byId: data.hr_approval.approver_id,
          timestamp: data.hr_approval.approved_at || data.hr_approval.rejected_at,
          status: data.hr_approval.status,
          reason: data.hr_approval.reason || null
        });
      }

      if (data.super_admin_approval) {
        history.push({
          action: data.super_admin_approval.status,
          by: 'Super Admin',
          byId: data.super_admin_approval.approver_id,
          timestamp: data.super_admin_approval.approved_at || data.super_admin_approval.rejected_at,
          status: data.super_admin_approval.status,
          reason: data.super_admin_approval.reason || null
        });
      }

      return history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      console.error('Error in getApprovalHistory:', error);
      return [];
    }
  },

  // --- Announcement / Broadcast System ---

  // Check if tomorrow is a holiday
  checkTomorrowHoliday: async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Check TN Govt Holidays
    const govtHoliday = tnGovtHolidays.find(h => h.date === tomorrowStr);

    // Check Company Holidays - Fetch fresh
    let companyHolidaysList = [];
    try {
      const { data, error } = await supabase.from('holidays').select('*');
      if (!error && data) {
        companyHolidaysList = data.map(h => ({
          ...h,
          fromDate: h.from_date, // normalize
          toDate: h.to_date
        }));
      } else {
        companyHolidaysList = [...holidays];
      }
    } catch (e) {
      companyHolidaysList = [...holidays];
    }

    const companyHoliday = companyHolidaysList.find(h => {
      return h.fromDate === tomorrowStr || (h.date === tomorrowStr);
    });

    if (govtHoliday) return { ...govtHoliday, source: 'govt' };
    if (companyHoliday) return { ...companyHoliday, source: 'company' };

    return null;
  },

  // Save an announcement
  createAnnouncement: async (message, forDate) => {
    const announcement = {
      message,
      for_date: forDate,
      created_at: new Date().toISOString(),
      is_active: true
    };

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('announcements')
          .insert([announcement])
          .select()
          .single();

        if (error) {
          if (error.code !== '42P01') console.error('DB Error:', error);
          // Fallback
          throw error;
        }
        return { success: true, data };
      }
      throw new Error('Supabase not configured');
    } catch (error) {
      // Local Storage Fallback
      const current = JSON.parse(localStorage.getItem('announcements') || '[]');
      const localAnnouncement = { ...announcement, id: Date.now() };
      current.push(localAnnouncement);
      localStorage.setItem('announcements', JSON.stringify(current));
      return { success: true, data: localAnnouncement, local: true };
    }
  },

  // Get active announcement for a specific date
  getAnnouncementForDate: async (dateStr) => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('for_date', dateStr)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) return data;
      }
      throw new Error('Fallback to local');
    } catch (error) {
      // Fallback to local
      const current = JSON.parse(localStorage.getItem('announcements') || '[]');
      const matches = current.filter(a => a.for_date === dateStr);
      if (matches.length > 0) return matches[matches.length - 1];
      return null;
    }
  },

  // --- HR Assistant Permissions ---

  getHRAssistantPermissions: async () => {
    const defaultPermissions = {
      viewEmployees: true,
      viewAttendance: true,
      manualAttendance: true,
      editAttendance: false,
      viewLeaveRequests: true,
      finalApproval: false,
      exportReports: false,
      manageHolidays: false,
      manageUsers: false
    };

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'hr_assistant_permissions')
          .maybeSingle();

        if (!error && data) return { ...defaultPermissions, ...data.value };
      }
    } catch (error) {
      console.error('Error fetching permissions from DB:', error);
    }

    // Fallback to local storage
    const stored = localStorage.getItem('hr_assistant_permissions');
    if (stored) {
      try {
        return { ...defaultPermissions, ...JSON.parse(stored) };
      } catch (e) {
        return defaultPermissions;
      }
    }
    return defaultPermissions;
  },

  updateHRAssistantPermissions: async (permissions) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: 'hr_assistant_permissions', value: permissions }, { onConflict: 'key' });

        if (error) console.error('Error saving permissions to DB:', error);
      }
    } catch (error) {
      console.error('Error in updateHRAssistantPermissions:', error);
    }

    // Always update local storage as well
    localStorage.setItem('hr_assistant_permissions', JSON.stringify(permissions));
    return { success: true };
  },

  // ==========================================
  // NEW ATTENDANCE SYSTEM METHODS
  // ==========================================

  // Get attendance records for a specific date
  getAttendanceByDate: async (dateStr) => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('attendance_in')
          .select('*')
          .eq('date', dateStr);

        if (!error && data) return data;
      }

      // Local storage fallback
      const local = JSON.parse(localStorage.getItem('attendance_records') || '[]');
      return local.filter(r => r.date === dateStr);
    } catch (e) {
      console.error('Exception in getAttendanceByDate:', e);
      const local = JSON.parse(localStorage.getItem('attendance_records') || '[]');
      return local.filter(r => r.date === dateStr);
    }
  },

  // Save or update an attendance record
  saveAttendanceRecord: async (record) => {
    try {
      // Calculate metrics before saving
      const metrics = dataService.calculateAttendanceMetrics(record.inTime, record.outTime);
      const fullRecord = { ...record, ...metrics };

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('attendance_in')
          .upsert(fullRecord, { onConflict: ['employeeId', 'date'] });

        if (error) {
          console.error("Error saving attendance to Supabase:", error);
          throw error;
        }
        return { success: true, data };
      }

      // Local storage fallback
      let local = JSON.parse(localStorage.getItem('attendance_records') || '[]');
      // Check for existing record
      const idx = local.findIndex(r => r.employeeId === record.employeeId && r.date === record.date);
      if (idx >= 0) {
        local[idx] = fullRecord;
      } else {
        local.push(fullRecord);
      }
      localStorage.setItem('attendance_records', JSON.stringify(local));
      return { success: true, data: fullRecord };
    } catch (e) {
      console.error('Exception in saveAttendanceRecord:', e);
      return { success: false, error: e.message };
    }
  },

  // Helper to calculate attendance metrics based on 9:00 AM - 6:00 PM
  calculateAttendanceMetrics: (inTime, outTime) => {
    if (!inTime) return { status: 'Absent', workingHours: 0, lateMinutes: 0, permissionMinutes: 0, extraMinutes: 0 };

    const parseTime = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const stdIn = 9 * 60; // 09:00 AM
    const stdOut = 18 * 60; // 06:00 PM

    const tIn = parseTime(inTime);
    let tOut = outTime ? parseTime(outTime) : null;

    let lateMinutes = Math.max(0, tIn - stdIn);
    let extraMinutesBefore = Math.max(0, stdIn - tIn);
    let extraMinutesAfter = 0;
    let permissionMinutes = 0;
    let workingMinutes = 0;

    if (tOut) {
      workingMinutes = tOut - tIn;
      extraMinutesAfter = Math.max(0, tOut - stdOut);
      permissionMinutes = Math.max(0, stdOut - tOut);
    }

    let statuses = [];
    if (lateMinutes > 0) statuses.push('Late Comer');
    if (permissionMinutes > 0) statuses.push('Permission');
    if (extraMinutesBefore + extraMinutesAfter > 0) statuses.push('Extra Working Time');

    // Determine if Full Present
    if (tIn <= stdIn && tOut >= stdOut) {
      statuses.push('Full Present');
    } else if (tIn <= stdIn && statuses.length === 0) {
      statuses.push('Present');
    }

    return {
      status: statuses.length > 0 ? statuses.join(', ') : 'Present',
      workingHours: workingMinutes / 60,
      lateMinutes,
      permissionMinutes,
      extraMinutes: extraMinutesBefore + extraMinutesAfter,
      isLate: lateMinutes > 0,
      isPermission: permissionMinutes > 0,
      isExtra: (extraMinutesBefore + extraMinutesAfter) > 0,
      isFullPresent: tIn <= stdIn && tOut >= stdOut
    };
  },

  // Get attendance statistics for a range or report
  getAttendanceReport: async (filters) => {
    try {
      if (isSupabaseConfigured()) {
        let query = supabase.from('attendance_in').select('*, employees(*)');

        if (filters.employeeId) query = query.eq('employeeId', filters.employeeId);
        if (filters.startDate) query = query.gte('date', filters.startDate);
        if (filters.endDate) query = query.lte('date', filters.endDate);

        const { data, error } = await query;
        if (!error && data) return data;
      }

      // Local storage fallback
      let local = JSON.parse(localStorage.getItem('attendance_records') || '[]');
      if (filters.employeeId) local = local.filter(r => r.employeeId === filters.employeeId);
      if (filters.startDate) local = local.filter(r => r.date >= filters.startDate);
      if (filters.endDate) local = local.filter(r => r.date <= filters.endDate);
      if (filters.department) {
        // Join with local employees
        return local.map(record => {
          const emp = employees.find(e => e.id === record.employeeId);
          return { ...record, employees: emp };
        }).filter(r => r.employees?.department === filters.department);
      }
      return local;
    } catch (e) {
      console.error('Exception in getAttendanceReport:', e);
      return [];
    }
  },
  // Get today's attendance summary categorized
  getTodayAttendanceSummary: async (date) => {
    try {
      const allEmployees = dataService.getAllEmployees();
      const attendance = await dataService.getAttendanceByDate(date);
      const allRequests = await dataService.getAllRequests();
      const todayRequests = allRequests.filter(req =>
        req.status === 'approved' &&
        (req.startDate <= date && req.endDate >= date)
      );

      const summary = {
        present: [],
        late: [],
        permission: [],
        absent: [],
        counts: { present: 0, late: 0, permission: 0, absent: 0 }
      };

      const stdIn = 9 * 60; // 09:00 AM

      allEmployees.forEach(emp => {
        const record = attendance.find(r => r.employeeId === emp.id);
        const request = todayRequests.find(req => (req.employeeId || req.employee_id) === emp.id);

        if (record && record.inTime) {
          const [h, m] = record.inTime.split(':').map(Number);
          const tIn = h * 60 + m;

          if (tIn <= stdIn) {
            summary.present.push({ ...emp, checkIn: record.inTime });
            summary.counts.present++;
          } else {
            summary.late.push({ ...emp, checkIn: record.inTime });
            summary.counts.late++;
          }
        } else if (request) {
          if (request.type === 'permission') {
            summary.permission.push({ ...emp, reason: request.reason || 'Personal Permission' });
            summary.counts.permission++;
          } else {
            // Leave
            summary.absent.push({ ...emp, reason: request.reason || 'On Leave' });
            summary.counts.absent++;
          }
        } else {
          // No record and no request
          summary.absent.push({ ...emp, reason: 'Not Checked In' });
          summary.counts.absent++;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error getting today summary:', error);
      return {
        present: [], late: [], permission: [], absent: [],
        counts: { present: 0, late: 0, permission: 0, absent: 0 }
      };
    }
  }

};
