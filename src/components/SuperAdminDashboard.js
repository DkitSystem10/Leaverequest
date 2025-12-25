import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../utils/dataService';
import RequestList from './RequestList';
import Reports from './Reports';
import AttendanceManagement from './AttendanceManagement';
import './SuperAdminDashboard.css';

const SidebarItem = ({ active, icon, label, onClick, color }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const theme = {
    blue: { bg: '#eff6ff', iconBg: '#3b82f6' },
    purple: { bg: '#f5f3ff', iconBg: '#8b5cf6' },
    indigo: { bg: '#e0e7ff', iconBg: '#6366f1' },
    cyan: { bg: '#ecfeff', iconBg: '#0891b2' },
    fuchsia: { bg: '#fdf4ff', iconBg: '#d946ef' },
    emerald: { bg: '#dcfce7', iconBg: '#22c55e' }
  }[color] || { bg: '#eff6ff', iconBg: '#3b82f6' };

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => { setIsPressed(false); setIsHovered(false); }}
      onMouseEnter={() => setIsHovered(true)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px 16px',
        border: 'none',
        background: active ? theme.bg : (isHovered ? '#f8fafc' : 'transparent'),
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isPressed ? 'scale(0.98)' : (isHovered ? 'scale(1.01)' : 'scale(1)'),
        color: active ? '#1e293b' : '#64748b',
        fontWeight: active ? '700' : '600',
        fontSize: '14px',
        textAlign: 'left'
      }}
    >
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px',
        background: theme.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
        boxShadow: active ? `0 4px 12px ${theme.iconBg}30` : 'none',
        flexShrink: 0
      }}>
        {React.cloneElement(icon, {
          width: '18',
          height: '18',
          fill: 'white',
          stroke: 'none'
        })}
      </div>
      <span style={{ flex: 1 }}>
        {label}
      </span>
    </button>
  );
};

function HistoryCard({ request, empName, empId, reqType, reqStatus, formatDateTime }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      const hist = await dataService.getApprovalHistory(request.id);
      setHistory(hist);
      setLoading(false);
    };
    loadHistory();
  }, [request.id]);

  // Get approval details
  const managerApproval = request.manager_approval || request.managerApproval;
  const hrApproval = request.hr_approval || request.hrApproval;
  const superAdminApproval = request.super_admin_approval || request.superAdminApproval;

  return (
    <div className="history-card">
      <div className="history-card-header">
        <strong>{request.id}</strong>
        <span className={`badge badge-${reqStatus}`}>{reqStatus}</span>
      </div>
      <div className="history-card-body">
        <div><strong>Employee:</strong> {empName} ({empId})</div>
        <div><strong>Type:</strong> {reqType}</div>
        <div style={{ marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
          <strong>Approval Details:</strong>
          <div style={{ marginTop: '8px' }}>
            {managerApproval ? (
              <div style={{ marginBottom: '5px' }}>
                <strong>Manager:</strong> {managerApproval.approver_name || managerApproval.approverName}
                {managerApproval.approved_at && ` - ${formatDateTime(managerApproval.approved_at)}`}
                {managerApproval.status === 'bypassed' && ' (Bypassed - Manager on Leave)'}
              </div>
            ) : (
              <div style={{ marginBottom: '5px', color: '#999' }}>Manager: Not approved</div>
            )}
            {hrApproval ? (
              <div style={{ marginBottom: '5px' }}>
                <strong>HR:</strong> {hrApproval.approver_name || hrApproval.approverName}
                {hrApproval.approved_at && ` - ${formatDateTime(hrApproval.approved_at)}`}
                {hrApproval.status === 'bypassed' && ' (Bypassed - HR on Leave)'}
              </div>
            ) : (
              <div style={{ marginBottom: '5px', color: '#999' }}>HR: Not approved</div>
            )}
            {superAdminApproval ? (
              <div style={{ marginBottom: '5px' }}>
                <strong>Super Admin:</strong> {superAdminApproval.approver_name || superAdminApproval.approverName}
                {superAdminApproval.approved_at && ` - ${formatDateTime(superAdminApproval.approved_at)}`}
              </div>
            ) : null}
          </div>
        </div>
        {loading ? (
          <div>Loading history...</div>
        ) : (
          <div className="history-timeline-small" style={{ marginTop: '10px' }}>
            {history.map((item, idx) => (
              <div key={idx} className="history-item-small">
                <span className="history-dot"></span>
                <span>
                  {item.action.charAt(0).toUpperCase() + item.action.slice(1)} by {item.by}
                  {item.byId && item.byId !== 'SYSTEM' && ` (${item.byId})`}
                  {' - '}
                  {formatDateTime(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}





function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requests, setRequests] = useState([]);
  const [allRequestsForHistory, setAllRequestsForHistory] = useState([]);
  const [viewMode, setViewMode] = useState('pending'); // 'all' or 'pending'
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // Hamburger menu state
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  const [userStats, setUserStats] = useState({
    activeUsers: 0
  });

  const [todaySummary, setTodaySummary] = useState({
    present: [], late: [], permission: [], absent: [], counts: { present: 0, late: 0, permission: 0, absent: 0 }
  });
  const [selectedSummaryType, setSelectedSummaryType] = useState(null);

  const loadTodaySummary = React.useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const summary = await dataService.getTodayAttendanceSummary(today);
    setTodaySummary(summary);
  }, []);

  // Drill-down states for Employee List
  const [selectedDeptForView, setSelectedDeptForView] = useState(null);
  const [selectedEmployeeForView, setSelectedEmployeeForView] = useState(null);

  // --- Settings State (Ported from HRDashboard) ---
  const [settingsView, setSettingsView] = useState(null);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [departmentsStatus, setDepartmentsStatus] = useState([]);

  // User Management
  const [newUser, setNewUser] = useState({ name: '', email: '', id: '', password: '', department: '', role: 'employee', designation: '', managerId: '', phone: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserMessage, setAddUserMessage] = useState({ type: '', text: '' });
  const [deactivateMessage, setDeactivateMessage] = useState(null);
  const [selectedDeactivateDept, setSelectedDeactivateDept] = useState('');
  const [selectedUserForDeactivate, setSelectedUserForDeactivate] = useState('');

  // Department Management
  const [newDepartment, setNewDepartment] = useState({ id: '', name: '', description: '', head: '' });
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [addDeptMessage, setAddDeptMessage] = useState({ type: '', text: '' });

  // Holiday Management
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ name: '', fromDate: '', toDate: '', type: 'public', days: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRequests();
    loadAllRequestsForHistory();
    checkForNewNotifications();
    loadDepartments(); // Load departments for settings
    loadTodaySummary(); // Load today's attendance summary

    const calculateStats = async () => {
      await calculateUserStats(); // Calculate user statistics
    };
    calculateStats();

    const interval = setInterval(() => {
      checkForNewNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, [viewMode]); // Reload when viewMode changes

  const loadDepartments = async () => {
    await dataService.fetchAllEmployeesFromDB(); // Ensure we have latest employees (including DI series)
    const depts = await dataService.getAllDepartments();
    setDepartmentsList(depts || []);
    await calculateUserStats();
  };

  const calculateUserStats = async () => {
    try {
      // Use the new API method for getting statistics
      const stats = await dataService.getTodayAttendanceStats();
      setUserStats({
        activeUsers: stats.activeUsers
      });
    } catch (error) {
      console.error('Error calculating user stats:', error);
      // Set default values on error
      setUserStats({
        activeUsers: 0
      });
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('[data-menu-container]')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const loadAllRequestsForHistory = async () => {
    const allRequests = await dataService.getAllRequests();
    setAllRequestsForHistory(allRequests);
  };

  const loadRequests = async () => {
    // Super Admin can see:
    // 1. Requests pending for their approval (including HR requests when HR is on leave)
    const superAdminRequests = await dataService.getRequestsBySuperAdmin();

    // 2. All requests for Total Leave Requests view
    const allRequests = await dataService.getAllRequests();

    // Calculate local today string
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Set requests based on view mode
    if (viewMode === 'all') {
      setRequests(allRequests);
    } else if (viewMode === 'today') {
      setRequests(allRequests); // Show all requests instead of just today's
    } else {
      setRequests(superAdminRequests); // 'pending'
    }

    setStats({
      pending: superAdminRequests.length,
      approved: allRequests.filter(r => r.status === 'approved').length,
      rejected: allRequests.filter(r => r.status === 'rejected').length,
      total: allRequests.length // Count all requests
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

  const handleAction = async (requestId, action, reason) => {
    if (action === 'approve') {
      await dataService.approveRequest(requestId, 'superadmin', user.id);
    } else if (action === 'reject') {
      const finalReason = (reason && reason.trim()) || prompt('Please provide a reason for rejection:');
      if (finalReason) {
        await dataService.rejectRequest(requestId, 'superadmin', user.id, finalReason.trim());
      }
    }
    await loadRequests();
    if (selectedRequest && selectedRequest.id === requestId) {
      const allRequests = await dataService.getAllRequests();
      setSelectedRequest(allRequests.find(r => r.id === requestId));
    }
  };

  const handleViewHistory = (requestId) => {
    const request = requests.find(r => r.id === requestId);
    setSelectedRequest(request);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
            </div>
            <span style={{ background: 'linear-gradient(90deg, #1e293b, #334155)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Durkkas ERP</span>
          </h2>
        </div>

        {/* NAVIGATION */}
        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
          <SidebarItem active={activeTab === 'home'} label="Home" onClick={() => { setActiveTab('home'); setViewMode('pending'); setMobileMenuOpen(false); }} color="blue" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>} />

          <SidebarItem active={activeTab === 'leave'} label="Leave Management" onClick={() => { setActiveTab('leave'); setViewMode('pending'); setMobileMenuOpen(false); }} color="indigo" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" /></svg>} />

          <SidebarItem active={activeTab === 'users'} label="User Management" onClick={() => { setActiveTab('users'); setSettingsView(null); setMobileMenuOpen(false); }} color="fuchsia" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} />

          <SidebarItem active={activeTab === 'holiday'} label="Holiday Settings" onClick={() => { setActiveTab('holiday'); setMobileMenuOpen(false); }} color="cyan" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />

          <SidebarItem active={activeTab === 'directory'} label="Employee Directory" onClick={() => { setActiveTab('directory'); setMobileMenuOpen(false); }} color="emerald" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} />

          <SidebarItem active={activeTab === 'reports'} label="Reports" onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }} color="purple" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 10a1 1 0 011-1h4a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V10zM8 4a1 1 0 011-1h4a1 1 0 011 1v16a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM14 7a1 1 0 011-1h4a1 1 0 011 1v13a1 1 0 01-1 1h-4a1 1 0 01-1-1V7z" /></svg>} />

          <SidebarItem active={activeTab === 'time-management'} label="Time Management" onClick={() => { setActiveTab('time-management'); setMobileMenuOpen(false); }} color="teal" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>} />
        </div>

        {/* LOGOUT */}
        <div style={{ marginTop: 'auto', padding: '24px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', color: '#64748b' }}>
              SA
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Super Admin</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Administrator</div>
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
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', letterSpacing: '-1px', marginBottom: '8px' }}>
                  {activeTab === 'home' ? 'Dashboard Overview' : activeTab === 'leave' ? 'Leave Management' : activeTab === 'time-management' ? 'Time Management' : activeTab === 'users' ? 'User Management' : activeTab === 'holiday' ? 'Holiday Settings' : activeTab === 'directory' ? 'Employee Directory' : 'Reports & Analytics'}
                </h1>
                <p style={{ fontSize: '16px', color: '#64748b', margin: 0 }}>
                  {activeTab === 'home' ? 'Real-time overview of organization members and statistics' : activeTab === 'leave' ? 'Manage leave requests and approvals' : activeTab === 'time-management' ? 'Track company-wide attendance and working hours' : activeTab === 'users' ? 'Manage system users and roles' : activeTab === 'holiday' ? 'Configure company holidays' : activeTab === 'directory' ? 'Manage departments and employee records' : 'Generate and view detailed reports'}
                </p>
              </div>
              {activeTab === 'home' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px 16px', background: '#f1f5f9', borderRadius: '8px', fontSize: '14px', color: '#64748b' }}>
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                  <button
                    onClick={calculateUserStats}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'home' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              {/* STATUS CARDS GRID */}
              <div className="stats-grid-4" style={{ marginBottom: '32px' }}>
                {/* Present Card */}
                <div
                  onClick={() => setSelectedSummaryType(selectedSummaryType === 'present' ? null : 'present')}
                  style={{
                    background: 'white', borderRadius: '20px', padding: '24px', cursor: 'pointer',
                    border: `2px solid ${selectedSummaryType === 'present' ? '#10b981' : '#f1f5f9'}`,
                    boxShadow: selectedSummaryType === 'present' ? '0 10px 20px rgba(16, 185, 129, 0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#ecfdf5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '24px' }}>✅</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981' }}>{todaySummary.counts.present}</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Present</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>On Time (&lt;= 9:00 AM)</div>
                </div>

                {/* Late Card */}
                <div
                  onClick={() => setSelectedSummaryType(selectedSummaryType === 'late' ? null : 'late')}
                  style={{
                    background: 'white', borderRadius: '20px', padding: '24px', cursor: 'pointer',
                    border: `2px solid ${selectedSummaryType === 'late' ? '#ef4444' : '#f1f5f9'}`,
                    boxShadow: selectedSummaryType === 'late' ? '0 10px 20px rgba(239, 68, 68, 0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#fee2e2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '24px' }}>⏰</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444' }}>{todaySummary.counts.late}</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Late Comers</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Check-in &gt;= 9:01 AM</div>
                </div>

                {/* Permission Card */}
                <div
                  onClick={() => setSelectedSummaryType(selectedSummaryType === 'permission' ? null : 'permission')}
                  style={{
                    background: 'white', borderRadius: '20px', padding: '24px', cursor: 'pointer',
                    border: `2px solid ${selectedSummaryType === 'permission' ? '#3b82f6' : '#f1f5f9'}`,
                    boxShadow: selectedSummaryType === 'permission' ? '0 10px 20px rgba(59, 130, 246, 0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#dbeafe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '24px' }}>🕐</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#3b82f6' }}>{todaySummary.counts.permission}</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Permission</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Approved Personal Time</div>
                </div>

                {/* Absent Card */}
                <div
                  onClick={() => setSelectedSummaryType(selectedSummaryType === 'absent' ? null : 'absent')}
                  style={{
                    background: 'white', borderRadius: '20px', padding: '24px', cursor: 'pointer',
                    border: `2px solid ${selectedSummaryType === 'absent' ? '#64748b' : '#f1f5f9'}`,
                    boxShadow: selectedSummaryType === 'absent' ? '0 10px 20px rgba(100, 116, 139, 0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '24px' }}>🚫</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#64748b' }}>{todaySummary.counts.absent}</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Absent</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Leave or Not Joined</div>
                </div>
              </div>

              {/* DETAILED CATEGORY LIST */}
              {selectedSummaryType && (
                <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '40px', animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
                      {selectedSummaryType.charAt(0).toUpperCase() + selectedSummaryType.slice(1)} Employees
                    </h3>
                    <button
                      onClick={() => setSelectedSummaryType(null)}
                      style={{ background: '#f1f5f9', border: 'none', padding: '8px 12px', borderRadius: '8px', color: '#64748b', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Close List
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>EMPLOYEE</th>
                          <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>DEPARTMENT</th>
                          <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{selectedSummaryType === 'present' || selectedSummaryType === 'late' ? 'CHECK-IN TIME' : 'REASON'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todaySummary[selectedSummaryType].length > 0 ? todaySummary[selectedSummaryType].map((emp) => (
                          <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#4f46e5' }}>
                                  {emp.name.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{emp.name}</div>
                                  <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.id}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '16px', color: '#475569' }}>{emp.department}</td>
                            <td style={{ padding: '16px' }}>
                              {selectedSummaryType === 'present' || selectedSummaryType === 'late' ? (
                                <span style={{ padding: '4px 10px', borderRadius: '6px', background: selectedSummaryType === 'present' ? '#d1fae5' : '#fee2e2', color: selectedSummaryType === 'present' ? '#059669' : '#dc2626', fontWeight: '700', fontSize: '13px' }}>
                                  {emp.checkIn}
                                </span>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '14px' }}>{emp.reason}</span>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                              No {selectedSummaryType} employees recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="stats-grid-4" style={{ marginBottom: '32px' }}>
              <div
                className={`stat-card ${activeTab === 'leave' && viewMode === 'today' ? 'active' : ''}`}
                onClick={() => { setViewMode('today'); }}
                style={{
                  cursor: 'pointer',
                  background: viewMode === 'today' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                  color: viewMode === 'today' ? 'white' : '#1e293b',
                  boxShadow: viewMode === 'today' ? '0 12px 24px rgba(37, 99, 235, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
                  border: viewMode === 'today' ? 'none' : '1px solid #e2e8f0',
                  transition: 'all 0.3s',
                  transform: viewMode === 'today' ? 'translateY(-4px)' : 'translateY(0)',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '140px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: viewMode === 'today' ? 'rgba(255,255,255,0.2)' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'today' ? 'white' : '#2563eb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800' }}>{stats.total}</div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', opacity: viewMode === 'today' ? 0.9 : 0.7 }}>Today Leave Requests</div>
              </div>

              <div
                className={`stat-card ${activeTab === 'leave' && viewMode === 'pending' ? 'active' : ''}`}
                onClick={() => { setViewMode('pending'); }}
                style={{
                  cursor: 'pointer',
                  background: viewMode === 'pending' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                  color: viewMode === 'pending' ? 'white' : '#1e293b',
                  boxShadow: viewMode === 'pending' ? '0 12px 24px rgba(37, 99, 235, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
                  border: viewMode === 'pending' ? 'none' : '1px solid #e2e8f0',
                  transition: 'all 0.3s',
                  transform: viewMode === 'pending' ? 'translateY(-4px)' : 'translateY(0)',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '140px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: viewMode === 'pending' ? 'rgba(255,255,255,0.2)' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'pending' ? 'white' : '#d97706'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800' }}>{stats.pending}</div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', opacity: viewMode === 'pending' ? 0.9 : 0.7 }}>Pending Approvals</div>
              </div>

              <div
                className={`stat-card ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
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
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: activeTab === 'reports' ? 'rgba(255,255,255,0.2)' : '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'reports' ? 'white' : '#0ea5e9'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800' }}>View</div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', opacity: activeTab === 'reports' ? 0.9 : 0.7 }}>Reports & Analytics</div>
              </div>

              <div
                className={`stat-card ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => { setActiveTab('history'); loadAllRequestsForHistory(); }}
                style={{
                  cursor: 'pointer',
                  background: activeTab === 'history' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                  color: activeTab === 'history' ? 'white' : '#1e293b',
                  boxShadow: activeTab === 'history' ? '0 12px 24px rgba(37, 99, 235, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
                  border: activeTab === 'history' ? 'none' : '1px solid #e2e8f0',
                  transition: 'all 0.3s',
                  transform: activeTab === 'history' ? 'translateY(-4px)' : 'translateY(0)',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '140px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: activeTab === 'history' ? 'rgba(255,255,255,0.2)' : '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'history' ? 'white' : '#8b5cf6'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"></path><circle cx="12" cy="12" r="10"></circle><path d="M16 2v4"></path><path d="M8 2v4"></path><line x1="4" y1="10" x2="20" y2="10"></line></svg>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800' }}>{stats.approved + stats.rejected}</div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', opacity: activeTab === 'history' ? 0.9 : 0.7 }}>Approval History</div>
              </div>
            </div>
          )}

          <div className="card">
            {activeTab === 'leave' && (

              <div>
                <div style={{ marginBottom: '20px', display: 'none' }}>
                  {/* Filter Tabs Hidden - Navigation via Stats Cards */}
                </div>
                <RequestList
                  requests={requests}
                  userRole="superadmin"
                  onAction={handleAction}
                  onViewHistory={handleViewHistory}
                  itemsPerPage={viewMode === 'all' ? 4 : 10}
                  hideRequestId={viewMode === 'all'}
                />
                {selectedRequest && (
                  <div className="approval-history-modal">
                    <div className="modal-content">
                      <div className="modal-header">
                        <h3>Approval History - {selectedRequest.id}</h3>
                        <button onClick={() => setSelectedRequest(null)} className="close-btn">×</button>
                      </div>
                      <div className="history-timeline">
                        {selectedRequest.history ? (
                          selectedRequest.history.map((item, index) => (
                            <div key={index} className="history-item">
                              <div className="history-icon">
                                {item.action === 'created' && '📝'}
                                {item.action === 'approved' && '✅'}
                                {item.action === 'rejected' && '❌'}
                              </div>
                              <div className="history-content">
                                <div className="history-action">
                                  <strong>{item.action.charAt(0).toUpperCase() + item.action.slice(1)}</strong> by {item.by}
                                </div>
                                <div className="history-time">{formatDateTime(item.timestamp)}</div>
                                {item.reason && (
                                  <div className="history-reason">Reason: {item.reason}</div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div>Loading history...</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="approval-history-view">
                <h3>Complete Approval History</h3>
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  View which manager or HR approved each employee leave request
                </p>
                <div className="history-list">
                  {allRequestsForHistory.length === 0 ? (
                    <div>Loading history...</div>
                  ) : (
                    allRequestsForHistory.map(request => {
                      const empName = request.employee_name || request.employeeName;
                      const empId = request.employee_id || request.employeeId;
                      const reqType = request.type;
                      const reqStatus = request.status;

                      return (
                        <HistoryCard
                          key={request.id}
                          request={request}
                          empName={empName}
                          empId={empId}
                          reqType={reqType}
                          reqStatus={reqStatus}
                          formatDateTime={formatDateTime}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <Reports
                user={user}
                scope="organization"
                showAll={true}
              />
            )}

            {activeTab === 'directory' && (
              <div className="departments-status" style={{ paddingBottom: '100px' }}>
                <div className="departments-accordion-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>

                  {/* Search & Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Employee Directory</h3>
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

            {activeTab === 'users' && (
              <div className="system-management" style={{ padding: '0', paddingBottom: '100px' }}>
                <h2 style={{ marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '16px' }}>System Management & Settings</h2>

                {/* MAIN SETTINGS MENU (Cards) */}
                {settingsView === null && (
                  <div className="quick-actions-grid" style={{ maxWidth: '100% ' }}>

                    {/* 1. Add User Card */}
                    <div onClick={() => setSettingsView('addUser')} className="interactive-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                    >
                      <div className="icon-wrapper" style={{ fontSize: '24px', background: '#e0e7ff', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', color: '#1e293b', fontSize: '18px' }}>Add User</h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Create new employee accounts</p>
                      </div>
                    </div>

                    {/* 2. Edit User Details Card */}
                    <div onClick={() => setSettingsView('editUser')} className="interactive-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                    >
                      <div className="icon-wrapper" style={{ fontSize: '24px', background: '#dbeafe', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</div>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', color: '#1e293b', fontSize: '18px' }}>Edit User Details</h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Update employee information</p>
                      </div>
                    </div>

                    {/* 3. Deactivate User Card */}
                    <div onClick={() => setSettingsView('deactivate')} className="interactive-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                    >
                      <div className="icon-wrapper" style={{ fontSize: '24px', background: '#fee2e2', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚫</div>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', color: '#1e293b', fontSize: '18px' }}>Deactivate User</h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Disable access for former employees</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1. Add User Form */}
                {settingsView === 'addUser' && (
                  <div id="add-user-section" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    <button onClick={() => setSettingsView(null)} style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                      ← Back to Menu
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                      <span style={{ fontSize: '28px', background: '#e0e7ff', padding: '10px', borderRadius: '12px' }}>👤</span>
                      <h3 style={{ margin: 0, fontSize: '22px' }}>Create New User</h3>
                    </div>

                    {addUserMessage.text && (
                      <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '8px', background: addUserMessage.type === 'success' ? '#dcfce7' : '#fee2e2', color: addUserMessage.type === 'success' ? '#166534' : '#991b1b', fontWeight: '500' }}>
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
                          setNewUser({ name: '', email: '', id: '', password: '', department: '', role: 'employee', designation: '', managerId: '' });
                        }
                      } catch (error) {
                        setAddUserMessage({ type: 'error', text: error.message });
                      } finally {
                        setIsAddingUser(false);
                      }
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Name</label>
                          <input placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Employee ID</label>
                          <input autoComplete="off" placeholder="e.g. EMP100" value={newUser.id} onChange={e => setNewUser({ ...newUser, id: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
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
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Phone Number</label>
                          <input autoComplete="tel" placeholder="e.g. 9876543210" type="tel" value={newUser.phone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setNewUser({ ...newUser, phone: val }); }} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
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
                  <div id="edit-user-section" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
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
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Email</label>
                            <input autoComplete="off" placeholder="Email Address" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Phone Number</label>
                            <input autoComplete="tel" placeholder="e.g. 9876543210" type="tel" value={newUser.phone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setNewUser({ ...newUser, phone: val }); }} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
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
                  <div id="deactivate-section" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
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
                      <div style={{ border: '1px solid #eee', borderRadius: '8px', overflowX: 'auto' }}>
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
                            {dataService.getAllEmployees().filter(e => e.department === selectedDeactivateDept).length === 0 && (
                              <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No employees found in this department.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {activeTab === 'time-management' && (
              <AttendanceManagement
                currentUser={{ ...user, role: 'superadmin' }}
                permissions={{ viewAttendance: true, editAttendance: true, manualAttendance: true, exportReports: true }}
                onSaveSuccess={loadTodaySummary}
              />
            )}

            {activeTab === 'holiday' && (
              <div className="holiday-management" style={{ padding: '0', paddingBottom: '100px' }}>
                <div id="holiday-section" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '28px', background: '#fff7ed', padding: '10px', borderRadius: '12px' }}>📅</span>
                    <h3 style={{ margin: '0', fontSize: '22px' }}>Holiday Management</h3>
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
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Holiday Name</label>
                      <input type="text" required placeholder="e.g. Christmas" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9fafb' }} />
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
            )}
          </div>
        </div >
      </div >
    </div >
  );
}

export default SuperAdminDashboard;
