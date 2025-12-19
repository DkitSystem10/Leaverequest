import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../utils/dataService';
import './Login.css';

function Login() {
  const [empCode, setEmpCode] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMobileCredentials, setShowMobileCredentials] = useState(false);
  const { login } = useAuth();

  // Available departments
  const departments = ['Technology', 'Education', 'Finance', 'Associates', 'Intern', 'HR', 'Sales', 'Marketing', 'Admin', 'Manager'];


  // Update employee code
  const handleEmpCodeChange = (e) => {
    setEmpCode(e.target.value.toUpperCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!empCode.trim()) {
      setError('Please enter your Employee Code');
      return;
    }

    if (!department.trim()) {
      setError('Please enter your Department');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    // Authenticate using employee code, department, and password
    const employee = await dataService.authenticateEmployeeByCode(empCode.trim(), department.trim(), password);

    if (!employee) {
      setError('Invalid Employee Code, Department, or Password. Please try again.');
      return;
    }

    login(employee);
  };

  // Get all employees and group them by role
  const allEmployees = dataService.getAllEmployees().filter(emp =>
    !emp.status || emp.status.toLowerCase() === 'active'
  );

  const employeesByRole = {
    employee: allEmployees.filter(emp => emp.role === 'employee'),
    manager: allEmployees.filter(emp => emp.role === 'manager'),
    hr: allEmployees.filter(emp => emp.role === 'hr'),
    superadmin: allEmployees.filter(emp => emp.role === 'superadmin'),
  };

  const roleConfig = {
    employee: { icon: '👤', label: 'Employees', color: '#3b82f6' },
    manager: { icon: '👔', label: 'Manager', color: '#8b5cf6' },
    hr: { icon: '💼', label: 'HR', color: '#ec4899' },
    superadmin: { icon: '⚡', label: 'Super Admin', color: '#f59e0b' },
  };

  return (
    <div className="login-container">
      <div className="login-grid">
        {/* Mobile Toggle Button for Credentials */}
        <button
          className={`credentials-toggle-btn ${showMobileCredentials ? 'active' : ''}`}
          onClick={() => setShowMobileCredentials(!showMobileCredentials)}
          title="Show Demo Credentials"
        >
          {showMobileCredentials ? '✕' : '🔑'}
        </button>

        <div className={`credentials-card ${showMobileCredentials ? 'show-mobile' : ''}`}>
          <div className="credentials-header">
            <h2 className="demo-title">🔑 Demo Credentials</h2>
            <p className="demo-subtitle">Use any of these accounts to login</p>
          </div>
          <div className="demo-accounts">
            {Object.entries(employeesByRole).map(([role, employees]) => {
              if (employees.length === 0) return null;
              const config = roleConfig[role];
              return (
                <div key={role} className="role-section">
                  <div className="role-header" style={{ borderLeftColor: config.color }}>
                    <span className="role-icon">{config.icon}</span>
                    <span className="role-label">{config.label}</span>
                    <span className="role-count">{employees.length}</span>
                  </div>
                  <div className="employees-list">
                    {employees.map(emp => (
                      <div key={emp.id} className="demo-account">
                        <div className="employee-info">
                          <strong className="employee-name">{emp.name}</strong>
                          <span className="employee-id">{emp.id}</span>
                        </div>
                        <div className="credentials-row">
                          <div className="credential-item">
                            <span className="credential-label">Code:</span>
                            <code className="credential-value">{emp.id}</code>
                          </div>
                          <div className="credential-item">
                            <span className="credential-label">Dept:</span>
                            <code className="credential-value">{emp.department}</code>
                          </div>
                          <div className="credential-item">
                            <span className="credential-label">Pass:</span>
                            <code className="credential-value">{emp.password}</code>
                          </div>
                        </div>
                        {emp.department && (
                          <div className="employee-meta">
                            <span className="meta-badge">{emp.department}</span>
                            {emp.designation && <span className="meta-badge">{emp.designation}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="security-badge">🔒 Secure Authentication System</div>
        </div>
        <div className="login-right">
          <div className="login-card">
            <div className="login-header">
              <div className="login-logo">📋</div>
              <h1 className="login-title">Durkkas ERP</h1>
              <p className="login-subtitle">Leave & Permission Management System</p>
            </div>

            <div className="login-body">
              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="empCode" className="form-label">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    id="empCode"
                    className="form-input"
                    value={empCode}
                    onChange={handleEmpCodeChange}
                    placeholder="Enter Employee Code (e.g., EMP001, MGR001)"
                    autoFocus
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="department" className="form-label">
                    Department *
                  </label>
                  <select
                    id="department"
                    className="form-input"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password *
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {error && <div className="form-error">{error}</div>}

                <button type="submit" className="btn btn-primary login-btn">
                  Sign In
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
