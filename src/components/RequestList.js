import React, { useState, useEffect } from 'react';
import { dataService } from '../utils/dataService';
import './RequestList.css';

function RequestList({ requests, userRole, onAction, itemsPerPage: propItemsPerPage, hideRequestId = false }) {
  // Hooks must be called at the top level, before any conditional returns
  const [employeeDetailsCache, setEmployeeDetailsCache] = useState({});
  const [showRejectFor, setShowRejectFor] = useState(null);
  const [rejectReasons, setRejectReasons] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null); // For showing full details
  const itemsPerPage = propItemsPerPage || 10; // Use prop directly, default 10
  const employees = dataService.getAllEmployees();

  useEffect(() => {
    // Pre-load employee details for all unique employee IDs
    const uniqueIds = [...new Set([
      ...requests.map(r => r.employee_id || r.employeeId),
      ...requests.map(r => r.alternative_employee_id || r.alternativeEmployeeId)
    ])].filter(Boolean);

    uniqueIds.forEach(id => {
      if (!employeeDetailsCache[id]) {
        dataService.getEmployeeByCode(id).then(emp => {
          if (emp) {
            setEmployeeDetailsCache(prev => ({ ...prev, [id]: emp }));
          }
        });
      }
    });
  }, [requests, employeeDetailsCache]);

  // Pagination calculations
  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = requests.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds or when itemsPerPage changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [requests.length, currentPage, totalPages, itemsPerPage]);

  // Reset to page 1 when itemsPerPage changes (switching between views)
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  /* Removed duplicate block */

  const getStatusBadge = (status) => {
    const statusClass = `badge badge-${status}`;
    return <span className={statusClass}>{status}</span>;
  };

  const getManagerName = (managerId) => {
    if (!managerId) return 'N/A';
    const manager = employeeDetailsCache[managerId] || employees.find(e => e.id === managerId);
    return manager ? manager.name : managerId;
  };

  // Generate page numbers to display (max 12 pages)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 12; // Show max 12 page numbers

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // If on first page or near start, show from page 1
      if (currentPage <= 6) {
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i);
        }
      }
      // If on last page or near end, show pages ending at last page
      else if (currentPage >= totalPages - 5) {
        const start = Math.max(1, totalPages - maxVisible + 1);
        for (let i = start; i <= totalPages; i++) {
          pages.push(i);
        }
      }
      // If in middle, show pages around current page
      else {
        const start = Math.max(1, currentPage - 5);
        const end = Math.min(totalPages, start + maxVisible - 1);
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  };

  if (requests.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <h3>No requests found</h3>
        <p>You don't have any requests yet.</p>
      </div>
    );
  }

  return (
    <div className="request-list">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Name</th>
              <th>Leave Date</th>
              <th>Reason</th>
              {(userRole === 'superadmin' || userRole === 'hr') && <th>Approved By</th>}
              {userRole !== 'employee' && <th>Approve/Reject</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedRequests.map(request => {
              const empId = request.employee_id || request.employeeId;
              const altEmpId = request.alternative_employee_id || request.alternativeEmployeeId;
              const employeeDetails = employeeDetailsCache[empId] || employees.find(e => e.id === empId);
              const altEmployeeDetails = employeeDetailsCache[altEmpId] || employees.find(e => e.id === altEmpId);

              return (
                <tr key={request.id} className="request-row">
                  {/* Date & Time */}
                  <td>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      {formatDateTime(request.created_at || request.createdAt)}
                    </div>
                  </td>

                  {/* Name (Clickable) */}
                  <td>
                    <div
                      onClick={() => setSelectedRequest(request)}
                      style={{
                        cursor: 'pointer',
                        color: '#667eea',
                        fontWeight: '600',
                        textDecoration: 'underline',
                        fontSize: '15px'
                      }}
                    >
                      {request.employeeName} ({request.employeeId})
                    </div>
                  </td>

                  {/* Leave Date */}
                  <td>
                    {(request.type === 'leave' || request.type === 'od') ? (
                      <div>
                        <div style={{ fontWeight: '500' }}>{formatDate(request.startDate)}</div>
                        {request.endDate !== request.startDate && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            to {formatDate(request.endDate)}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>
                          <span style={{
                            background: request.type === 'od' ? '#fef3c7' : (request.leaveMode === 'casual' ? '#ecfdf5' : '#fef2f2'),
                            color: request.type === 'od' ? '#92400e' : (request.leaveMode === 'casual' ? '#065f46' : '#991b1b'),
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            {request.type === 'od' ? 'On Duty' : (request.leaveMode === 'casual' ? 'Casual' : 'Unpaid')}
                          </span>
                        </div>
                      </div>
                    ) : request.type === 'halfday' ? (
                      <div>
                        <div style={{ fontWeight: '500' }}>{formatDate(request.startDate)}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {request.halfDaySession === 'morning' ? '🌅 Morning' : '🌇 Afternoon'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: '500' }}>{formatDate(request.startDate)}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {request.startTime ? `${request.startTime}` : '-'} → {request.endTime ? `${request.endTime}` : '-'}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Reason */}
                  <td>
                    <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#666' }} title={request.reason}>
                      {request.reason}
                    </div>
                  </td>

                  {/* Approved By */}
                  {(userRole === 'superadmin' || userRole === 'hr') && (
                    <td>
                      {(() => {
                        const hasManagerApproved = request.managerApproval || request.manager_approval;
                        const hasHrApproved = request.hrApproval || request.hr_approval;
                        const hasSuperAdminApproved = request.superAdminApproval || request.super_admin_approval;

                        const renderApproval = (label, color, bg, approvalObj) => (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ color, fontSize: '12px', fontWeight: '600', background: bg, padding: '4px 8px', borderRadius: '6px' }}>
                              {label}
                            </span>
                            {approvalObj && (approvalObj.approved_at || approvalObj.approvedAt) && (
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {formatDateTime(approvalObj.approved_at || approvalObj.approvedAt)}
                              </span>
                            )}
                          </div>
                        );

                        if (hasSuperAdminApproved && hasSuperAdminApproved.status !== 'bypassed') {
                          return renderApproval('✓ Super Admin', '#7c3aed', '#f5f3ff', hasSuperAdminApproved);
                        }
                        if (hasHrApproved && hasHrApproved.status !== 'bypassed') {
                          return renderApproval('✓ HR', '#059669', '#ecfdf5', hasHrApproved);
                        }
                        if (hasManagerApproved && hasManagerApproved.status !== 'bypassed') {
                          return renderApproval('✓ Manager', '#2563eb', '#eff6ff', hasManagerApproved);
                        }
                        return <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>;
                      })()}
                    </td>
                  )}

                  {/* Approve/Reject */}
                  {userRole !== 'employee' && (
                    <td>
                      {request.status !== 'rejected' && (
                        <>
                          {/* Show buttons if current user role hasn't approved yet */}
                          {/* Show buttons logic */}
                          {(() => {
                            // Get role from request OR fallback to employee details
                            const empId = request.employee_id || request.employeeId;
                            const empDetails = employeeDetailsCache[empId] || employees.find(e => e.id === empId);
                            const fallbackRole = empDetails ? empDetails.role : '';

                            const employeeRole = (request.role || request.employeeRole || fallbackRole || '').toLowerCase();
                            const isManagerRequest = employeeRole === 'manager';
                            const isHrRequest = employeeRole === 'hr';

                            const hasManagerApproved = request.managerApproval || request.manager_approval;
                            const hasHrApproved = request.hrApproval || request.hr_approval;
                            const hasSuperAdminApproved = request.superAdminApproval || request.super_admin_approval;

                            let showButtons = false;

                            if (userRole === 'manager') {
                              // Manager approves Employees
                              if (!hasManagerApproved) showButtons = true;
                            } else if (userRole === 'hr') {
                              // HR approves Managers
                              if (isManagerRequest && !hasHrApproved) showButtons = true;
                            } else if (userRole === 'superadmin') {
                              // Super Admin approves HR
                              if (isHrRequest && !hasSuperAdminApproved) showButtons = true;
                            }

                            if (showButtons) {
                              return (
                                <div className="action-buttons">
                                  <button
                                    className="btn btn-success"
                                    style={{ padding: '6px 12px', fontSize: '14px', marginRight: '8px' }}
                                    onClick={() => onAction && onAction(request.id, 'approve')}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    style={{ padding: '6px 12px', fontSize: '14px' }}
                                    onClick={() => setShowRejectFor(prev => (prev === request.id ? null : request.id))}
                                  >
                                    Reject
                                  </button>
                                </div>
                              );
                            } else {
                              // Status display when no buttons

                              // Helper to render Approved status with time
                              const renderApproved = (label, color, bg, approvalObj) => (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                  <span style={{ color, fontSize: '12px', fontWeight: '600', background: bg, padding: '4px 8px', borderRadius: '6px' }}>
                                    {label}
                                  </span>
                                  {approvalObj && (approvalObj.approved_at || approvalObj.approvedAt) && (
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                      {formatDateTime(approvalObj.approved_at || approvalObj.approvedAt)}
                                    </span>
                                  )}
                                </div>
                              );

                              // Super Admin Approval
                              if (hasSuperAdminApproved && hasSuperAdminApproved.status !== 'bypassed') {
                                return renderApproved('✓ Approved by Super Admin', '#7c3aed', '#f5f3ff', hasSuperAdminApproved);
                              }
                              // HR Approval
                              if (hasHrApproved && hasHrApproved.status !== 'bypassed') {
                                return renderApproved('✓ Approved by HR', '#059669', '#ecfdf5', hasHrApproved);
                              }
                              // Manager Approval
                              if (hasManagerApproved && hasManagerApproved.status !== 'bypassed') {
                                return renderApproved('✓ Approved by Manager', '#2563eb', '#eff6ff', hasManagerApproved);
                              }

                              // Pending States
                              if (isHrRequest) {
                                return (
                                  <span style={{ color: '#d97706', fontSize: '12px', fontWeight: '600', background: '#fffbeb', padding: '4px 8px', borderRadius: '6px' }}>
                                    ⏳ Pending Super Admin
                                  </span>
                                );
                              }
                              if (isManagerRequest) {
                                return (
                                  <span style={{ color: '#d97706', fontSize: '12px', fontWeight: '600', background: '#fffbeb', padding: '4px 8px', borderRadius: '6px' }}>
                                    ⏳ Pending HR
                                  </span>
                                );
                              }
                              // Regular employee pending
                              return (
                                <span style={{ color: '#d97706', fontSize: '12px', fontWeight: '600', background: '#fffbeb', padding: '4px 8px', borderRadius: '6px' }}>
                                  ⏳ Pending Manager
                                </span>
                              );
                            }
                          })()}

                          {showRejectFor === request.id && (
                            <div style={{ marginTop: '12px', background: '#fff5f5', padding: '16px', borderRadius: '12px', border: '2px solid #feb2b2' }}>
                              <label htmlFor={`reject-reason-${request.id}`} style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
                                📝 Rejection Reason (Required)
                              </label>
                              <textarea
                                id={`reject-reason-${request.id}`}
                                rows={6}
                                placeholder="Please provide a detailed reason for rejecting this request. This message will be sent to the employee as a notification."
                                value={rejectReasons[request.id] || ''}
                                onChange={(e) => setRejectReasons(prev => ({ ...prev, [request.id]: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '12px 14px',
                                  borderRadius: '10px',
                                  border: '2px solid #f5c2c7',
                                  background: '#fff',
                                  resize: 'vertical',
                                  fontSize: '14px',
                                  lineHeight: '1.5',
                                  fontFamily: 'inherit',
                                  minHeight: '140px'
                                }}
                              />
                              <div className="action-buttons" style={{ marginTop: '8px' }}>
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: '6px 12px', fontSize: '14px' }}
                                  onClick={() => {
                                    const reason = (rejectReasons[request.id] || '').trim();
                                    if (!reason) return;
                                    onAction && onAction(request.id, 'reject', reason);
                                    setShowRejectFor(null);
                                  }}
                                  disabled={!((rejectReasons[request.id] || '').trim())}
                                >
                                  Submit Rejection
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '14px' }}
                                  onClick={() => setShowRejectFor(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {request.status === 'rejected' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                          <span style={{ color: '#dc3545', fontSize: '12px', fontWeight: '600', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px' }}>
                            Rejected
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {formatDateTime(request.updated_at || request.updatedAt)}
                          </span>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Full Details Modal */}
      {selectedRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }} onClick={() => setSelectedRequest(null)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderBottom: '2px solid #f0f0f0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '16px 16px 0 0',
              flexShrink: 0
            }}>
              <h3 style={{ margin: 0, fontSize: '20px' }}>Full Request Details</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '28px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {(() => {
                const req = selectedRequest;
                const empId = req.employee_id || req.employeeId;
                const altEmpId = req.alternative_employee_id || req.alternativeEmployeeId;
                const empDetails = employeeDetailsCache[empId] || employees.find(e => e.id === empId);
                const altEmpDetails = employeeDetailsCache[altEmpId] || employees.find(e => e.id === altEmpId);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Request ID */}
                    <div>
                      <strong style={{ color: '#667eea' }}>Request ID:</strong>
                      <div style={{ marginTop: '4px', fontSize: '14px' }}>{req.id}</div>
                    </div>

                    {/* Employee Details */}
                    <div>
                      <strong style={{ color: '#667eea' }}>Employee Details:</strong>
                      <div style={{ marginTop: '8px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <div><strong>Name:</strong> {req.employeeName}</div>
                        <div><strong>ID:</strong> {req.employeeId}</div>
                        <div><strong>Email:</strong> {empDetails?.email || 'N/A'}</div>
                        <div><strong>Department:</strong> {req.department}</div>
                        <div><strong>Manager:</strong> {getManagerName(empDetails?.managerId)}</div>
                        <div><strong>Role:</strong> {empDetails?.role || 'employee'}</div>
                      </div>
                    </div>

                    {/* Request Type */}
                    <div>
                      <strong style={{ color: '#667eea' }}>Request Type:</strong>
                      <div style={{ marginTop: '4px' }}>
                        <span className="badge" style={{
                          background: req.type === 'leave' ? '#e3f2fd' : req.type === 'halfday' ? '#fff3e0' : req.type === 'od' ? '#fef3c7' : '#f3e5f5',
                          color: req.type === 'leave' ? '#1976d2' : req.type === 'halfday' ? '#f57c00' : req.type === 'od' ? '#92400e' : '#7b1fa2',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}>
                          {req.type === 'leave' ? (req.leaveMode === 'casual' ? 'Casual Leave' : 'Unpaid Leave')
                            : req.type === 'halfday' ? 'Half Day Leave'
                              : req.type === 'permission' ? 'Permission'
                                : req.type === 'od' ? 'On Duty (OD)'
                                  : req.type}
                        </span>
                      </div>
                    </div>

                    {/* Leave Date/Time */}
                    <div>
                      <strong style={{ color: '#667eea' }}>Leave Date/Time:</strong>
                      <div style={{ marginTop: '8px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                        {(req.type === 'leave' || req.type === 'od') ? (
                          <div>
                            <div><strong>Start:</strong> {formatDate(req.startDate)}</div>
                            {req.endDate !== req.startDate && (
                              <div><strong>End:</strong> {formatDate(req.endDate)}</div>
                            )}
                          </div>
                        ) : req.type === 'halfday' ? (
                          <div>
                            <div><strong>Date:</strong> {formatDate(req.startDate)}</div>
                            <div><strong>Session:</strong> {req.halfDaySession === 'morning' ? '🌅 Morning (9:00 AM - 1:00 PM)' : '🌇 Afternoon (1:00 PM - 6:00 PM)'}</div>
                            {req.startTime && req.endTime && (
                              <div><strong>Time:</strong> {req.startTime} - {req.endTime}</div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div><strong>Date:</strong> {formatDate(req.startDate)}</div>
                            <div><strong>Time:</strong> {req.startTime || '-'} → {req.endTime || '-'}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Alternative Employee */}
                    {req.alternativeEmployeeName && (
                      <div>
                        <strong style={{ color: '#667eea' }}>Alternative Employee:</strong>
                        <div style={{ marginTop: '8px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                          <div><strong>Name:</strong> {req.alternativeEmployeeName}</div>
                          <div><strong>ID:</strong> {req.alternativeEmployeeId}</div>
                          <div><strong>Email:</strong> {altEmpDetails?.email || 'N/A'}</div>
                          <div><strong>Department:</strong> {altEmpDetails?.department || 'N/A'}</div>
                          <div><strong>Manager:</strong> {getManagerName(altEmpDetails?.managerId)}</div>
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    <div>
                      <strong style={{ color: '#667eea' }}>Reason:</strong>
                      <div style={{ marginTop: '8px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                        {req.reason}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <strong style={{ color: '#667eea' }}>Status:</strong>
                      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        {getStatusBadge(req.status)}

                        {/* Display Rejection Reason Here */}
                        {req.status === 'rejected' && (() => {
                          const reason = (req.managerApproval || req.manager_approval)?.reason ||
                            (req.hrApproval || req.hr_approval)?.reason ||
                            (req.superAdminApproval || req.super_admin_approval)?.reason;

                          if (reason) {
                            return (
                              <div style={{ fontSize: '13px', color: '#b91c1c', background: '#fef2f2', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fecaca', maxWidth: '300px' }}>
                                <strong>Reason:</strong> {reason}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    {/* Approval Status */}
                    <div>
                      <strong style={{ color: '#667eea' }}>Approval Status:</strong>
                      <div style={{ marginTop: '8px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                        {(() => {
                          const managerApp = req.managerApproval || req.manager_approval;
                          const hrApp = req.hrApproval || req.hr_approval;
                          const saApp = req.superAdminApproval || req.super_admin_approval;

                          const renderApprovalLine = (role, app) => {
                            const isRejected = app.status === 'rejected';
                            const statusText = isRejected ? 'Rejected' : 'Approved';
                            const statusColor = isRejected ? '#dc2626' : '#1e293b';
                            const date = app.rejected_at || app.rejectedAt || app.approved_at || app.approvedAt;

                            return (
                              <div style={{ marginBottom: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                  <div>
                                    <strong>{role}:</strong>
                                    <span style={{ color: statusColor, fontWeight: isRejected ? '600' : '400', marginLeft: '4px' }}>
                                      {statusText} by {app.approver_name || app.approverName}
                                    </span>
                                    {date && (
                                      <span style={{ color: '#64748b', fontSize: '13px', marginLeft: '6px' }}>
                                        on {formatDateTime(date)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          };

                          return (
                            <>
                              {managerApp && managerApp.status !== 'bypassed' && renderApprovalLine('Manager', managerApp)}
                              {hrApp && hrApp.status !== 'bypassed' && renderApprovalLine('HR', hrApp)}
                              {saApp && renderApprovalLine('Super Admin', saApp)}

                              {!managerApp && !hrApp && !saApp && req.status !== 'rejected' && (
                                <div style={{ fontStyle: 'italic', color: '#94a3b8' }}>No approvals yet</div>
                              )}

                              {req.status === 'rejected' && !managerApp?.reason && !hrApp?.reason && !saApp?.reason && (
                                <div style={{ color: '#dc2626', fontWeight: '600' }}>Request Rejected</div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Created At */}
                    <div>
                      <strong style={{ color: '#667eea' }}>Request Created:</strong>
                      <div style={{ marginTop: '4px', fontSize: '14px', color: '#1e293b' }}>
                        {formatDateTime(req.created_at || req.createdAt || req.requested_at || req.timestamp || req.date)}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          {/* First Page Button */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              background: currentPage === 1 ? '#e9ecef' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            &lt;&lt;
          </button>

          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              background: currentPage === 1 ? '#e9ecef' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            &lt;
          </button>

          {/* Page Numbers */}
          {getPageNumbers().map(pageNum => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                background: currentPage === pageNum ? '#007bff' : 'white',
                color: currentPage === pageNum ? 'white' : '#333',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                minWidth: '40px'
              }}
            >
              {pageNum}
            </button>
          ))}

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              background: currentPage === totalPages ? '#e9ecef' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            &gt;
          </button>

          {/* Last Page Button */}
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              background: currentPage === totalPages ? '#e9ecef' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            &gt;&gt;
          </button>

          {/* Page Info */}
          <span style={{ marginLeft: '15px', fontSize: '14px', color: '#666' }}>
            Page {currentPage} of {totalPages} ({requests.length} total)
          </span>
        </div>
      )}
    </div>
  );
}

export default RequestList;

