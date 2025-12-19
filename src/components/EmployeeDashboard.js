import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../utils/dataService';
import RequestForm from './RequestForm';
import RequestList from './RequestList';
import LeaveCalendar from './LeaveCalendar';
import Reports from './Reports';
import './EmployeeDashboard.css';

function EmployeeDashboard() {
    const { user, logout } = useAuth();
    const [activeMenu, setActiveMenu] = useState('request-form');
    const [view, setView] = useState('welcome');
    const [requests, setRequests] = useState([]);
    const [newApprovedCount, setNewApprovedCount] = useState(0);
    const [companyHolidays, setCompanyHolidays] = useState([]);
    const [holidayAnnouncement, setHolidayAnnouncement] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (user?.id) {
            loadRequests();
            loadHolidays();
            checkAnnouncements();
        }
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const checkAnnouncements = async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const announcement = await dataService.getAnnouncementForDate(tomorrowStr);
        if (announcement) {
            setHolidayAnnouncement(announcement);
        }
    };


    const loadHolidays = async () => {
        try {
            const holidays = await dataService.fetchHolidays();
            setCompanyHolidays(holidays || []);
        } catch (error) {
            console.error('Error loading holidays:', error);
            setCompanyHolidays([]);
        }
    };

    const loadRequests = async () => {
        const userRequests = await dataService.getRequestsByEmployee(user.id);

        // Ensure userRequests is an array
        const requestsArray = Array.isArray(userRequests) ? userRequests : [];

        setRequests(requestsArray);

        // Calculate new approved requests
        const lastViewedTime = localStorage.getItem(`lastViewedApproved_${user.id}`);
        const approvedRequests = requestsArray.filter(r => r.status === 'approved');

        if (lastViewedTime) {
            // Count requests approved after last viewed time
            const newApprovals = approvedRequests.filter(r => {
                const approvalTime = r.managerApproval?.approved_at || r.hrApproval?.approved_at || r.superAdminApproval?.approved_at;
                return approvalTime && new Date(approvalTime) > new Date(lastViewedTime);
            });
            setNewApprovedCount(newApprovals.length);
        } else {
            // First time - show all approved as new
            setNewApprovedCount(approvedRequests.length);
        }
    };

    const handleApprovedClick = async () => {
        // Mark all as viewed
        localStorage.setItem(`lastViewedApproved_${user.id}`, new Date().toISOString());
        setNewApprovedCount(0);
        setActiveMenu('approved');
        await loadRequests(); // Reload to ensure fresh data
    };

    const handleRequestSubmitted = () => {
        loadRequests();
        setActiveMenu('request-form');
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
                <div style={{ padding: '32px 24px', borderBottom: '1px solid #f1f5f9' }}>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                        </div>
                        <span style={{ background: 'linear-gradient(90deg, #1e293b, #334155)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Durkkas ERP</span>
                    </h2>
                </div>
                <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                    <div style={{ textTransform: 'uppercase', color: '#94a3b8', fontSize: '11px', fontWeight: '700', marginBottom: '16px', letterSpacing: '0.5px' }}>Main Menu</div>
                    <button onClick={() => { setView('welcome'); setMobileMenuOpen(false); }} style={{
                        width: '100%', padding: '14px 16px', textAlign: 'left',
                        background: view === 'welcome' ? '#eff6ff' : 'transparent',
                        color: view === 'welcome' ? '#2563eb' : '#475569',
                        border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                        display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s ease', marginBottom: '8px'
                    }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        </div>
                        Home
                    </button>
                    <button onClick={() => { setView('leave-management'); setMobileMenuOpen(false); }} style={{
                        width: '100%', padding: '14px 16px', textAlign: 'left',
                        background: view === 'leave-management' ? '#eff6ff' : 'transparent',
                        color: view === 'leave-management' ? '#2563eb' : '#475569',
                        border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                        display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s ease',
                        boxShadow: view === 'leave-management' ? '0 4px 12px rgba(37, 99, 235, 0.1)' : 'none'
                    }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        Leave Management
                    </button>
                    <button onClick={() => { setView('reports'); setMobileMenuOpen(false); }} style={{
                        width: '100%', padding: '14px 16px', textAlign: 'left',
                        background: view === 'reports' ? '#eff6ff' : 'transparent',
                        color: view === 'reports' ? '#2563eb' : '#475569',
                        border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                        display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s ease',
                        boxShadow: view === 'reports' ? '0 4px 12px rgba(37, 99, 235, 0.1)' : 'none'
                    }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                        Reports
                    </button>
                </div>
                {/* User Info & Logout */}
                <div style={{ padding: '24px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>👤</div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Employee</div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            borderRadius: '8px',
                            color: '#ef4444',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fee2e2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Sign Out
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="main-content">
                <div className="dashboard-header-new" style={{ margin: 0, borderRadius: 0, position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #e2e8f0' }}>
                    <div className="header-left">
                        <h1 className="dashboard-title">Welcome, {user.name}</h1>
                        <p className="dashboard-subtitle">Employee Dashboard</p>
                    </div>

                </div>

                <div className="dashboard-content-wrapper">
                    {view === 'leave-management' ? (
                        <>

                            {/* Blinking Leave Message Notification */}
                            {(() => {
                                const latestApproved = [...requests]
                                    .filter(r => r.status === 'approved')
                                    .sort((a, b) => {
                                        const getLatestUpdate = (req) => {
                                            const times = [
                                                req.superAdminApproval?.approved_at || req.superAdminApproval?.approvedAt || 0,
                                                req.hrApproval?.approved_at || req.hrApproval?.approvedAt || 0,
                                                req.managerApproval?.approved_at || req.managerApproval?.approvedAt || 0,
                                                req.updated_at || 0
                                            ];
                                            return new Date(times.sort().reverse()[0]);
                                        };
                                        return getLatestUpdate(b) - getLatestUpdate(a);
                                    })[0];

                                if (!latestApproved || newApprovedCount === 0) return null;

                                let approverName = 'Approver';
                                if (latestApproved.superAdminApproval?.status === 'approved') {
                                    approverName = latestApproved.superAdminApproval.approver_name || latestApproved.superAdminApproval.approverName || 'Super Admin';
                                } else if (latestApproved.hrApproval?.status === 'approved') {
                                    approverName = latestApproved.hrApproval.approver_name || latestApproved.hrApproval.approverName || 'HR';
                                } else if (latestApproved.managerApproval?.status === 'approved') {
                                    approverName = latestApproved.managerApproval.approver_name || latestApproved.managerApproval.approverName || 'Manager';
                                }

                                return (
                                    <div style={{
                                        margin: '20px',
                                        padding: '16px 24px',
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        borderRadius: '12px',
                                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        animation: 'blink 1.5s ease-in-out infinite',
                                        border: '2px solid #34d399'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <span style={{ fontSize: '32px', animation: 'bounce 1s ease-in-out infinite' }}>✅</span>
                                            <div>
                                                <h3 style={{
                                                    margin: 0,
                                                    color: 'white',
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}>
                                                    {latestApproved.type === 'od' ? '🎉 New OD Approval!' : '🎉 New Leave Approval!'}
                                                </h3>
                                                <p style={{
                                                    margin: '4px 0 0 0',
                                                    color: '#d1fae5',
                                                    fontSize: '14px'
                                                }}>
                                                    {latestApproved.type === 'od'
                                                        ? `Your OD (${latestApproved.startDate || latestApproved.start_date}) request has been approved by ${approverName}.`
                                                        : `Your leave (${latestApproved.startDate || latestApproved.start_date}) request has been approved by ${approverName}.`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleApprovedClick}
                                            style={{
                                                background: 'white',
                                                color: '#059669',
                                                border: 'none',
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                border: 'none',
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                                transition: 'all 0.3s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                                            }}
                                        >
                                            View Now →
                                        </button>
                                    </div>
                                );
                            })()}

                            {/* Holiday Announcement Banner */}
                            {holidayAnnouncement && (
                                <div style={{
                                    margin: '20px',
                                    padding: '24px',
                                    background: 'linear-gradient(90deg, #FF512F 0%, #DD2476 100%)',
                                    borderRadius: '16px',
                                    color: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    boxShadow: '0 10px 25px rgba(221, 36, 118, 0.4)',
                                    animation: 'pulse 2s infinite',
                                    border: '4px solid rgba(255,255,255,0.3)'
                                }}>
                                    <h2 style={{
                                        margin: '0 0 8px 0',
                                        fontSize: '28px',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}>
                                        ✨ Tomorrow is Holiday! ✨
                                    </h2>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: '500' }}>
                                        {holidayAnnouncement.message}
                                    </p>
                                </div>
                            )}

                            {/* 4 Interactive Stat Cards */}
                            <div className="stats-cards" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '20px',
                                padding: '0 20px',
                                marginBottom: '30px'
                            }}>
                                {/* Card 1: Leave/Permission Request */}
                                <div
                                    className={`dashboard-tab ${activeMenu === 'request-form' ? 'active' : ''}`}
                                    onClick={() => setActiveMenu('request-form')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', flexDirection: 'column' }}>
                                        <div className="rotating-icon" style={{
                                            width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                                            boxShadow: '0 8px 16px rgba(245, 158, 11, 0.3)'
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Leave / Permission</h3>
                                    </div>
                                    {/* Count removed as requested */}
                                    <div style={{ fontSize: '13px', opacity: 0.9, textAlign: 'center' }}>Click to submit new request</div>
                                </div>

                                {/* Card 2: Approved Requests */}
                                <div
                                    className={`dashboard-tab ${activeMenu === 'approved' ? 'active' : ''}`}
                                    onClick={handleApprovedClick}
                                >
                                    {/* Notification Badge - Only shows NEW approvals */}
                                    {newApprovedCount > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            right: '-8px',
                                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                            color: 'white',
                                            borderRadius: '50%',
                                            minWidth: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            border: '3px solid white',
                                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                                            animation: 'pulse 2s ease-in-out infinite',
                                            zIndex: 10
                                        }}>
                                            {newApprovedCount}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Approved Requests</h3>
                                        <div className="rotating-icon" style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '8px' }}>
                                        {requests.filter(r => r.status === 'approved').length}
                                    </div>
                                    <div style={{ fontSize: '13px', opacity: 0.9 }}>Click to view approved details</div>
                                </div>

                                {/* Card 3: Rejected Requests */}
                                <div
                                    className={`dashboard-tab ${activeMenu === 'rejected' ? 'active' : ''}`}
                                    onClick={async () => {
                                        setActiveMenu('rejected');
                                        await loadRequests(); // Reload to ensure fresh data
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Rejected Requests</h3>
                                        <div className="rotating-icon" style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '8px' }}>
                                        {requests.filter(r => r.status === 'rejected').length}
                                    </div>
                                    <div style={{ fontSize: '13px', opacity: 0.9 }}>Click to view details and reasons</div>
                                </div>

                                {/* Card 4: Monthly Calendar */}
                                <div
                                    className={`dashboard-tab ${activeMenu === 'calendar' ? 'active' : ''}`}
                                    onClick={() => setActiveMenu('calendar')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Monthly Calendar</h3>
                                        <div className="rotating-icon" style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </div>
                                    <div style={{ fontSize: '13px', opacity: 0.9 }}>Click to view leave calendar</div>
                                </div>
                            </div>

                            {/* Content Area based on selected card */}
                            <div className="dashboard-content">
                                {(activeMenu === 'request-form' || activeMenu === 'leave-request') && (
                                    <div className="card">
                                        <div className="card-header">
                                            <h2 className="card-title">🏖️ Leave Request Form</h2>
                                            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                                                Submit your leave request with all required details
                                            </p>
                                        </div>
                                        <RequestForm user={user} onRequestSubmitted={handleRequestSubmitted} requestType="leave" />
                                    </div>
                                )}

                                {activeMenu === 'permission-request' && (
                                    <div className="card">
                                        <div className="card-header">
                                            <h2 className="card-title">⏰ Permission Request Form</h2>
                                            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                                                Request permission for specific time duration
                                            </p>
                                        </div>
                                        <RequestForm user={user} onRequestSubmitted={handleRequestSubmitted} requestType="permission" />
                                    </div>
                                )}

                                {activeMenu === 'approved' && (
                                    <div className="card">
                                        <div className="card-header">
                                            <h2 className="card-title">✅ Approved Requests</h2>
                                            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                                                These requests have been approved by Manager, HR, or Super Admin
                                            </p>
                                        </div>
                                        <RequestList
                                            requests={requests.filter(r => r.status === 'approved')}
                                            userRole="employee"
                                        />
                                    </div>
                                )}

                                {activeMenu === 'rejected' && (
                                    <div className="card">
                                        <div className="card-header">
                                            <h2 className="card-title">❌ Rejected Requests</h2>
                                            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                                                These requests were rejected. Check notifications for rejection reasons.
                                            </p>
                                        </div>
                                        <RequestList
                                            requests={requests.filter(r => r.status === 'rejected')}
                                            userRole="employee"
                                        />
                                    </div>
                                )}

                                {activeMenu === 'calendar' && (
                                    <div className="card">
                                        <div className="card-header">
                                            <h2 className="card-title">📅 Monthly Leave Calendar</h2>
                                            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                                                View your leave schedule for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>

                                        {/* Company Holidays Section */}
                                        <div style={{ marginBottom: '24px', padding: '16px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #d1fae5' }}>
                                            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#047857', display: 'flex', alignItems: 'center' }}>
                                                <span style={{ marginRight: '8px' }}>🎉</span> Company Holidays
                                            </h3>
                                            {companyHolidays.length === 0 ? (
                                                <p style={{ fontSize: '14px', color: '#6b7280', fontStyle: 'italic', margin: 0 }}>No holidays posted yet.</p>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                                    {companyHolidays.map(h => (
                                                        <div key={h.id} style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '13px' }}>
                                                            <div style={{ fontWeight: 'bold', color: '#059669', marginBottom: '2px' }}>{h.name}</div>
                                                            <div style={{ color: '#4b5563' }}>{h.fromDate} {h.fromDate !== h.toDate && `- ${h.toDate}`}</div>
                                                            <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', background: '#d1fae5', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>{h.type}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <LeaveCalendar user={user} />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : view === 'reports' ? (
                        <div style={{ padding: '32px' }}>
                            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>My Leave History</h3>
                                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b' }}>View all your approved leaves and permissions with dates and reasons.</p>
                            </div>

                            {/* Simple Leave List */}
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                {requests.filter(r => r.status === 'approved').length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                                        <p>No approved leaves or permissions yet.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {requests
                                            .filter(r => r.status === 'approved')
                                            .sort((a, b) => new Date(b.start_date || b.startDate) - new Date(a.start_date || a.startDate))
                                            .map((req, index) => {
                                                const startDate = req.start_date || req.startDate;
                                                const endDate = req.end_date || req.endDate;
                                                const reason = req.reason || 'No reason provided';
                                                const type = req.type === 'leave' ? 'Leave' : 'Permission';

                                                // Format date as "DEC-16"
                                                const formatDate = (dateStr) => {
                                                    const date = new Date(dateStr);
                                                    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                                                    return `${months[date.getMonth()]}-${String(date.getDate()).padStart(2, '0')}`;
                                                };

                                                const dateRange = startDate === endDate
                                                    ? formatDate(startDate)
                                                    : `${formatDate(startDate)} to ${formatDate(endDate)}`;

                                                return (
                                                    <div key={index} style={{
                                                        background: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '12px',
                                                        padding: '20px',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                        transition: 'all 0.2s',
                                                        cursor: 'default'
                                                    }}
                                                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                                            <div style={{
                                                                width: '48px',
                                                                height: '48px',
                                                                borderRadius: '12px',
                                                                background: type === 'Leave' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0,
                                                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                                                            }}>
                                                                <span style={{ fontSize: '24px' }}>{type === 'Leave' ? '🏖️' : '⏰'}</span>
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{dateRange}</h4>
                                                                    <span style={{
                                                                        padding: '4px 12px',
                                                                        borderRadius: '6px',
                                                                        fontSize: '12px',
                                                                        fontWeight: '600',
                                                                        background: type === 'Leave' ? '#dbeafe' : '#d1fae5',
                                                                        color: type === 'Leave' ? '#1e40af' : '#065f46'
                                                                    }}>{type}</span>
                                                                </div>
                                                                <p style={{ margin: '0', fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                                                                    <strong style={{ color: '#475569' }}>Reason:</strong> {reason}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', color: '#64748b' }}>
                            <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.5 }}>👋</div>
                            <h2 style={{ fontSize: '28px', color: '#1e293b', marginBottom: '12px' }}>Welcome to your Dashboard</h2>
                            <p style={{ fontSize: '16px', maxWidth: '400px', lineHeight: '1.6' }}>Select <strong>Leave Management</strong> from the sidebar to view your leave stats, apply for leave, or check your approval status.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EmployeeDashboard;
