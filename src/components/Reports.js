import React, { useState, useEffect } from 'react';
import { dataService } from '../utils/dataService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Reports.css';

function Reports({ user, scope, department, showAll = false }) {
  const [reportType, setReportType] = useState('day-leave'); // 'day-leave', 'day-permission', 'weekly', 'monthly'

  // Date States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [departmentsList, setDepartmentsList] = useState([]);
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(false);

  // Metadata for PDF
  const [deptCounts, setDeptCounts] = useState({});
  const [empLookup, setEmpLookup] = useState({});

  useEffect(() => {
    loadInitialData();
    const now = new Date();
    const week = getWeekNumber(now);
    setSelectedWeek(`${now.getFullYear()}-W${String(week).padStart(2, '0')}`);
  }, []);

  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const loadInitialData = async () => {
    const depts = await dataService.getAllDepartments();
    setDepartmentsList(depts || []);
  };

  const fetchEmployeesAndCounts = async () => {
    const allEmps = await dataService.getAllEmployees();

    // 1. Build Lookup (ID -> {designation, name})
    const lookup = {};
    const counts = {};

    // Initialize counts for known departments
    departmentsList.forEach(d => counts[d.name] = 0);

    allEmps.forEach(emp => {
      // Lookup
      lookup[emp.id] = {
        designation: emp.designation || emp.role,
        name: emp.name
      };

      // Count
      const dept = emp.department || 'Unknown';
      counts[dept] = (counts[dept] || 0) + 1;
    });

    setEmpLookup(lookup);
    setDeptCounts(counts);
    return { lookup, counts };
  };

  const processData = async (filterFn, typeFilter = null) => {
    const allRequests = await dataService.getAllRequests();

    // 1. Filter by Date/Range & Status
    let filtered = allRequests.filter(req => {
      if (req.status !== 'approved') return false;
      return filterFn(req);
    });

    // 2. Filter by Type (Leave vs Permission)
    if (typeFilter) {
      filtered = filtered.filter(req => req.type === typeFilter);
    }

    // 3. Filter by Employee (if role is employee, show only their own data)
    if (user?.role === 'employee') {
      filtered = filtered.filter(req => {
        const empId = req.employee_id || req.employeeId;
        return empId === user.id;
      });
    }

    // 4. Group by Department
    const grouped = {};
    departmentsList.forEach(dept => grouped[dept.name] = []);

    filtered.forEach(req => {
      const dept = req.department || 'Unknown';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(req);
    });

    return grouped;
  };

  const generateReport = async () => {
    setLoading(true);
    await fetchEmployeesAndCounts(); // Refresh employee data for counts

    let data = {};

    // DATE FILTERS
    const dayFilter = (req) => {
      const s = req.start_date || req.startDate;
      const e = req.end_date || req.endDate;
      return (s <= selectedDate && e >= selectedDate);
    };

    const weekFilter = (req) => {
      // Simple logic: Is start date in this week?
      // Reuse selectedDate as anchor? No, use SelectedWeek logic.
      const [y, w] = selectedWeek.split('-W');
      const simple = new Date(y, 0, 1 + (w - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

      const weekStartStr = ISOweekStart.toISOString().split('T')[0];
      const weekEnd = new Date(ISOweekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const s = req.start_date || req.startDate;
      const e = req.end_date || req.endDate;
      return (s <= weekEndStr && e >= weekStartStr);
    };

    const monthFilter = (req) => {
      const startStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

      const s = req.start_date || req.startDate;
      const e = req.end_date || req.endDate;
      return (s <= endStr && e >= startStr);
    };

    // Report Type Switch
    if (reportType === 'day-leave') {
      data = await processData(dayFilter, 'leave');
    } else if (reportType === 'day-permission') {
      data = await processData(dayFilter, 'permission');
    } else if (reportType === 'weekly') {
      data = await processData(weekFilter, 'leave'); // Weekly usually tracks Leave
    } else if (reportType === 'monthly') {
      data = await processData(monthFilter, 'leave');
    }

    setReportData(data);
    setLoading(false);
  };

  const getReportTitle = () => {
    if (reportType === 'day-leave') return `Daily Attendance (Absent) Report - ${selectedDate}`;
    if (reportType === 'day-permission') return `Daily Permission Report - ${selectedDate}`;
    if (reportType === 'weekly') return `Weekly Leave Report - ${selectedWeek}`;
    if (reportType === 'monthly') return `Monthly Leave Report - ${selectedMonth}/${selectedYear}`;
    return 'Leave Report';
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const title = getReportTitle();

    // Header
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Departments: ${departmentsList.length}`, 14, 36);

    let yPos = 45;

    Object.entries(reportData).forEach(([deptName, requests]) => {
      // Dept Header Stats
      const totalEmployees = deptCounts[deptName] || 0;
      const onLeaveCount = requests.length;
      let statsText = '';

      if (reportType === 'day-leave') {
        const present = Math.max(0, totalEmployees - onLeaveCount);
        statsText = `${present} / ${totalEmployees} Present`;
      } else if (reportType === 'day-permission') {
        statsText = `${onLeaveCount} Permissions`;
      } else {
        statsText = `${onLeaveCount} Records`;
      }

      // Check for page break
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      // Dept Title
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFillColor(240, 249, 255); // Light Blue bg
      doc.rect(14, yPos - 5, 182, 12, 'F');
      doc.text(`${deptName}`, 16, yPos + 3);

      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text(statsText, 150, yPos + 3);

      yPos += 15;

      if (requests.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(reportType === 'day-permission' ? "No permissions." : "All employees present.", 16, yPos);
        yPos += 15;
      } else {
        const tableBody = requests.map(req => {
          const empId = req.employee_id || req.employeeId;
          const details = empLookup[empId] || {};
          return [
            empId || '-',
            req.employee_name || req.employeeName || details.name || '-',
            details.designation || '-',
            reportType === 'day-permission' ? (req.duration || '-') : 'Absent'
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Emp ID', 'Name', 'Designation', reportType === 'day-permission' ? 'Duration' : 'Status']],
          body: tableBody,
          theme: 'striped',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
      }
    });

    doc.save(`${title.replace(/ /g, '_')}.pdf`);
  };

  const downloadCSV = () => {
    const title = getReportTitle();
    const rows = [['Report:', title], ['Date:', new Date().toLocaleString()], []];

    // Columns
    rows.push(['Department', 'Emp ID', 'Name', 'Designation', reportType === 'day-permission' ? 'Duration' : 'Status', 'Start Date', 'End Date', 'Reason']);

    Object.entries(reportData).forEach(([deptName, requests]) => {
      if (requests.length === 0) {
        // rows.push([deptName, 'No records', '', '', '', '', '', '']); 
      } else {
        requests.forEach(req => {
          const empId = req.employee_id || req.employeeId;
          const details = empLookup[empId] || {};
          rows.push([
            deptName,
            empId || '-',
            req.employee_name || req.employeeName || details.name || '-',
            details.designation || '-',
            reportType === 'day-permission' ? (req.duration || '-') : 'Absent',
            req.start_date || req.startDate,
            req.end_date || req.endDate,
            (req.reason || '').replace(/,/g, ' ')
          ]);
        });
      }
    });

    let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '8px' }}>Leave & Attendance Reports</h2>
        <p style={{ color: '#64748b', margin: 0 }}>Generate and download reports by Day, Week, or Month</p>
      </div>

      {/* Controls Container */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        alignItems: 'end',
        marginBottom: '32px'
      }}>

        {/* Report Type Selection */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>Report Type</label>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setReportData({});
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '14px',
              color: '#334155',
              outline: 'none',
              minWidth: '220px'
            }}
          >
            <option value="day-leave">Day Wise (Absent Stats)</option>
            <option value="day-permission">Day Wise (Permission)</option>
            <option value="weekly">Weekly Report</option>
            <option value="monthly">Monthly Report</option>
          </select>
        </div>

        {/* Dynamic Inputs based on Type */}
        {(reportType === 'day-leave' || reportType === 'day-permission') && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
                color: '#334155',
                outline: 'none'
              }}
            />
          </div>
        )}

        {reportType === 'weekly' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>Select Week</label>
            <input
              type="week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
                color: '#334155',
                outline: 'none'
              }}
            />
          </div>
        )}

        {reportType === 'monthly' && (
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Year/Month selectors reused from state */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '80px' }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <button
            onClick={generateReport}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Processing...' : 'View Report'}
          </button>

          {Object.keys(reportData).length > 0 && (
            <>
              <button
                onClick={downloadPDF}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.2s'
                }}
              >
                <span>📄</span> Download PDF
              </button>
              <button
                onClick={downloadCSV}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.2s'
                }}
              >
                <span>📊</span> Download CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {Object.keys(reportData).length > 0 ? (
        <div className="report-preview" style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ paddingBottom: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
            {/* Header */}
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
              {getReportTitle()}
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {departmentsList.map(dept => {
              const deptRequests = reportData[dept.name] || [];
              const total = deptCounts[dept.name] || 0;
              const present = Math.max(0, total - deptRequests.length);

              return (
                <div key={dept.id} className="preview-dept-section">
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginBottom: '12px'
                  }}>
                    <h4 style={{ margin: 0, color: '#334155' }}>{dept.name}</h4>
                    {reportType === 'day-leave' && (
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{present} / {total} Present</span>
                    )}
                    {reportType === 'day-permission' && (
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#d97706' }}>{deptRequests.length} Permissions</span>
                    )}
                  </div>

                  {deptRequests.length > 0 ? (
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: '#fff', borderBottom: '2px solid #f1f5f9' }}>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Emp ID</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Designation</th>
                            {reportType === 'day-permission' && <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Duration</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {deptRequests.map(req => {
                            const details = empLookup[req.employee_id || req.employeeId] || {};
                            return (
                              <tr key={req.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td style={{ padding: '8px 12px', color: '#334155', fontFamily: 'monospace' }}>{req.employee_id || req.employeeId}</td>
                                <td style={{ padding: '8px 12px', color: '#334155' }}>{req.employee_name || req.employeeName}</td>
                                <td style={{ padding: '8px 12px', color: '#64748b' }}>{details.designation || '-'}</td>
                                {reportType === 'day-permission' && <td style={{ padding: '8px 12px' }}>{req.duration || '-'}</td>}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 16px', color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
                      {reportType === 'day-leave' ? 'All employees are present.' : 'No permissions recorded.'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ color: '#64748b', margin: 0 }}>Select date and report type to view attendance</h3>
        </div>
      )}
    </div>
  );
}

export default Reports;
