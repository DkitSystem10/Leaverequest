import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../utils/dataService';
import RequestList from './RequestList';
import Reports from './Reports';
import RequestForm from './RequestForm';
import LeaveCalendar from './LeaveCalendar';
import './HRDashboard.css';

const SidebarItem = ({ active, icon, label, onClick, color }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const theme = {
    blue: { bg: '#eff6ff', text: '#2563eb', iconBg: '#3b82f6' },
    purple: { bg: '#f5f3ff', text: '#7c3aed', iconBg: '#8b5cf6' },
    indigo: { bg: '#e0e7ff', text: '#4338ca', iconBg: '#6366f1' },
    cyan: { bg: '#ecfeff', text: '#0891b2', iconBg: '#06b6d4' },
    fuchsia: { bg: '#fdf4ff', text: '#a21caf', iconBg: '#d946ef' },
    emerald: { bg: '#dcfce7', text: '#15803d', iconBg: '#22c55e' }
  }[color] || { bg: '#eff6ff', text: '#2563eb', iconBg: '#3b82f6' };

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => { setIsPressed(false); setIsHovered(false); }}
      onMouseEnter={() => setIsHovered(true)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px 16px',
        border: 'none',
        background: active ? theme.bg : (isHovered ? theme.bg : 'transparent'),
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isPressed ? 'scale(0.95)' : (isHovered ? 'scale(1.02)' : 'scale(1)'),
        color: theme.text,
        fontWeight: active ? '700' : '600',
        fontSize: '15px'
      }}
    >
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px',
        background: theme.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
        boxShadow: active ? `0 4px 12px ${theme.iconBg}40` : 'none'
      }}>
        {React.cloneElement(icon, { fill: 'white', stroke: 'none' })}
      </div>
      {label}
    </button>
  );
};

function HRDashboard() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('welcome');
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState([]); // Pending approvals for HR
  const [myRequests, setMyRequests] = useState([]); // HR's own requests
  const [allRequestsList, setAllRequestsList] = useState([]); // All requests for stats
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // Hamburger menu state
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false); // Settings submenu state
  const [departmentsStatus, setDepartmentsStatus] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]); // List of departments for dropdowns
  const [settingsView, setSettingsView] = useState(null); // 'addUser', 'addDept', 'deactivate', 'holiday'
  const [newUser, setNewUser] = useState({ name: '', email: '', id: '', password: '', department: '', role: 'employee', designation: '', managerId: '', phone: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserMessage, setAddUserMessage] = useState({ type: '', text: '' });
  const [newDepartment, setNewDepartment] = useState({ id: '', name: '', description: '', head: '' }); // Updated department fields
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [addDeptMessage, setAddDeptMessage] = useState({ type: '', text: '' });
  const [selectedUserForDeactivate, setSelectedUserForDeactivate] = useState('');
  const [selectedDeactivateDept, setSelectedDeactivateDept] = useState('');
  const [deactivateMessage, setDeactivateMessage] = useState(null); // { text: string }
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'public' });
  const [stats, setStats] = useState({
    pending: 0,
    approvedOwn: 0,
    total: 0
  });

  const [todayStatus, setTodayStatus] = useState({
    present: 0,
    onLeave: 0,
    absent: 0,
    permission: 0,
    employees: []
  });

  const [holidayAlert, setHolidayAlert] = useState(null); // Stores "tomorrow's holiday" if any
  const [isAnnouncing, setIsAnnouncing] = useState(false);

  // Drill-down states for Employee List
  const [selectedDeptForView, setSelectedDeptForView] = useState(null);
  const [selectedEmployeeForView, setSelectedEmployeeForView] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadRequests();
    loadDepartmentsStatus();
    loadDepartments(); // Load departments list
    loadTodayStatus(); // Load today's employee status
    checkForNewNotifications();
    checkTomorrowHoliday();

    // Load holidays when component mounts
    const loadHolidays = async () => {
      try {
        const holidaysData = await dataService.fetchHolidays();
        setHolidays(holidaysData || []);
      } catch (error) {
        console.error('Error loading holidays:', error);
        setHolidays([]);
      }
    };
    loadHolidays();

    const interval = setInterval(() => {
      checkForNewNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('[data-menu-container]')) {
        setShowMenu(false);
        setShowSettingsSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const loadRequests = async () => {
    // 1. Pending Approvals (Manager's requests + Employee bypassed requests)
    const hrRequests = await dataService.getRequestsByHR();
    setRequests(hrRequests);

    // 2. HR's Own Requests (For "Approved" card and tracking)
    // Fetch ALL requests and filter for HR role to avoid ID mismatch issues
    const allReqs = await dataService.getAllRequests();
    const ownRequests = allReqs.filter(r =>
      // Use loose equality for ID match (in case of string/number diff)
      r.employee_id == user.id ||
      r.employeeId == user.id ||
      r.role === 'hr'
    );
    setMyRequests(ownRequests || []);

    // 3. Today's Requests (For "Today Leave Requests" count)
    const allRequests = await dataService.getAllRequests();

    // Filter for TODAY only
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    const todaysRequests = allRequests.filter(r => {
      const rDate = r.created_at || r.requested_at || r.startDate;
      return rDate && rDate.includes(todayStr);
    });

    setAllRequestsList(todaysRequests);

    setStats({
      pending: hrRequests.length,
      approvedOwn: (ownRequests || []).filter(r => r.status === 'approved').length,
      total: todaysRequests.length
    });
  };

  const checkForNewNotifications = () => {
    const userNotifications = dataService.getNotifications(user.id);
    setNotifications(userNotifications);
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const markAsRead = () => {
    notifications.forEach(n => {
      if (!n.read) {
        dataService.markNotificationAsRead(user.id, n.id);
      }
    });
    checkForNewNotifications();
    setShowNotifications(false);
  };

  const loadDepartmentsStatus = async () => {
    const status = await dataService.getAllDepartmentsLeaveStatus();
    setDepartmentsStatus(status);
  };

  const loadDepartments = async () => {
    await dataService.fetchAllEmployeesFromDB(); // Ensure latest data for settings
    const depts = await dataService.getAllDepartments();
    setDepartmentsList(depts);
  };

  const loadTodayStatus = async () => {
    try {
      // Get all active employees
      await dataService.fetchAllEmployeesFromDB();
      const allEmployees = dataService.getActiveEmployees() || [];

      // Get all requests
      const allRequests = await dataService.getAllRequests();

      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Filter today's approved requests
      const todayRequests = allRequests.filter(req => {
        if (req.status !== 'approved') return false;

        const startDate = new Date(req.startDate || req.start_date);
        const endDate = new Date(req.endDate || req.end_date);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        return today >= startDate && today <= endDate;
      });

      // Categorize employees
      let present = 0;
      let onLeave = 0;
      let permission = 0;
      let absent = 0;

      const employeeStatusList = allEmployees.map(emp => {
        // Skip inactive employees
        if (emp.status === 'inactive' || emp.status === 'Inactive') {
          return null;
        }

        // Check if employee has approved leave/permission today
        const empRequest = todayRequests.find(req =>
          (req.employeeId || req.employee_id) === emp.id
        );

        let status = 'present';
        if (empRequest) {
          if (empRequest.type === 'leave') {
            status = 'leave';
            onLeave++;
          } else if (empRequest.type === 'permission') {
            status = 'permission';
            permission++;
          }
        } else {
          // For now, assume present if no leave/permission
          // In a real system, you'd check actual attendance records
          present++;
        }

        return {
          ...emp,
          todayStatus: status,
          request: empRequest
        };
      }).filter(emp => emp !== null);

      setTodayStatus({
        present,
        onLeave,
        absent, // This would need actual attendance tracking
        permission,
        employees: employeeStatusList
      });
    } catch (error) {
      console.error('Error loading today status:', error);
    }
  };

  const handleAction = async (requestId, action, reason) => {
    if (action === 'approve') {
      await dataService.approveRequest(requestId, 'hr', user.id);
    } else if (action === 'reject') {
      const finalReason = (reason && reason.trim()) || prompt('Please provide a reason for rejection:');
      if (finalReason) {
        await dataService.rejectRequest(requestId, 'hr', user.id, finalReason.trim());
      }
    }
    await loadRequests();
    await loadDepartmentsStatus();
  };

  const checkTomorrowHoliday = async () => {
    const holiday = await dataService.checkTomorrowHoliday();
    if (holiday) {
      // Check if already announced
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const existing = await dataService.getAnnouncementForDate(tomorrowStr);
      if (!existing) {
        setHolidayAlert({ ...holiday, date: tomorrowStr });
      }
    }
  };

  const handleAnnounceHoliday = async () => {
    if (!holidayAlert) return;

    setIsAnnouncing(true);
    try {
      const message = `Tomorrow (${holidayAlert.name}) is a holiday. Enjoy your leave!`;
      await dataService.createAnnouncement(message, holidayAlert.date);

      alert('Announcement sent to all employees!');
      setHolidayAlert(null); // Hide alert
    } catch (error) {
      console.error('Error announcing:', error);
      alert('Failed to send announcement');
    } finally {
      setIsAnnouncing(false);
    }
  };

  const handleRequestSubmitted = () => {
    loadRequests();
    // Tab switching is now handled by onCloseSuccess prop of RequestForm
  };

  return (
    <div className="dashboard-container">
      {/* Mobile Overlay & Toggle */}
      <div
        className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        ☰
      </button>

      {/* SIDEBAR */}
      <div className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        {/* LOGO */}
        <div style={{ padding: '32px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
            </div>
            <span style={{ background: 'linear-gradient(90deg, #1e293b, #334155)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Durkkas ERP</span>
          </h2>
        </div>

        {/* NAVIGATION */}
        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
          <SidebarItem active={view === 'welcome'} label="Home" onClick={() => { setView('welcome'); setMobileMenuOpen(false); }} color="blue" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>} />

          <SidebarItem active={view === 'leave'} label="Leave Management" onClick={() => { setView('leave'); setActiveTab('pending'); setMobileMenuOpen(false); }} color="indigo" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" /></svg>} />

          <SidebarItem active={view === 'users'} label="User Management" onClick={() => { setView('users'); setActiveTab('users'); setSettingsView(null); setMobileMenuOpen(false); }} color="fuchsia" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} />

          <SidebarItem active={view === 'holiday'} label="Holiday Settings" onClick={() => { setView('holiday'); setActiveTab('holidays'); setMobileMenuOpen(false); }} color="cyan" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />

          <SidebarItem active={view === 'directory'} label="Employee Directory" onClick={() => { setView('directory'); setActiveTab('departments'); setMobileMenuOpen(false); }} color="purple" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} />

          <SidebarItem active={view === 'reports'} label="Reports" onClick={() => { setView('reports'); setActiveTab('reports'); setMobileMenuOpen(false); }} color="indigo" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 10a1 1 0 011-1h4a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V10zM8 4a1 1 0 011-1h4a1 1 0 011 1v16a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM14 7a1 1 0 011-1h4a1 1 0 011 1v13a1 1 0 01-1 1h-4a1 1 0 01-1-1V7z" /></svg>} />
        </div>

        {/* LOGOUT */}
        <div style={{ marginTop: 'auto', padding: '24px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', color: '#64748b' }}>
              {user.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{user.name}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>HR Manager</div>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', color: '#ef4444', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        <div className="dashboard-content-wrapper">
          {view === 'welcome' ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div>
                {/* WELCOME HEADER */}
                <div style={{ marginBottom: '40px' }}>
                  <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#1e293b', marginBottom: '8px', letterSpacing: '-1px' }}>
                    Welcome back, {user.name.split(' ')[0]}! 👋
                  </h1>
                  <p style={{ fontSize: '16px', color: '#64748b' }}>
                    Here's what's happening with your team today - {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                {/* SUPER ADMIN APPROVAL NOTIFICATION - BLINKING STYLE */}
                {(() => {
                  const latestApproved = [...myRequests]
                    .filter(r => r.superAdminApproval?.status === 'approved')
                    .sort((a, b) => {
                      const dateA = new Date(a.superAdminApproval.approved_at || a.superAdminApproval.approvedAt || a.updated_at || 0);
                      const dateB = new Date(b.superAdminApproval.approved_at || b.superAdminApproval.approvedAt || b.updated_at || 0);
                      return dateB - dateA;
                    })[0];

                  if (!latestApproved) return null;

                  const approverName = latestApproved.superAdminApproval.approver_name || latestApproved.superAdminApproval.approverName || 'Super Admin';

                  return (
                    <div style={{
                      margin: '0 0 32px 0',
                      padding: '16px 24px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '16px',
                      boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      animation: 'blink 1.5s ease-in-out infinite',
                      border: '2px solid #34d399',
                      width: '100%'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '32px', animation: 'bounce 1s ease-in-out infinite' }}>✅</span>
                        <div>
                          <h3 style={{
                            margin: 0,
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            textAlign: 'left'
                          }}>
                            {latestApproved.type === 'od' ? '🎉 New OD Approval!' : '🎉 New Leave Approval!'}
                          </h3>
                          <p style={{
                            margin: '4px 0 0 0',
                            color: '#d1fae5',
                            fontSize: '14px',
                            textAlign: 'left'
                          }}>
                            {latestApproved.type === 'od'
                              ? `Your OD (${latestApproved.startDate}) request has been approved by ${approverName}.`
                              : `Your leave (${latestApproved.startDate}) request has been approved by ${approverName}.`
                            }
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('approved');
                          setView('leave');
                        }}
                        style={{
                          background: 'white',
                          color: '#059669',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                          transition: 'all 0.3s',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        View Now →
                      </button>
                    </div>
                  );
                })()}

                {/* TODAY'S STATUS CARDS */}
                <div style={{ marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>Today's Attendance Overview</h2>
                  <div className="stats-grid-4">
                    {/* Present Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '20px',
                      padding: '28px',
                      color: 'white',
                      boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(16, 185, 129, 0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.3)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1 }}>{todayStatus.present}</div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '600', opacity: 0.95 }}>Present</div>
                      <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>Active employees today</div>
                    </div>

                    {/* On Leave Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      borderRadius: '20px',
                      padding: '28px',
                      color: 'white',
                      boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(245, 158, 11, 0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(245, 158, 11, 0.3)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1 }}>{todayStatus.onLeave}</div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '600', opacity: 0.95 }}>On Leave</div>
                      <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>Approved leave today</div>
                    </div>

                    {/* Permission Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '20px',
                      padding: '28px',
                      color: 'white',
                      boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1 }}>{todayStatus.permission}</div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '600', opacity: 0.95 }}>Permission</div>
                      <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>Partial day off</div>
                    </div>

                    {/* Absent Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      borderRadius: '20px',
                      padding: '28px',
                      color: 'white',
                      boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(239, 68, 68, 0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(239, 68, 68, 0.3)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1 }}>{todayStatus.absent}</div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '600', opacity: 0.95 }}>Absent</div>
                      <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>Not marked present</div>
                    </div>
                  </div>
                </div>

                {/* EMPLOYEE STATUS DETAILS */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Employee Status Details</h3>

                  {todayStatus.employees.length > 0 ? (
                    <div style={{ display: 'grid', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                      {todayStatus.employees.slice(0, 10).map((emp, index) => {
                        const statusConfig = {
                          present: { color: '#10b981', bg: '#d1fae5', label: 'Present', icon: '✓' },
                          leave: { color: '#f59e0b', bg: '#fef3c7', label: 'On Leave', icon: '📅' },
                          permission: { color: '#3b82f6', bg: '#dbeafe', label: 'Permission', icon: '🕐' },
                          absent: { color: '#ef4444', bg: '#fee2e2', label: 'Absent', icon: '✗' }
                        }[emp.todayStatus] || { color: '#64748b', bg: '#f1f5f9', label: 'Unknown', icon: '?' };

                        return (
                          <div key={emp.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'white',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                            transition: 'all 0.2s ease'
                          }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.03)'; }}
                          >
                            {/* Avatar */}
                            <div style={{ position: 'relative', marginRight: '12px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                border: '2px solid white',
                                boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                              }}>
                                {emp.name.charAt(0)}
                              </div>
                              <div style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                width: '14px',
                                height: '14px',
                                background: statusConfig.color,
                                borderRadius: '50%',
                                border: '2px solid white',
                                fontSize: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {statusConfig.icon}
                              </div>
                            </div>

                            {/* Employee Info */}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '2px' }}>{emp.name}</div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.department} • {emp.role}</div>
                            </div>

                            {/* Status Badge */}
                            <div style={{
                              padding: '4px 10px',
                              background: statusConfig.bg,
                              color: statusConfig.color,
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span>{statusConfig.icon}</span>
                              {statusConfig.label}
                            </div>

                            {/* Request Details (if on leave/permission) */}
                            {emp.request && (
                              <div style={{ marginLeft: '16px', fontSize: '12px', color: '#64748b', maxWidth: '200px' }}>
                                {emp.request.reason && (
                                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {emp.request.reason}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      <div style={{ fontSize: '16px', fontWeight: '500' }}>No employee data available</div>
                    </div>
                  )}
                </div>

                {/* QUICK ACTIONS */}
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>Quick Actions</h2>
                  <div className="quick-actions-grid">
                    <div
                      onClick={() => { setView('leave'); setActiveTab('pending'); }}
                      style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(59, 130, 246, 0.2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                    >
                      <div style={{ width: '48px', height: '48px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Leave Management</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Review and approve leave requests</p>
                    </div>

                    <div
                      onClick={() => { setView('users'); setActiveTab('users'); setSettingsView(null); }}
                      style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d946ef'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(217, 70, 239, 0.2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                    >
                      <div style={{ width: '48px', height: '48px', background: '#fdf4ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d946ef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>User Management</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Manage employees and roles</p>
                    </div>

                    <div
                      onClick={() => { setView('reports'); setActiveTab('reports'); }}
                      style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(99, 102, 241, 0.2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                    >
                      <div style={{ width: '48px', height: '48px', background: '#eef2ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10a1 1 0 011-1h4a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V10zM8 4a1 1 0 011-1h4a1 1 0 011 1v16a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM14 7a1 1 0 011-1h4a1 1 0 011 1v13a1 1 0 01-1 1h-4a1 1 0 01-1-1V7z"></path></svg>
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Reports & Analytics</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>View insights and statistics</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-content-wrapper">
              {/* HEADER */}
              <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', letterSpacing: '-1px', marginBottom: '8px' }}>
                    {view === 'leave' ? 'Leave Management' : view === 'users' ? 'User Management' : view === 'holiday' ? 'Holiday Settings' : view === 'directory' ? 'Employee Directory' : 'Reports'}
                  </h1>
                  <p style={{ fontSize: '16px', color: '#64748b' }}>
                    {view === 'leave' ? 'Overview of leave requests and approvals' : view === 'users' ? 'Manage system users and roles' : view === 'holiday' ? 'Configure company holidays' : 'Manage your organization'}
                  </p>
                </div>
              </div>

              {/* TODAY'S STATUS VIEW - REMOVED (Now shown on home page only) */}
              {false && (
                <div style={{ paddingBottom: '60px' }}>
                  {/* Status Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
                    {/* Present Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '20px',
                      padding: '28px',
                      color: 'white',
                      boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(16, 185, 129, 0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.3)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1 }}>{todayStatus.present}</div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '600', opacity: 0.95 }}>Present</div>
                      <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>Active employees today</div>
                    </div>

                    {/* On Leave Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      borderRadius: '20px',
                      padding: '28px',
                      color: 'white',
                      boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(245, 158, 11, 0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(245, 158, 11, 0.3)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1 }}>{todayStatus.onLeave}</div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '600', opacity: 0.95 }}>On Leave</div>
                      <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>Approved leave today</div>
                    </div>

                    {/* Permission Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '20px',
                      padding: '28px',
                      color: 'white',
                      boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1 }}>{todayStatus.permission}</div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '600', opacity: 0.95 }}>Permission</div>
                      <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>Partial day off</div>
                    </div>

                    {/* Absent Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      borderRadius: '20px',
                      padding: '28px',
                      color: 'white',
                      boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(239, 68, 68, 0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(239, 68, 68, 0.3)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1 }}>{todayStatus.absent}</div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '600', opacity: 0.95 }}>Absent</div>
                      <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>Not marked present</div>
                    </div>
                  </div>

                  {/* Employee List */}
                  <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Employee Status Details</h3>

                    {todayStatus.employees.length > 0 ? (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {todayStatus.employees.map((emp, index) => {
                          const statusConfig = {
                            present: { color: '#10b981', bg: '#d1fae5', label: 'Present', icon: '✓' },
                            leave: { color: '#f59e0b', bg: '#fef3c7', label: 'On Leave', icon: '📅' },
                            permission: { color: '#3b82f6', bg: '#dbeafe', label: 'Permission', icon: '🕐' },
                            absent: { color: '#ef4444', bg: '#fee2e2', label: 'Absent', icon: '✗' }
                          }[emp.todayStatus] || { color: '#64748b', bg: '#f1f5f9', label: 'Unknown', icon: '?' };

                          return (
                            <div key={emp.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '16px 20px',
                              background: '#f8fafc',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              transition: 'all 0.2s ease'
                            }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                            >
                              {/* Avatar */}
                              <div style={{ position: 'relative', marginRight: '16px' }}>
                                <div style={{
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '16px',
                                  border: '2px solid white',
                                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                                }}>
                                  {emp.name.charAt(0)}
                                </div>
                                <div style={{
                                  position: 'absolute',
                                  bottom: '-2px',
                                  right: '-2px',
                                  width: '16px',
                                  height: '16px',
                                  background: statusConfig.color,
                                  borderRadius: '50%',
                                  border: '2px solid white',
                                  fontSize: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {statusConfig.icon}
                                </div>
                              </div>

                              {/* Employee Info */}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '2px' }}>{emp.name}</div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>{emp.department} • {emp.role}</div>
                              </div>

                              {/* Status Badge */}
                              <div style={{
                                padding: '6px 16px',
                                background: statusConfig.bg,
                                color: statusConfig.color,
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <span>{statusConfig.icon}</span>
                                {statusConfig.label}
                              </div>

                              {/* Request Details (if on leave/permission) */}
                              {emp.request && (
                                <div style={{ marginLeft: '16px', fontSize: '12px', color: '#64748b', maxWidth: '200px' }}>
                                  {emp.request.reason && (
                                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {emp.request.reason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <div style={{ fontSize: '16px', fontWeight: '500' }}>No employee data available</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {view === 'leave' && (
                <div className="stats-grid-4" style={{ marginBottom: '32px' }}>
                  {/* Holiday Alert Card - Shows only if tomorrow is a holiday and not yet announced */}
                  {holidayAlert && (
                    <div style={{
                      gridColumn: '1 / -1',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                      padding: '20px',
                      borderRadius: '16px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 16px rgba(109, 40, 217, 0.3)',
                      animation: 'slideDown 0.5s ease-out'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '32px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '50%' }}>📢</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Tomorrow is {holidayAlert.name}</h3>
                          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                            Govt Holiday detected for tomorrow ({holidayAlert.date}). Do you want to notify all employees?
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          onClick={() => setHolidayAlert(null)}
                          style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Ignore
                        </button>
                        <button
                          onClick={handleAnnounceHoliday}
                          disabled={isAnnouncing}
                          style={{
                            background: 'white',
                            border: 'none',
                            color: '#6d28d9',
                            padding: '10px 24px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}
                        >
                          {isAnnouncing ? 'Sending...' : 'Approve & Send'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Card 1: Employee Leave Requests */}
                  {/* Card 1: Today Leave Requests */}
                  <div
                    className={`stat-card ${activeTab === 'all-requests' ? 'active' : ''}`}
                    onClick={async () => {
                      setView('leave');
                      setActiveTab('all-requests');
                      await loadRequests();
                    }}
                    style={{
                      cursor: 'pointer',
                      background: activeTab === 'all-requests' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                      color: activeTab === 'all-requests' ? 'white' : '#1e293b',
                      boxShadow: activeTab === 'all-requests' ? '0 12px 24px rgba(37, 99, 235, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
                      border: activeTab === 'all-requests' ? 'none' : '1px solid #e2e8f0',
                      transition: 'all 0.3s',
                      transform: activeTab === 'all-requests' ? 'translateY(-4px)' : 'translateY(0)',
                      borderRadius: '20px',
                      padding: '24px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '140px'
                    }}
                  >
                    {/* Badge: Today's Employee & Manager Requests */}
                    {(allRequestsList || []).filter(r => r.role === 'employee' || r.role === 'manager').length > 0 && (
                      <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.4)', border: '2px solid white', zIndex: 10 }}>
                        {(allRequestsList || []).filter(r => r.role === 'employee' || r.role === 'manager').length}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: activeTab === 'all-requests' ? 'rgba(255,255,255,0.2)' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'all-requests' ? 'white' : '#2563eb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: '800' }}>{stats.total}</div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '600', opacity: activeTab === 'all-requests' ? 0.9 : 0.7 }}>Today Leave Requests</div>
                  </div>

                  {/* Card 2: Apply Leave */}
                  <div
                    className={`stat-card ${activeTab === 'apply' ? 'active' : ''}`}
                    onClick={() => { setView('leave'); setActiveTab('apply'); }}
                    style={{
                      cursor: 'pointer',
                      background: activeTab === 'apply' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                      color: activeTab === 'apply' ? 'white' : '#1e293b',
                      boxShadow: activeTab === 'apply' ? '0 12px 24px rgba(37, 99, 235, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
                      border: activeTab === 'apply' ? 'none' : '1px solid #e2e8f0',
                      transition: 'all 0.3s',
                      transform: activeTab === 'apply' ? 'translateY(-4px)' : 'translateY(0)',
                      borderRadius: '20px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '140px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: activeTab === 'apply' ? 'rgba(255,255,255,0.2)' : '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'apply' ? 'white' : '#7c3aed'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800' }}>Apply</div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '600', opacity: activeTab === 'apply' ? 0.9 : 0.7 }}>Create Request</div>
                  </div>

                  {/* Card 3: Approved Requests (History) */}
                  <div
                    className={`stat-card ${activeTab === 'approved' ? 'active' : ''}`}
                    onClick={() => { setView('leave'); setActiveTab('approved'); }}
                    style={{
                      cursor: 'pointer',
                      background: activeTab === 'approved' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                      color: activeTab === 'approved' ? 'white' : '#1e293b',
                      boxShadow: activeTab === 'approved' ? '0 12px 24px rgba(37, 99, 235, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
                      border: activeTab === 'approved' ? 'none' : '1px solid #e2e8f0',
                      transition: 'all 0.3s',
                      transform: activeTab === 'approved' ? 'translateY(-4px)' : 'translateY(0)',
                      borderRadius: '20px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '140px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: activeTab === 'approved' ? 'rgba(255,255,255,0.2)' : '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'approved' ? 'white' : '#059669'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: '800' }}>
                        {myRequests.filter(r => {
                          const status = (r.status || '').toLowerCase();
                          const saStatus = r.superAdminApproval ? (r.superAdminApproval.status || 'approved').toLowerCase() : '';
                          return status === 'approved' || saStatus === 'approved';
                        }).length}
                      </div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '600', opacity: activeTab === 'approved' ? 0.9 : 0.7 }}>Approved Requests</div>
                  </div>

                  {/* Card 5: Monthly Report */}
                  <div
                    className={`stat-card ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => { setView('leave'); setActiveTab('reports'); }}
                    style={{
                      cursor: 'pointer',
                      background: activeTab === 'reports' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                      color: activeTab === 'reports' ? 'white' : '#1e293b',
                      boxShadow: activeTab === 'reports' ? '0 12px 24px rgba(37, 99, 235, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
                      border: activeTab === 'reports' ? 'none' : '1px solid #e2e8f0',
                      transition: 'all 0.3s',
                      transform: activeTab === 'reports' ? 'translateY(-4px)' : 'translateY(0)',
                      borderRadius: '20px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '140px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: activeTab === 'reports' ? 'rgba(255,255,255,0.2)' : '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Calendar Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'reports' ? 'white' : '#059669'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      </div>
                      {/* No Stats for Monthly Report typically */}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '600', opacity: activeTab === 'reports' ? 0.9 : 0.7 }}>Monthly Report</div>
                  </div>
                </div>
              )}

              <div className="card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }}>
                <div className="tabs" style={{ display: 'none' }}>
                  {/* Tabs Hidden - Navigation via Cards & Menu */}
                </div>

                {activeTab === 'pending' && (
                  <div className="requests-section">
                    <div className="card-header">
                      <h3>Pending Approvals ({requests.length})</h3>
                      <p>Manager requests and Employee requests (during Manager leave)</p>
                    </div>
                    <RequestList
                      requests={(requests || []).filter(r => r.role === 'manager')}
                      userRole="hr"
                      onAction={handleAction}
                    />
                  </div>
                )}

                {activeTab === 'departments' && (
                  <div className="departments-status" style={{ paddingBottom: '100px' }}>

                    {/* LEVEL 1, 2 & 3: NESTED ACCORDION LIST */}
                    <div className="departments-accordion-container" style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

                      {/* Search & Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Employee Directory</h3>
                          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Manage and view all organization members</p>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                              padding: '12px 16px',
                              paddingLeft: '44px',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              width: '300px',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
                          />
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {departmentsList.filter(dept => {
                          if (!searchTerm) return true;
                          const term = searchTerm.toLowerCase();
                          if (dept.name.toLowerCase().includes(term)) return true;
                          const emps = (dataService.getActiveEmployees() || []).filter(e => e.department === dept.name);
                          return emps.some(e => e.name.toLowerCase().includes(term));
                        }).map(dept => {
                          const deptEmployees = (dataService.getActiveEmployees() || [])
                            .filter(e => e.department === dept.name)
                            .filter(e => !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase()));

                          const isDeptExpanded = selectedDeptForView === dept.name || (searchTerm && deptEmployees.length > 0);

                          return (
                            <div key={dept.id} style={{
                              background: 'white',
                              borderRadius: '16px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                              border: '1px solid #f1f5f9',
                              overflow: 'hidden',
                              transition: 'all 0.3s ease'
                            }}>
                              {/* Level 1: Department Header */}
                              <div
                                onClick={() => setSelectedDeptForView(isDeptExpanded ? null : dept.name)}
                                style={{
                                  padding: '24px 32px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  background: isDeptExpanded ? 'linear-gradient(to right, #f8fafc, white)' : 'white',
                                  borderBottom: isDeptExpanded ? '1px solid #e2e8f0' : 'none'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                  <div style={{
                                    width: '48px', height: '48px',
                                    background: isDeptExpanded ? '#3b82f6' : '#ecf2ff',
                                    color: isDeptExpanded ? 'white' : '#3b82f6',
                                    borderRadius: '14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '24px',
                                    boxShadow: isDeptExpanded ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                                    transition: 'all 0.3s ease'
                                  }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M8 10h.01"></path><path d="M16 10h.01"></path><path d="M8 14h.01"></path><path d="M16 14h.01"></path></svg>
                                  </div>
                                  <div>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a', fontWeight: '700', letterSpacing: '-0.3px' }}>{dept.name}</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '12px' }}>{deptEmployees.length} Members</span>
                                    </div>
                                  </div>
                                </div>
                                <div style={{
                                  transform: isDeptExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                  color: isDeptExpanded ? '#3b82f6' : '#cbd5e1',
                                  background: isDeptExpanded ? '#eff6ff' : 'transparent',
                                  borderRadius: '50%',
                                  padding: '8px'
                                }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                              </div>

                              {/* Level 2: Employee List */}
                              {isDeptExpanded && (
                                <div style={{ background: '#fcfcfc', animation: 'slideDown 0.3s ease-out' }}>
                                  {deptEmployees.length > 0 ? (
                                    <div style={{ padding: '16px 24px' }}>
                                      {deptEmployees.map(emp => {
                                        const isEmpExpanded = selectedEmployeeForView?.id === emp.id;
                                        return (
                                          <div key={emp.id} style={{ marginBottom: '12px' }}>
                                            {/* Employee Row Header */}
                                            <div
                                              onClick={() => setSelectedEmployeeForView(isEmpExpanded ? null : emp)}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '16px 20px',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                background: isEmpExpanded ? 'white' : 'white',
                                                border: isEmpExpanded ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                                boxShadow: isEmpExpanded ? '0 4px 12px rgba(59, 130, 246, 0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                                                transition: 'all 0.2s ease',
                                                position: 'relative',
                                                zIndex: isEmpExpanded ? 10 : 1
                                              }}
                                              onMouseEnter={(e) => {
                                                if (!isEmpExpanded) {
                                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.05)';
                                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                if (!isEmpExpanded) {
                                                  e.currentTarget.style.transform = 'translateY(0)';
                                                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                                }
                                              }}
                                            >
                                              <div style={{ position: 'relative' }}>
                                                <div style={{
                                                  width: '42px', height: '42px', borderRadius: '50%',
                                                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                  color: 'white',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                  fontWeight: 'bold', fontSize: '16px',
                                                  border: '2px solid white',
                                                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                                                }}>
                                                  {emp.name.charAt(0)}
                                                </div>
                                                <div style={{
                                                  position: 'absolute', bottom: 0, right: 0,
                                                  width: '12px', height: '12px',
                                                  background: emp.status === 'Active' ? '#22c55e' : '#cbd5e1',
                                                  borderRadius: '50%',
                                                  border: '2px solid white'
                                                }} />
                                              </div>

                                              <div style={{ marginLeft: '16px', flex: 1 }}>
                                                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>{emp.name}</div>
                                                <div style={{ fontSize: '13px', color: '#64748b' }}>{emp.role}</div>
                                              </div>

                                              <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: isEmpExpanded ? '#eff6ff' : '#f8fafc',
                                                color: isEmpExpanded ? '#3b82f6' : '#94a3b8',
                                                transition: 'all 0.2s'
                                              }}>
                                                {isEmpExpanded ? (
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                ) : (
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                )}
                                              </div>
                                            </div>

                                            {/* Level 3: Employee Details */}
                                            {isEmpExpanded && (
                                              <div style={{
                                                padding: '24px',
                                                background: 'white',
                                                borderBottomLeftRadius: '12px',
                                                borderBottomRightRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                borderTop: 'none',
                                                marginTop: '-4px',
                                                paddingTop: '28px',
                                                position: 'relative'
                                                // zIndex: 0
                                              }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Email Address</label>
                                                    <div style={{ color: '#334155', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                                      {emp.email}
                                                    </div>
                                                  </div>
                                                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Employee ID</label>
                                                    <div style={{ color: '#334155', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                                      EMP-{emp.id.toString().padStart(4, '0')}
                                                    </div>
                                                  </div>
                                                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Reporting Manager</label>
                                                    <div style={{ color: '#334155', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                                      {emp.managerId ? (
                                                        dataService.getAllEmployees().find(e => e.id === emp.managerId)?.name || emp.managerId
                                                      ) : '-'}
                                                    </div>
                                                  </div>
                                                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Phone</label>
                                                    <div style={{ color: '#334155', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                      {emp.phone || 'N/A'}
                                                    </div>
                                                  </div>
                                                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Account Status</label>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '6px', background: emp.status === 'Active' ? '#dcfce7' : '#f1f5f9', color: emp.status === 'Active' ? '#15803d' : '#64748b', fontSize: '13px', fontWeight: '600' }}>
                                                      <span style={{ width: '8px', height: '8px', background: 'currentColor', borderRadius: '50%' }}></span>
                                                      {emp.status || 'Active'}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>
                                      No employees found in this department.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}



                {
                  activeTab === 'users' && (
                    <div className="settings-section settings-swipe-down" style={{ padding: '24px', paddingBottom: '100px' }}>
                      <h2 style={{ marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '16px' }}>HR Settings & Configuration</h2>

                      {!settingsView && (
                        <div className="quick-actions-grid" style={{ marginTop: '40px', maxWidth: '100% ' }}>
                          <div onClick={() => setSettingsView('addUser')} className="interactive-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '24px', cursor: 'pointer', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', transition: 'all 0.3s ease' }}>
                            <div className="icon-wrapper" style={{ fontSize: '32px', background: '#eefff0', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👤</div>
                            <div>
                              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>Add New User</h3>
                              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Create employee accounts and assign roles</p>
                            </div>
                          </div>

                          <div onClick={() => setSettingsView('editUser')} className="interactive-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '24px', cursor: 'pointer', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', transition: 'all 0.3s ease' }}>
                            <div className="icon-wrapper" style={{ fontSize: '32px', background: '#f0f4ff', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✏️</div>
                            <div>
                              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>Edit User Details</h3>
                              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Update employee information and roles</p>
                            </div>
                          </div>

                          <div onClick={() => setSettingsView('deactivate')} className="interactive-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '24px', cursor: 'pointer', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', transition: 'all 0.3s ease' }}>
                            <div className="icon-wrapper" style={{ fontSize: '32px', background: '#fff1f2', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🚫</div>
                            <div>
                              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>Deactivate User</h3>
                              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Disable access for former employees</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '900px', margin: '0 auto' }}>

                        {/* 1. Add User Form */}
                        {settingsView === 'addUser' && (
                          <div id="add-user-section" style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                              <span style={{ fontSize: '28px', background: '#e0e7ff', padding: '10px', borderRadius: '12px' }}>👤</span>
                              <h3 style={{ margin: 0, fontSize: '22px' }}>Create New User</h3>
                            </div>

                            {addUserMessage.text && (
                              <div style={{
                                padding: '12px', marginBottom: '20px', borderRadius: '8px',
                                background: addUserMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                                color: addUserMessage.type === 'success' ? '#166534' : '#991b1b',
                                fontWeight: '500'
                              }}>
                                {addUserMessage.text}
                              </div>
                            )}
                            <form autoComplete="off" onSubmit={async (e) => {
                              e.preventDefault();
                              setIsAddingUser(true);
                              setAddUserMessage({ type: '', text: '' });
                              try {
                                const result = await dataService.createEmployee({
                                  id: newUser.id.trim(),
                                  name: newUser.name.trim(),
                                  email: newUser.email.trim(),
                                  password: newUser.password.trim(),
                                  department: newUser.department,
                                  role: newUser.role,
                                  designation: newUser.designation.trim(),
                                  managerId: newUser.managerId || null,
                                  status: 'active'
                                });
                                if (result.success) {
                                  setAddUserMessage({ type: 'success', text: `User "${result.data.name}" added successfully!` });
                                  setNewUser({ name: '', email: '', id: '', password: '', department: '', role: 'employee', designation: '', managerId: '', phone: '' });
                                  await loadDepartmentsStatus(); // Refresh employee lists
                                  await loadDepartments();
                                }
                              } catch (error) {
                                setAddUserMessage({ type: 'error', text: error.message });
                              } finally {
                                setIsAddingUser(false);
                              }
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Name</label>
                                  <input placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Employee ID</label>
                                  <input autoComplete="off" placeholder="e.g. EMP100" value={newUser.id} onChange={e => setNewUser({ ...newUser, id: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Phone Number</label>
                                  <input autoComplete="tel" placeholder="e.g. 9876543210" type="tel" value={newUser.phone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setNewUser({ ...newUser, phone: val }); }} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Email</label>
                                  <input autoComplete="off" placeholder="Email Address" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Password</label>
                                  <input autoComplete="new-password" placeholder="Login Password" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Department</label>
                                  <select value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }}>
                                    <option value="">Select Department</option>
                                    {departmentsList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Role</label>
                                  <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }}>
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="hr">HR</option>
                                    <option value="superadmin">Super Admin</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Designation</label>
                                  <input placeholder="Job Title" value={newUser.designation} onChange={e => setNewUser({ ...newUser, designation: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Reporting Person</label>
                                  <select value={newUser.managerId} onChange={e => setNewUser({ ...newUser, managerId: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }}>
                                    <option value="">Select Person</option>
                                    <optgroup label="Manager">
                                      {dataService.getActiveEmployees()
                                        .filter(e => e.role === 'manager')
                                        .filter((manager, index, self) =>
                                          index === self.findIndex(m => m.id === manager.id)
                                        )
                                        .slice(0, 1)
                                        .map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </optgroup>
                                    <optgroup label="HR">
                                      {dataService.getActiveEmployees().filter(e => e.role === 'hr').map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Super Admin">
                                      {dataService.getActiveEmployees().filter(e => e.role === 'superadmin').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </optgroup>
                                  </select>
                                </div>
                              </div>
                              <button type="submit" disabled={isAddingUser} style={{ marginTop: '24px', padding: '14px 32px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '16px', width: '100%' }}>
                                {isAddingUser ? 'Creating User...' : 'Create User'}
                              </button>
                            </form>
                          </div>
                        )}

                        {/* 2. Edit User Details */}
                        {settingsView === 'editUser' && (
                          <div id="edit-user-section" style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                            <button onClick={() => setSettingsView(null)} style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                              ← Back to Menu
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                              <span style={{ fontSize: '28px', background: '#dbeafe', padding: '10px', borderRadius: '12px' }}>✏️</span>
                              <h3 style={{ margin: 0, fontSize: '22px' }}>Edit User Details</h3>
                            </div>

                            {addUserMessage.text && (
                              <div style={{
                                padding: '12px', marginBottom: '20px', borderRadius: '8px',
                                background: addUserMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                                color: addUserMessage.type === 'success' ? '#166534' : '#991b1b',
                                fontWeight: '500'
                              }}>
                                {addUserMessage.text}
                              </div>
                            )}

                            {/* Step 1: Select Department */}
                            <div style={{ marginBottom: '24px' }}>
                              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Select Department</label>
                              <select
                                value={selectedDeactivateDept}
                                onChange={e => {
                                  setSelectedDeactivateDept(e.target.value);
                                  setSelectedUserForDeactivate('');
                                  setNewUser({ name: '', email: '', id: '', password: '', department: '', role: 'employee', designation: '', managerId: '', phone: '' });
                                }}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }}
                              >
                                <option value="">-- Choose Department --</option>
                                {departmentsList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                              </select>
                            </div>

                            {/* Step 2: Select Employee */}
                            {selectedDeactivateDept && (
                              <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Select Employee to Edit</label>
                                <select
                                  value={selectedUserForDeactivate}
                                  onChange={e => {
                                    const empId = e.target.value;
                                    setSelectedUserForDeactivate(empId);
                                    const emp = dataService.getAllEmployees().find(e => e.id === empId);
                                    if (emp) {
                                      setNewUser({
                                        id: emp.id,
                                        name: emp.name,
                                        email: emp.email,
                                        password: '', // Don't pre-fill password
                                        department: emp.department,
                                        role: emp.role,
                                        designation: emp.designation || '',
                                        managerId: emp.managerId || '',
                                        phone: emp.phone || ''
                                      });
                                    }
                                  }}
                                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }}
                                >
                                  <option value="">-- Choose Employee --</option>
                                  {dataService.getAllEmployees()
                                    .filter(e => e.department === selectedDeactivateDept)
                                    .map(emp => (
                                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                                    ))}
                                </select>
                              </div>
                            )}

                            {/* Step 3: Edit Form */}
                            {selectedUserForDeactivate && (
                              <form autoComplete="off" onSubmit={async (e) => {
                                e.preventDefault();
                                setIsAddingUser(true);
                                setAddUserMessage({ type: '', text: '' });
                                try {
                                  const result = await dataService.updateEmployee({
                                    id: newUser.id,
                                    name: newUser.name.trim(),
                                    email: newUser.email.trim(),
                                    password: newUser.password.trim() || undefined, // Only update if provided
                                    department: newUser.department,
                                    role: newUser.role,
                                    designation: newUser.designation.trim(),
                                    managerId: newUser.managerId || null,
                                    phone: newUser.phone || null
                                  });
                                  if (result.success) {
                                    setAddUserMessage({ type: 'success', text: `User "${newUser.name}" updated successfully!` });
                                    await loadDepartmentsStatus();
                                    await loadDepartments();
                                    setSelectedDeactivateDept('');
                                    setSelectedUserForDeactivate('');
                                    setNewUser({ name: '', email: '', id: '', password: '', department: '', role: 'employee', designation: '', managerId: '', phone: '' });
                                  }
                                } catch (error) {
                                  setAddUserMessage({ type: 'error', text: error.message });
                                } finally {
                                  setIsAddingUser(false);
                                }
                              }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                  <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Name</label>
                                    <input placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Employee ID</label>
                                    <input placeholder="e.g. EMP100" value={newUser.id} disabled style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#e5e7eb', cursor: 'not-allowed' }} />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Phone Number</label>
                                    <input autoComplete="tel" placeholder="e.g. 9876543210" type="tel" value={newUser.phone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setNewUser({ ...newUser, phone: val }); }} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Email</label>
                                    <input placeholder="Email Address" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>New Password (optional)</label>
                                    <input placeholder="Leave blank to keep current" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                  </div>

                                  <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Department</label>
                                    <select value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }}>
                                      <option value="">Select Department</option>
                                      {departmentsList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                  </div>

                                  <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Role</label>
                                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }}>
                                      <option value="employee">Employee</option>
                                      <option value="manager">Manager</option>
                                      <option value="hr">HR</option>
                                      <option value="superadmin">Super Admin</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Designation</label>
                                    <input placeholder="Job Title" value={newUser.designation} onChange={e => setNewUser({ ...newUser, designation: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                                  </div>

                                  <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Reporting Person</label>
                                    <select value={newUser.managerId} onChange={e => setNewUser({ ...newUser, managerId: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }}>
                                      <option value="">Select Person</option>
                                      <optgroup label="Manager">
                                        {dataService.getAllEmployees()
                                          .filter(e => e.role === 'manager')
                                          .filter((manager, index, self) =>
                                            index === self.findIndex(m => m.id === manager.id)
                                          )
                                          .slice(0, 1)
                                          .map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                      </optgroup>
                                      <optgroup label="HR">
                                        {dataService.getAllEmployees().filter(e => e.role === 'hr').map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                      </optgroup>
                                      <optgroup label="Super Admin">
                                        {dataService.getAllEmployees().filter(e => e.role === 'superadmin').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                      </optgroup>
                                    </select>
                                  </div>
                                </div>
                                <button type="submit" disabled={isAddingUser} style={{ marginTop: '24px', padding: '14px 32px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '16px', width: '100%' }}>
                                  {isAddingUser ? 'Updating User...' : 'Update User'}
                                </button>
                              </form>
                            )}
                          </div>
                        )}

                        {/* 3. Deactivate User */}
                        {settingsView === 'deactivate' && (
                          <div id="deactivate-section" style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                            <button onClick={() => setSettingsView(null)} style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                              ← Back to Menu
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                              <span style={{ fontSize: '28px', background: '#fee2e2', padding: '10px', borderRadius: '12px' }}>🚫</span>
                              <h3 style={{ margin: 0, fontSize: '22px' }}>Deactivate User</h3>
                            </div>

                            {deactivateMessage && <div style={{ padding: '12px', marginBottom: '20px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', fontWeight: '500' }}>{deactivateMessage.text}</div>}

                            <div style={{ marginBottom: '20px' }}>
                              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Select Department to View Employees</label>
                              <select value={selectedDeactivateDept} onChange={e => setSelectedDeactivateDept(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', width: '100%', background: '#f9fafb' }}>
                                <option value="">-- Choose Department --</option>
                                {departmentsList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                              </select>
                            </div>

                            {selectedDeactivateDept && (
                              <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead style={{ background: '#f8f9fa' }}>
                                    <tr style={{ textAlign: 'left' }}>
                                      <th style={{ padding: '12px' }}>ID</th>
                                      <th style={{ padding: '12px' }}>Name</th>
                                      <th style={{ padding: '12px' }}>Status</th>
                                      <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dataService.getActiveEmployees().filter(e => e.department === selectedDeactivateDept).map(emp => (
                                      <tr key={emp.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px', color: '#666' }}>{emp.id}</td>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>{emp.name}</td>
                                        <td style={{ padding: '12px' }}>
                                          <span style={{
                                            background: (emp.status === 'Deactivated' || emp.status === 'deactivated' || emp.status === 'Deactive') ? '#fee2e2' : '#dcfce7',
                                            color: (emp.status === 'Deactivated' || emp.status === 'deactivated' || emp.status === 'Deactive') ? '#991b1b' : '#166534',
                                            padding: '4px 8px', borderRadius: '12px', fontSize: '12px', textTransform: 'capitalize'
                                          }}>
                                            {emp.status === 'Deactive' ? 'Deactivated' : (emp.status || 'Active')}
                                          </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                          {(emp.status === 'Deactivated' || emp.status === 'deactivated' || emp.status === 'Deactive') ? (
                                            <button onClick={async () => {
                                              if (window.confirm('Rejoin ' + emp.name + '?')) {
                                                await dataService.rejoinEmployee(emp.id);
                                                setDeactivateMessage({ text: 'User rejoined successfully.' });
                                                await loadDepartments();
                                              }
                                            }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Rejoin</button>
                                          ) : (
                                            <button onClick={async () => {
                                              if (window.confirm('Deactivate ' + emp.name + '?')) {
                                                await dataService.deactivateEmployee(emp.id);
                                                setDeactivateMessage({ text: 'User deactivated.' });
                                                await loadDepartments();
                                              }
                                            }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Deactivate</button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}


                      </div>
                    </div>
                  )
                }

                {
                  activeTab === 'holidays' && (
                    <div className="settings-section settings-swipe-down" style={{ padding: '0', paddingBottom: '100px' }}>
                      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <div id="holiday-section" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <span style={{ fontSize: '28px', background: '#fff7ed', padding: '10px', borderRadius: '12px' }}>📅</span>
                            <h3 style={{ margin: '0 0 0 0', fontSize: '22px' }}>Holiday Management</h3>
                          </div>

                          <form autoComplete="off" onSubmit={async (e) => {
                            e.preventDefault();
                            let days = 1;
                            if (newHoliday.fromDate && newHoliday.toDate) {
                              const diff = new Date(newHoliday.toDate) - new Date(newHoliday.fromDate);
                              days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
                            }
                            await dataService.createHoliday({ ...newHoliday, days });
                            alert('Holiday Added Successfully!');
                            setNewHoliday({ name: '', fromDate: '', toDate: '', type: 'public', days: 0 });
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>From Date</label>
                                <input type="date" required value={newHoliday.fromDate} onChange={e => setNewHoliday({ ...newHoliday, fromDate: e.target.value })} style={{ width: '100%', maxWidth: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>To Date</label>
                                <input type="date" required value={newHoliday.toDate} onChange={e => setNewHoliday({ ...newHoliday, toDate: e.target.value })} style={{ width: '100%', maxWidth: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                              </div>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Holiday Reason / Name</label>
                              <input required value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} placeholder="e.g. Diwali" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Type</label>
                              <select value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }}>
                                <option value="public">Public Holiday</option>
                                <option value="regional">Regional Holiday</option>
                              </select>
                            </div>
                            <button type="submit" style={{ padding: '14px 32px', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '16px', width: '100%' }}>Create Holiday</button>
                          </form>
                        </div>
                      </div>
                    </div>
                  )
                }

                {
                  activeTab === 'apply' && (
                    <div style={{ padding: '0' }}>
                      <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#1e293b' }}>HR Leave Application</h3>
                      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <RequestForm
                          user={user}
                          onRequestSubmitted={handleRequestSubmitted}
                          onCloseSuccess={() => setActiveTab('approved')}
                          requestType="leave"
                        />
                      </div>
                    </div>
                  )
                }

                {
                  activeTab === 'approved' && (
                    <div className="requests-section">
                      <div className="card-header">
                        <h3>Recent Leave Approved ({myRequests.filter(r => {
                          const status = (r.status || '').toLowerCase();
                          const saStatus = r.superAdminApproval ? (r.superAdminApproval.status || 'approved').toLowerCase() : '';
                          return status === 'approved' || saStatus === 'approved';
                        }).length})</h3>
                        <p>Your leave requests approved by Super Admin</p>
                      </div>
                      <RequestList
                        requests={myRequests.filter(r => {
                          const status = (r.status || '').toLowerCase();
                          const saStatus = r.superAdminApproval ? (r.superAdminApproval.status || 'approved').toLowerCase() : '';

                          return status === 'approved' || saStatus === 'approved';
                        })}
                        userRole="employee"
                      />
                    </div>
                  )
                }

                {
                  activeTab === 'all-requests' && (
                    <div className="requests-section">
                      <div className="card-header">
                        <h3>Today's Leave Requests</h3>
                        <p>Employee and Manager leave requests submitted today</p>
                      </div>
                      <RequestList
                        requests={(allRequestsList || []).filter(r => {
                          if (r.role) return r.role === 'employee' || r.role === 'manager';
                          const empId = r.employee_id || r.employeeId;
                          if (!empId) return true;
                          const emp = dataService.getAllEmployees().find(e => e.id === empId);
                          return emp ? (emp.role !== 'hr' && emp.role !== 'superadmin') : true;
                        })}
                        userRole="hr"
                        onAction={handleAction} // HR can manage history if needed
                      />
                    </div>
                  )
                }

                {
                  activeTab === 'reports' && (
                    <div style={{ padding: '0px' }}>
                      {/* Section 1: Today's Status (Matching Manager Dashboard style) */}
                      <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>Today's Attendance Overview</h2>
                        <div className="stats-grid-4">
                          {/* Present Card */}
                          <div style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: '20px',
                            padding: '24px',
                            color: 'white',
                            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)',
                            transition: 'all 0.3s ease'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                              </div>
                              <div style={{ fontSize: '36px', fontWeight: '800' }}>{todayStatus.present}</div>
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>Present</div>
                          </div>

                          {/* On Leave Card */}
                          <div style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            borderRadius: '20px',
                            padding: '24px',
                            color: 'white',
                            boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)',
                            transition: 'all 0.3s ease'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                              </div>
                              <div style={{ fontSize: '36px', fontWeight: '800' }}>{todayStatus.onLeave}</div>
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>On Leave</div>
                          </div>

                          {/* Absent Card */}
                          <div style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            borderRadius: '20px',
                            padding: '24px',
                            color: 'white',
                            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)',
                            transition: 'all 0.3s ease'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                              </div>
                              <div style={{ fontSize: '36px', fontWeight: '800' }}>{todayStatus.absent}</div>
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>Absent</div>
                          </div>

                          {/* On Permission Card */}
                          <div style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            borderRadius: '20px',
                            padding: '24px',
                            color: 'white',
                            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)',
                            transition: 'all 0.3s ease'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                              </div>
                              <div style={{ fontSize: '36px', fontWeight: '800' }}>{todayStatus.onPermission}</div>
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>Permission</div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Monthly Leave Calendar */}
                      <div className="requests-section" style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Monthly Leave Calendar</h3>
                          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b' }}>View all organization leaves and permissions for the selected date.</p>
                        </div>
                        <LeaveCalendar user={user} scope="team" />
                      </div>

                      {/* Section 3: Detailed Reports & Analytics (Downloadable) */}
                      <div className="reports-section" style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginTop: '40px' }}>
                        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Detailed Reports & Data Export</h3>
                          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b' }}>Generate, view, and download employee leave data in PDF or CSV formats.</p>
                        </div>
                        <Reports user={user} scope="organization" />
                      </div>
                    </div>
                  )
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HRDashboard;
