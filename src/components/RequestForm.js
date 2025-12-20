import React, { useState, useEffect } from 'react';
import { dataService } from '../utils/dataService';
import './RequestForm.css';

function RequestForm({ user, onRequestSubmitted, onCloseSuccess, requestType = 'leave' }) {
  const [formData, setFormData] = useState({
    employeeCode: '',
    employeeId: '',
    employeeName: '',
    employeeRole: '',
    employeeDepartment: '',
    employeeDesignation: '',
    type: requestType,
    leaveMode: '', // 'casual' or 'unpaid'
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    halfDaySession: '', // 'morning' or 'afternoon' for half day leave
    reason: '',
    alternativeEmployeeId: '',
    alternativeEmployeeName: '',
    alternativeEmployeeCode: '',
    alternativeEmployeeRole: '',
    alternativeEmployeeDepartment: '',
    alternativeEmployeeDesignation: ''
  });

  const [errors, setErrors] = useState({});
  const [conflictWarning, setConflictWarning] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [casualLeaveAvailable, setCasualLeaveAvailable] = useState(true);
  const [casualLeaveMessage, setCasualLeaveMessage] = useState('');
  const [weekOffMessage, setWeekOffMessage] = useState('');

  useEffect(() => {
    // Load all employees for alternative employee selection
    const allEmployees = dataService.getAllEmployees();
    // Filter alternative employees belonging to the same team/department AND status is active
    const otherEmployees = allEmployees.filter(emp =>
      emp.id !== user.id &&
      emp.role === 'employee' &&
      emp.department === user.department &&
      (emp.status === 'active' || emp.status === 'Active' || !emp.status)
    );
    setEmployees(otherEmployees);
  }, [user]);

  useEffect(() => {
    // Auto-fill employee details and update type
    if (user) {
      setFormData(prev => ({
        ...prev,
        employeeCode: user.id,
        employeeId: user.id,
        employeeName: user.name,
        employeeRole: user.role,
        employeeDepartment: user.department,
        employeeDesignation: user.designation || 'N/A',
        type: requestType
      }));
    }
  }, [user, requestType]);

  useEffect(() => {
    // Check if user has already taken casual leave this month
    const checkCasualLeaveUsage = async () => {
      if (!user) return;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Get all requests for this employee
      const allRequests = await dataService.getRequestsByEmployee(user.id);

      // Filter for approved casual leaves in current month
      const casualLeavesThisMonth = allRequests.filter(req => {
        if (req.status !== 'approved') return false;

        // Check for casual leave mode (handle different casing/naming)
        const isCasual = req.leaveMode === 'casual' || req.leaveMode === 'Casual Leave';
        if (!isCasual) return false;

        const reqDate = new Date(req.start_date || req.startDate);
        return reqDate.getMonth() === currentMonth && reqDate.getFullYear() === currentYear;
      });

      if (casualLeavesThisMonth.length >= 1) {
        setCasualLeaveAvailable(false);
        const nextMonth = new Date(currentYear, currentMonth + 1, 1);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        setCasualLeaveMessage(`You have already used your casual leave for this month. Next casual leave will be available from ${monthNames[nextMonth.getMonth()]} 1, ${nextMonth.getFullYear()}.`);
      } else {
        setCasualLeaveAvailable(true);
        setCasualLeaveMessage('');
      }
    };

    checkCasualLeaveUsage();
  }, [user]);

  useEffect(() => {
    // Check for conflicts when alternative employee or dates change
    if (formData.alternativeEmployeeId && formData.startDate) {
      checkConflict();
    } else {
      setConflictWarning(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.alternativeEmployeeId, formData.startDate, formData.endDate, formData.startTime, formData.endTime, formData.halfDaySession, formData.type]);

  useEffect(() => {
    // Check for Week Off (Sunday)
    let message = '';
    const isSunday = (dateStr) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return date.getDay() === 0;
    };

    if (isSunday(formData.startDate) || (formData.type !== 'halfday' && isSunday(formData.endDate))) {
      message = 'Week Off';
    }
    setWeekOffMessage(message);

    // Calculate number of days when start and end dates are selected
    if ((formData.type === 'leave' || formData.type === 'od') && formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = end - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
      setCalculatedDays(diffDays > 0 ? diffDays : 0);
    } else if (formData.type === 'halfday' && formData.startDate) {
      setCalculatedDays(0.5);
    } else {
      setCalculatedDays(0);
    }
  }, [formData.startDate, formData.endDate, formData.type]);

  const checkConflict = async () => {
    if (!formData.alternativeEmployeeId || !formData.startDate) {
      setConflictWarning(null);
      return;
    }

    // For half day leave, use the same date for start and end, and set times based on session
    const endDate = formData.type === 'halfday' ? formData.startDate : (formData.endDate || formData.startDate);
    const startTime = formData.type === 'halfday'
      ? (formData.halfDaySession === 'morning' ? '09:00' : '13:00')
      : formData.startTime;
    const endTime = formData.type === 'halfday'
      ? (formData.halfDaySession === 'morning' ? '13:00' : '18:00')
      : formData.endTime;

    const hasConflict = await dataService.checkAlternativeEmployeeConflict(
      formData.alternativeEmployeeId,
      formData.startDate,
      endDate,
      startTime,
      endTime
    );

    if (hasConflict) {
      setConflictWarning(
        `⚠️ Warning: The selected alternative employee already has a leave/permission request on the same date/time. They cannot be your alternative employee. Please select a different employee.`
      );
    } else {
      setConflictWarning(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Update alternative employee details when ID changes
    if (name === 'alternativeEmployeeId') {
      const selectedEmployee = employees.find(emp => emp.id === value);
      if (selectedEmployee) {
        setFormData(prev => ({
          ...prev,
          alternativeEmployeeName: selectedEmployee.name,
          alternativeEmployeeCode: selectedEmployee.id,
          alternativeEmployeeRole: selectedEmployee.role || 'employee',
          alternativeEmployeeDesignation: selectedEmployee.designation || 'N/A'
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          alternativeEmployeeName: '',
          alternativeEmployeeCode: '',
          alternativeEmployeeRole: '',
          alternativeEmployeeDesignation: ''
        }));
      }
    }
  };

  const validate = async () => {
    const newErrors = {};

    if (!formData.employeeCode || !formData.employeeId) {
      newErrors.employeeCode = 'Employee code is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.type === 'leave' && !formData.endDate) {
      newErrors.endDate = 'End date is required for full day leave requests';
    }

    if (formData.type === 'halfday' && !formData.halfDaySession) {
      newErrors.halfDaySession = 'Please select morning or afternoon session for half day leave';
    }

    if ((formData.type === 'leave' || formData.type === 'halfday') && !formData.leaveMode) {
      newErrors.leaveMode = 'Please select a leave mode';
    }

    if (formData.type === 'permission') {
      if (!formData.startTime) {
        newErrors.startTime = 'Start time is required for permission requests';
      }
      if (!formData.endTime) {
        newErrors.endTime = 'End time is required for permission requests';
      }
      if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    if (formData.type === 'od' && !formData.endDate) {
      newErrors.endDate = 'End date is required for On Duty (OD) requests';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    // Common date logic
    const endDate = formData.type === 'halfday' ? formData.startDate : (formData.endDate || formData.startDate);
    const startTime = formData.type === 'halfday'
      ? (formData.halfDaySession === 'morning' ? '09:00' : '13:00')
      : formData.startTime;
    const endTime = formData.type === 'halfday'
      ? (formData.halfDaySession === 'morning' ? '13:00' : '18:00')
      : formData.endTime;

    // RULE: Check if CURRENT employee already has a request for these dates
    if (formData.employeeId && formData.startDate && (formData.type !== 'leave' || formData.endDate)) {
      const hasSelfConflict = await dataService.checkAlternativeEmployeeConflict(
        formData.employeeId,
        formData.startDate,
        endDate,
        startTime,
        endTime
      );

      if (hasSelfConflict) {
        newErrors.startDate = 'You already have a pending or approved request (or are covering for someone) during this period.';
        newErrors.conflict = 'Cannot submit duplicate request.';
      }
    }

    // Skip alternative employee check for managers
    const isManager = user && (user.role === 'manager' || user.role === 'hr' || user.role === 'superadmin');

    if (!isManager) {
      if (!formData.alternativeEmployeeId) {
        newErrors.alternativeEmployeeId = 'Alternative employee is required';
      }

      // Check for conflict with alternative employee's leave
      if (formData.alternativeEmployeeId && formData.startDate && !newErrors.conflict) {
        const hasConflict = await dataService.checkAlternativeEmployeeConflict(
          formData.alternativeEmployeeId,
          formData.startDate,
          endDate,
          startTime,
          endTime
        );

        if (hasConflict) {
          newErrors.alternativeEmployeeId = 'Alternative employee has leave/permission on the same date. Please select a different employee.';
          newErrors.conflict = 'Please resolve the conflict before submitting';
        }
      }
    }

    if (conflictWarning) {
      newErrors.conflict = 'Please resolve the conflict before submitting';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!(await validate())) {
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData = {
        employeeId: formData.employeeId,
        employeeName: formData.employeeName,
        department: formData.employeeDepartment,
        type: formData.type,
        leaveMode: formData.leaveMode,
        startDate: formData.startDate,
        endDate: formData.type === 'leave' ? formData.endDate : formData.startDate,
        startTime: formData.type === 'permission' ? formData.startTime : (formData.type === 'halfday' ? (formData.halfDaySession === 'morning' ? '09:00' : '13:00') : null),
        endTime: formData.type === 'permission' ? formData.endTime : (formData.type === 'halfday' ? (formData.halfDaySession === 'morning' ? '13:00' : '18:00') : null),
        halfDaySession: formData.type === 'halfday' ? formData.halfDaySession : null,
        reason: formData.reason,
        alternativeEmployeeId: formData.alternativeEmployeeId,
        alternativeEmployeeName: formData.alternativeEmployeeName
      };

      await dataService.createRequest(requestData);

      // Reset form
      setFormData({
        employeeCode: user.id,
        employeeId: user.id,
        employeeName: user.name,
        employeeRole: user.role,
        employeeDepartment: user.department,
        employeeDesignation: user.designation || 'N/A',
        type: requestType,
        leaveMode: '',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        halfDaySession: '',
        reason: '',
        alternativeEmployeeId: '',
        alternativeEmployeeName: '',
        alternativeEmployeeCode: '',
        alternativeEmployeeRole: '',
        alternativeEmployeeDepartment: '',
        alternativeEmployeeDesignation: ''
      });

      setErrors({});
      setConflictWarning(null);

      // Show success message
      const requestTypeText = formData.type === 'leave' ? 'leave' : formData.type === 'halfday' ? 'half day leave' : 'permission';
      setSuccessMessage(`${formData.employeeName}, waiting for your ${requestTypeText} approval`);

      // No auto-hide, user must close manually

      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
    } catch (error) {
      console.error('Submit error:', error);
      let errorMessage = 'Failed to submit request. Please try again.';
      if (error.message && error.message.includes('Supabase is not configured')) {
        errorMessage = 'Database not configured. Please set up Supabase credentials in .env file.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form autoComplete="off" onSubmit={handleSubmit} className="request-form">

      <div className="form-group">
        {!user && (
          <>
            <label className="form-label">Employee Code *</label>
            <input
              type="text"
              name="employeeCode"
              className="form-input"
              value={formData.employeeCode || ''}
              placeholder="Enter Employee Code (e.g., EMP001)"
              onChange={(e) => {
                const code = e.target.value.toUpperCase();
                setFormData(prev => ({
                  ...prev,
                  employeeCode: code
                }));

                // Auto-fill employee details when code is entered
                if (code) {
                  dataService.getEmployeeByCode(code).then(selectedEmployee => {
                    if (selectedEmployee) {
                      setFormData(prev => ({
                        ...prev,
                        employeeId: selectedEmployee.id,
                        employeeName: selectedEmployee.name,
                        employeeRole: selectedEmployee.role || 'employee',
                        employeeDepartment: selectedEmployee.department || 'N/A',
                        employeeDesignation: selectedEmployee.designation || 'N/A'
                      }));
                      setErrors(prev => ({
                        ...prev,
                        employeeCode: ''
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        employeeId: '',
                        employeeName: '',
                        employeeRole: '',
                        employeeDepartment: '',
                        employeeDesignation: ''
                      }));
                      if (code.length >= 3) {
                        setErrors(prev => ({
                          ...prev,
                          employeeCode: 'Invalid employee code'
                        }));
                      }
                    }
                  }).catch(err => {
                    console.error('Error fetching employee:', err);
                  });
                } else {
                  setFormData(prev => ({
                    ...prev,
                    employeeId: '',
                    employeeName: '',
                    employeeRole: '',
                    employeeDepartment: '',
                    employeeDesignation: ''
                  }));
                }
              }}
            />
            {errors.employeeCode && (
              <div className="form-error">{errors.employeeCode}</div>
            )}
          </>
        )}
        {formData.employeeName && (
          <div className="form-info employee-details-display">
            <div className="employee-detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{formData.employeeName}</span>
            </div>
            <div className="employee-detail-row">
              <span className="detail-label">Employee Code:</span>
              <span className="detail-value">{formData.employeeId}</span>
            </div>
            <div className="employee-detail-row">
              <span className="detail-label">Role:</span>
              <span className="detail-value">{formData.employeeRole || 'Employee'}</span>
            </div>
            <div className="employee-detail-row">
              <span className="detail-label">Department:</span>
              <span className="detail-value">{formData.employeeDepartment || 'N/A'}</span>
            </div>
            <div className="employee-detail-row">
              <span className="detail-label">Designation:</span>
              <span className="detail-value">{formData.employeeDesignation || 'N/A'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Request Type *</label>
        <div className="radio-group">
          <label className={`radio-label ${!casualLeaveAvailable ? 'disabled-option' : ''}`} style={{ opacity: !casualLeaveAvailable ? 0.6 : 1, cursor: !casualLeaveAvailable ? 'not-allowed' : 'pointer' }}>
            <input
              type="radio"
              name="typeSelection"
              value="casual_leave"
              checked={formData.type === 'leave' && formData.leaveMode === 'casual'}
              onChange={() => {
                if (casualLeaveAvailable) {
                  setFormData(prev => ({ ...prev, type: 'leave', leaveMode: 'casual' }));
                }
              }}
              disabled={!casualLeaveAvailable}
            />
            <span>Casual Leave</span>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="typeSelection"
              value="unpaid_leave"
              checked={formData.type === 'leave' && formData.leaveMode === 'unpaid'}
              onChange={() => setFormData(prev => ({ ...prev, type: 'leave', leaveMode: 'unpaid' }))}
            />
            <span>Unpaid Leave</span>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="typeSelection"
              value="halfday"
              checked={formData.type === 'halfday'}
              onChange={() => setFormData(prev => ({ ...prev, type: 'halfday', leaveMode: 'casual' }))}
            />
            <span>Half Day Leave</span>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="typeSelection"
              value="permission"
              checked={formData.type === 'permission'}
              onChange={() => setFormData(prev => ({ ...prev, type: 'permission', leaveMode: '' }))}
            />
            <span>Permission (Time-based)</span>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="typeSelection"
              value="od"
              checked={formData.type === 'od'}
              onChange={() => setFormData(prev => ({ ...prev, type: 'od', leaveMode: '' }))}
            />
            <span>On Duty (OD)</span>
          </label>
        </div>

        {!casualLeaveAvailable && (formData.type === 'leave' && formData.leaveMode === 'casual') && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: '#fff1f2',
            border: '1px solid #fda4af',
            borderRadius: '6px',
            color: '#be123c',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🚫</span>
            {casualLeaveMessage}
          </div>
        )}
      </div>

      {formData.type === 'halfday' && (
        <div className="form-group">
          <label className="form-label">Half Day Leave Mode *</label>
          <div className="radio-group">
            <label className={`radio-label ${!casualLeaveAvailable ? 'disabled-option' : ''}`} style={{ opacity: !casualLeaveAvailable ? 0.6 : 1, cursor: !casualLeaveAvailable ? 'not-allowed' : 'pointer' }}>
              <input
                type="radio"
                name="leaveMode"
                value="casual"
                checked={formData.leaveMode === 'casual'}
                onChange={handleChange}
                disabled={!casualLeaveAvailable}
              />
              <span>Casual</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="leaveMode"
                value="unpaid"
                checked={formData.leaveMode === 'unpaid'}
                onChange={handleChange}
              />
              <span>Unpaid</span>
            </label>
          </div>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date *</label>
          <input
            type="date"
            name="startDate"
            className="form-input"
            value={formData.startDate}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
          />
          {errors.startDate && <div className="form-error">{errors.startDate}</div>}
        </div>

        {(formData.type === 'leave' || formData.type === 'od') && (
          <div className="form-group">
            <label className="form-label">End Date *</label>
            <input
              type="date"
              name="endDate"
              className="form-input"
              value={formData.endDate}
              onChange={handleChange}
              min={formData.startDate || new Date().toISOString().split('T')[0]}
            />
            {errors.endDate && <div className="form-error">{errors.endDate}</div>}
          </div>
        )}
      </div>

      {weekOffMessage && (
        <div className="form-group">
          <div style={{
            padding: '10px',
            background: '#fee2e2',
            borderRadius: '6px',
            border: '1px solid #ef4444',
            color: '#b91c1c',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📅 {weekOffMessage}
          </div>
        </div>
      )}

      {(formData.type === 'leave' || formData.type === 'od') && calculatedDays > 0 && (
        <div className="form-group">
          <div style={{
            padding: '10px',
            background: '#e3f2fd',
            borderRadius: '6px',
            border: '1px solid #2196f3',
            color: '#1565c0',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📅 Total Days: {calculatedDays} day{calculatedDays !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {formData.type === 'halfday' && calculatedDays > 0 && (
        <div className="form-group">
          <div style={{
            padding: '10px',
            background: '#fff3e0',
            borderRadius: '6px',
            border: '1px solid #ff9800',
            color: '#e65100',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📅 Total Days: 0.5 day (Half Day)
          </div>
        </div>
      )}

      {formData.type === 'halfday' && (
        <div className="form-group">
          <label className="form-label">Session *</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="halfDaySession"
                value="morning"
                checked={formData.halfDaySession === 'morning'}
                onChange={handleChange}
              />
              <span>Morning (9:00 AM - 1:00 PM)</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="halfDaySession"
                value="afternoon"
                checked={formData.halfDaySession === 'afternoon'}
                onChange={handleChange}
              />
              <span>Afternoon (1:00 PM - 6:00 PM)</span>
            </label>
          </div>
          {errors.halfDaySession && <div className="form-error">{errors.halfDaySession}</div>}
        </div>
      )}

      {formData.type === 'permission' && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Time *</label>
            <input
              type="time"
              name="startTime"
              className="form-input"
              value={formData.startTime}
              onChange={handleChange}
            />
            {errors.startTime && <div className="form-error">{errors.startTime}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">End Time *</label>
            <input
              type="time"
              name="endTime"
              className="form-input"
              value={formData.endTime}
              onChange={handleChange}
            />
            {errors.endTime && <div className="form-error">{errors.endTime}</div>}
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Reason *</label>
        <textarea
          name="reason"
          className="form-textarea"
          value={formData.reason}
          onChange={handleChange}
          placeholder="Please provide a reason for your request..."
          rows="4"
        />
        {errors.reason && <div className="form-error">{errors.reason}</div>}
      </div>

      {(!user || user.role === 'employee') && (
        <div className="form-group">
          <label className="form-label">Alternative Employee Code *</label>
          <input
            type="text"
            name="alternativeEmployeeCode"
            className="form-input"
            value={formData.alternativeEmployeeCode || ''}
            onChange={(e) => {
              const code = e.target.value.toUpperCase();
              setFormData(prev => ({
                ...prev,
                alternativeEmployeeCode: code
              }));

              // Auto-fill employee details when code is entered
              if (code) {
                dataService.getEmployeeByCode(code).then(selectedEmployee => {
                  const isActive = selectedEmployee && (selectedEmployee.status === 'active' || selectedEmployee.status === 'Active' || !selectedEmployee.status);

                  if (selectedEmployee && selectedEmployee.role === 'employee' && selectedEmployee.department === user.department && isActive) {
                    setFormData(prev => ({
                      ...prev,
                      alternativeEmployeeId: selectedEmployee.id,
                      alternativeEmployeeName: selectedEmployee.name,
                      alternativeEmployeeRole: selectedEmployee.role,
                      alternativeEmployeeDepartment: selectedEmployee.department || 'N/A',
                      alternativeEmployeeDesignation: selectedEmployee.designation || 'N/A'
                    }));
                    setErrors(prev => ({
                      ...prev,
                      alternativeEmployeeId: ''
                    }));
                  } else if (selectedEmployee && !isActive) {
                    setFormData(prev => ({
                      ...prev,
                      alternativeEmployeeId: '',
                      alternativeEmployeeName: '',
                      alternativeEmployeeRole: '',
                      alternativeEmployeeDepartment: '',
                      alternativeEmployeeDesignation: ''
                    }));
                    setErrors(prev => ({
                      ...prev,
                      alternativeEmployeeId: 'This employee account is deactivated'
                    }));
                  } else if (selectedEmployee && selectedEmployee.department !== user.department) {
                    setFormData(prev => ({
                      ...prev,
                      alternativeEmployeeId: '',
                      alternativeEmployeeName: '',
                      alternativeEmployeeRole: '',
                      alternativeEmployeeDepartment: '',
                      alternativeEmployeeDesignation: ''
                    }));
                    setErrors(prev => ({
                      ...prev,
                      alternativeEmployeeId: `Employee must be from the same department (${user.department})`
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      alternativeEmployeeId: '',
                      alternativeEmployeeName: '',
                      alternativeEmployeeRole: '',
                      alternativeEmployeeDepartment: '',
                      alternativeEmployeeDesignation: ''
                    }));
                    if (code.length >= 3) {
                      setErrors(prev => ({
                        ...prev,
                        alternativeEmployeeId: 'Invalid employee code'
                      }));
                    }
                  }
                });
                return;
              }

              // Fallback for immediate UI update
              if (code) {
                const selectedEmployee = employees.find(emp => emp.id === code && emp.role === 'employee');
                if (selectedEmployee) {
                  setFormData(prev => ({
                    ...prev,
                    alternativeEmployeeId: selectedEmployee.id,
                    alternativeEmployeeName: selectedEmployee.name,
                    alternativeEmployeeRole: selectedEmployee.role,
                    alternativeEmployeeDepartment: selectedEmployee.department || 'N/A',
                    alternativeEmployeeDesignation: selectedEmployee.designation || 'N/A'
                  }));
                  setErrors(prev => ({
                    ...prev,
                    alternativeEmployeeId: ''
                  }));
                } else {
                  setFormData(prev => ({
                    ...prev,
                    alternativeEmployeeId: '',
                    alternativeEmployeeName: '',
                    alternativeEmployeeRole: '',
                    alternativeEmployeeDepartment: '',
                    alternativeEmployeeDesignation: ''
                  }));
                  if (code.length >= 3) {
                    setErrors(prev => ({
                      ...prev,
                      alternativeEmployeeId: 'Invalid employee code'
                    }));
                  }
                }
              } else {
                setFormData(prev => ({
                  ...prev,
                  alternativeEmployeeId: '',
                  alternativeEmployeeName: '',
                  alternativeEmployeeRole: '',
                  alternativeEmployeeDepartment: '',
                  alternativeEmployeeDesignation: ''
                }));
              }
            }}
            placeholder="Enter Employee Code (e.g., EMP002)"
          />
          {errors.alternativeEmployeeId && (
            <div className="form-error">{errors.alternativeEmployeeId}</div>
          )}
          {conflictWarning && (
            <div className="form-error" style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              color: '#856404',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '8px',
              fontWeight: '500'
            }}>
              {conflictWarning}
            </div>
          )}
          {formData.alternativeEmployeeName && (
            <div className="form-info employee-details-display" style={{ marginTop: '12px' }}>
              <div className="employee-detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{formData.alternativeEmployeeName}</span>
              </div>
              <div className="employee-detail-row">
                <span className="detail-label">Employee Code:</span>
                <span className="detail-value">{formData.alternativeEmployeeId}</span>
              </div>
              <div className="employee-detail-row">
                <span className="detail-label">Role:</span>
                <span className="detail-value">{formData.alternativeEmployeeRole || 'Employee'}</span>
              </div>
              <div className="employee-detail-row">
                <span className="detail-label">Department:</span>
                <span className="detail-value">{formData.alternativeEmployeeDepartment || 'N/A'}</span>
              </div>
              <div className="employee-detail-row">
                <span className="detail-label">Designation:</span>
                <span className="detail-value">{formData.alternativeEmployeeDesignation || 'N/A'}</span>
              </div>
            </div>
          )}
          <div className="form-hint">
            <small>You can also select from dropdown below</small>
          </div>
          <select
            name="alternativeEmployeeId"
            className="form-select"
            value={formData.alternativeEmployeeId}
            onChange={handleChange}
            style={{ marginTop: '8px' }}
          >
            <option value="">Or select from list</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.id} - {emp.name} ({emp.department})
              </option>
            ))}
          </select>
        </div>
      )}

      {conflictWarning && (
        <div className="form-warning">
          <span>⚠️</span>
          <span>{conflictWarning}</span>
        </div>
      )}

      {errors.conflict && (
        <div className="form-error">{errors.conflict}</div>
      )}

      {errors.submit && (
        <div className="form-error">{errors.submit}</div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || !!conflictWarning}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
      {successMessage && (
        <div className="message-box-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="message-box" style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            maxWidth: '500px',
            width: '90%',
            position: 'relative',
            textAlign: 'center',
            borderTop: '6px solid #28a745'
          }}>
            <button
              type="button"
              onClick={() => {
                setSuccessMessage('');
                if (onCloseSuccess) onCloseSuccess();
              }}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ✕
            </button>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
            <h3 style={{ color: '#28a745', margin: '0 0 10px 0' }}>Request Submitted!</h3>
            <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              {successMessage}
            </p>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                setSuccessMessage('');
                if (onCloseSuccess) onCloseSuccess();
              }}
              style={{ padding: '10px 30px', fontSize: '16px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export default RequestForm;

