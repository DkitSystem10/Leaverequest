import React, { useState, useEffect, useCallback } from 'react';
import { dataService } from '../utils/dataService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Reports.css';

function Reports({ user, scope, department, showAll = false }) {
  const [reportCategory, setReportCategory] = useState(null);
  const [reportType, setReportType] = useState('');

  // Date States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [departmentsList, setDepartmentsList] = useState([]);
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(false);
  const [reportEmployeeId, setReportEmployeeId] = useState('');

  // Metadata for PDF
  const [deptCounts, setDeptCounts] = useState({});
  const [empLookup, setEmpLookup] = useState({});
  const [overallSummary, setOverallSummary] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeaveToday: 0,
    permissionsToday: 0,
    deptData: []
  });

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

    // Calculate overall stats for analytics
    const allEmps = await dataService.getAllEmployees();
    const allReqs = await dataService.getAllRequests();
    const today = new Date().toISOString().split('T')[0];

    // Filter today's active requests
    const todayActive = allReqs.filter(r =>
      r.status === 'approved' &&
      (r.start_date || r.startDate) <= today &&
      (r.end_date || r.endDate) >= today
    );

    const onLeave = todayActive.filter(r => r.type === 'leave').length;
    const onPermission = todayActive.filter(r => r.type === 'permission').length;

    // Dept distribution
    const dCounts = {};
    allEmps.forEach(e => {
      const d = e.department || 'Unknown';
      dCounts[d] = (dCounts[d] || 0) + 1;
    });

    setOverallSummary({
      totalEmployees: allEmps.length,
      presentToday: allEmps.length - onLeave,
      onLeaveToday: onLeave,
      permissionsToday: onPermission,
      deptData: Object.entries(dCounts).map(([name, count]) => ({ name, count }))
    });
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

  const generateReport = useCallback(async () => {
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
    if (reportCategory === 'leave') {
      if (reportType === 'day-leave') {
        data = await processData(dayFilter, 'leave');
      } else if (reportType === 'day-permission') {
        data = await processData(dayFilter, 'permission');
      } else if (reportType === 'weekly') {
        data = await processData(weekFilter, 'leave');
      } else if (reportType === 'monthly') {
        data = await processData(monthFilter, 'leave');
      }
    } else if (reportCategory === 'time') {
      let startDate, endDate;

      if (reportType === 'time-daily') {
        startDate = selectedDate;
        endDate = selectedDate;
      } else if (reportType === 'time-weekly') {
        const [y, w] = selectedWeek.split('-W');
        const simple = new Date(y, 0, 1 + (w - 1) * 7);
        const dow = simple.getDay();
        const ISOweekStart = simple;
        if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

        startDate = ISOweekStart.toISOString().split('T')[0];
        const weekEnd = new Date(ISOweekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        endDate = weekEnd.toISOString().split('T')[0];
      } else { // time-monthly
        const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        startDate = `${monthStr}-01`;
        endDate = `${monthStr}-31`;
      }

      const attData = await dataService.getAttendanceReport({
        startDate,
        endDate,
        employeeId: reportEmployeeId || null
      });

      const grouped = {};
      attData.forEach(record => {
        const empId = record.employeeId;
        if (!grouped[empId]) grouped[empId] = [];
        grouped[empId].push(record);
      });
      data = grouped;
    } else if (reportCategory === 'user') {
      data = await dataService.getAllEmployees();
    } else if (reportCategory === 'holiday') {
      data = await dataService.fetchHolidays();
    } else if (reportCategory === 'directory') {
      const allEmps = await dataService.getAllEmployees();
      const grouped = {};
      departmentsList.forEach(d => grouped[d.name] = []);
      allEmps.forEach(emp => {
        const d = emp.department || 'Unknown';
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(emp);
      });
      data = grouped;
    }

    setReportData(data);
    setLoading(false);
  }, [reportCategory, reportType, selectedDate, selectedWeek, selectedMonth, selectedYear, reportEmployeeId, departmentsList]);

  // Auto-trigger report on filter change
  useEffect(() => {
    if (departmentsList.length > 0 && reportCategory) {
      generateReport();
    }
  }, [generateReport, departmentsList, reportCategory]);


  const getReportTitle = () => {
    if (reportCategory === 'leave') {
      if (reportType === 'day-leave') return `Daily Attendance (Absent) Report - ${selectedDate}`;
      if (reportType === 'day-permission') return `Daily Permission Report - ${selectedDate}`;
      if (reportType === 'weekly') return `Weekly Leave Report - ${selectedWeek}`;
      if (reportType === 'monthly') return `Monthly Leave Report - ${selectedMonth}/${selectedYear}`;
    }
    if (reportCategory === 'time') return `Time Management History - ${selectedMonth}/${selectedYear}`;
    if (reportCategory === 'user') return `User Management Report - ${new Date().toLocaleDateString()}`;
    if (reportCategory === 'holiday') return `Company Holiday List - ${selectedYear}`;
    if (reportCategory === 'directory') return `Employee Directory Report`;
    return 'Report';
  };

  const handlePDFAction = (action = 'download') => {
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

    if (reportCategory === 'time') {
      Object.entries(reportData).forEach(([empId, records]) => {
        const emp = empLookup[empId] || { name: empId };
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`${emp.name} (${empId})`, 16, yPos);
        yPos += 8;

        const tableBody = records.map(r => [
          r.date,
          r.inTime || '-',
          r.outTime || '-',
          r.workingHours ? Math.abs(r.workingHours).toFixed(2) : '0.00',
          r.lateMinutes > 0 ? `${r.lateMinutes}m` : '-',
          r.permissionMinutes > 0 ? `${r.permissionMinutes}m` : '-',
          r.status
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'IN', 'OUT', 'Hours', 'Late', 'Perm.', 'Status']],
          body: tableBody,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [79, 70, 229] }
        });
        yPos = doc.lastAutoTable.finalY + 15;
        if (yPos > 270) { doc.addPage(); yPos = 20; }
      });
    } else if (reportCategory === 'user') {
      const tableBody = reportData.map(u => [u.id, u.name, u.email, u.department, u.role, u.status]);
      autoTable(doc, {
        startY: yPos,
        head: [['ID', 'Name', 'Email', 'Department', 'Role', 'Status']],
        body: tableBody,
        headStyles: { fillColor: [79, 70, 229] }
      });
    } else if (reportCategory === 'holiday') {
      const tableBody = reportData.map(h => [h.name, h.fromDate, h.toDate, h.type]);
      autoTable(doc, {
        startY: yPos,
        head: [['Holiday Name', 'From', 'To', 'Type']],
        body: tableBody,
        headStyles: { fillColor: [79, 70, 229] }
      });
    } else if (reportCategory === 'directory' || reportCategory === 'leave') {
      Object.entries(reportData).forEach(([deptName, items]) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.text(deptName, 14, yPos);
        yPos += 5;

        let head, body;
        if (reportCategory === 'directory') {
          head = [['ID', 'Name', 'Designation', 'Phone', 'Status']];
          body = items.map(e => [e.id, e.name, e.designation || e.role, e.phone || '-', e.status]);
        } else { // reportCategory === 'leave'
          head = [['Emp ID', 'Name', 'Designation', reportType === 'day-permission' ? 'Duration' : 'Status']];
          body = items.map(req => {
            const details = empLookup[req.employee_id || req.employeeId] || {};
            return [req.employee_id || req.employeeId, req.employee_name || details.name, details.designation || '-', reportType === 'day-permission' ? req.duration : 'Absent'];
          });
        }

        autoTable(doc, {
          startY: yPos,
          head: head,
          body: body,
          headStyles: { fillColor: deptName === 'Unknown' ? [100, 100, 100] : [59, 130, 246] }
        });
        yPos = doc.lastAutoTable.finalY + 15;
      });
    }

    if (action === 'download') {
      doc.save(`${title.replace(/ /g, '_')}.pdf`);
    } else {
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const downloadCSV = () => {
    const title = getReportTitle();
    let rows = [['Report:', title], ['Date:', new Date().toLocaleString()], []];

    if (reportCategory === 'leave') {
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
    } else if (reportCategory === 'time') {
      rows.push(['Employee ID', 'Employee Name', 'Date', 'IN Time', 'OUT Time', 'Working Hours', 'Late Minutes', 'Permission Minutes', 'Status']);
      Object.entries(reportData).forEach(([empId, records]) => {
        const emp = empLookup[empId] || { name: empId };
        records.forEach(r => {
          rows.push([
            empId,
            emp.name,
            r.date,
            r.inTime || '-',
            r.outTime || '-',
            r.workingHours ? Math.abs(r.workingHours).toFixed(2) : '0.00',
            r.lateMinutes > 0 ? `${r.lateMinutes}m` : '-',
            r.permissionMinutes > 0 ? `${r.permissionMinutes}m` : '-',
            r.status
          ]);
        });
      });
    } else if (reportCategory === 'user') {
      rows.push(['ID', 'Name', 'Email', 'Department', 'Role', 'Status']);
      reportData.forEach(u => {
        rows.push([u.id, u.name, u.email, u.department, u.role, u.status]);
      });
    } else if (reportCategory === 'holiday') {
      rows.push(['Holiday Name', 'From Date', 'To Date', 'Type']);
      reportData.forEach(h => {
        rows.push([h.name, h.fromDate, h.toDate, h.type]);
      });
    } else if (reportCategory === 'directory') {
      rows.push(['Department', 'ID', 'Name', 'Designation', 'Phone', 'Status']);
      Object.entries(reportData).forEach(([deptName, employees]) => {
        employees.forEach(e => {
          rows.push([deptName, e.id, e.name, e.designation || e.role, e.phone || '-', e.status]);
        });
      });
    }

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
    <div className="reports" style={{ padding: '0 24px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* CATEGORY NAV */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {[
          { id: 'leave', label: 'Leave Report', icon: <svg viewBox="0 0 24 24" width="24" height="24"><path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" /></svg>, color: '#4f46e5' },
          { id: 'user', label: 'User Report', icon: <svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>, color: '#c026d3' },
          { id: 'time', label: 'Time Report', icon: <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>, color: '#7c3aed' },
          { id: 'holiday', label: 'Holidays Report', icon: <svg viewBox="0 0 24 24" width="24" height="24"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>, color: '#0891b2' },
          { id: 'directory', label: 'Employee Report', icon: <svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>, color: '#16a34a' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setReportCategory(reportCategory === cat.id ? null : cat.id);
              setReportData({});
              if (cat.id === 'time') setReportType('time-monthly');
              else if (cat.id === 'leave') setReportType('day-leave');
              else setReportType('');
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = cat.color; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = reportCategory === cat.id ? cat.color : '#f1f5f9'; }}
            style={{
              padding: '24px 16px',
              borderRadius: '12px',
              border: '2px solid',
              borderColor: reportCategory === cat.id ? cat.color : '#f1f5f9',
              background: reportCategory === cat.id ? `${cat.color}08` : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: reportCategory === cat.id ? `0 8px 16px ${cat.color}15` : '0 2px 4px rgba(0,0,0,0.02)',
              minHeight: '120px'
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: reportCategory === cat.id ? cat.color : `${cat.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s'
            }}>
              {React.cloneElement(cat.icon, {
                width: '24', height: '24',
                fill: reportCategory === cat.id ? 'white' : cat.color,
                stroke: 'none'
              })}
            </div>
            <span style={{ fontWeight: '700', color: reportCategory === cat.id ? '#1e293b' : '#64748b', fontSize: '14px', textAlign: 'center', lineHeight: '1.2' }}>
              {cat.label.split(' ')[0]}<br />{cat.label.split(' ')[1]}
            </span>
          </button>
        ))}
      </div>

      {/* DASHBOARD OVERVIEW (ANALYTICS) */}
      {!reportCategory && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* Left Column: Summary Stats */}
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: '800' }}>Overall Summary</h3>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#22c55e', background: '#f0fdf4', padding: '4px 10px', borderRadius: '100px' }}>● Live Today</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {[
                { label: 'Total Staff', value: overallSummary.totalEmployees, icon: '👥', color: '#6366f1' },
                { label: 'Present', value: overallSummary.presentToday, icon: '✅', color: '#22c55e' },
                { label: 'On Leave', value: overallSummary.onLeaveToday, icon: '🏖️', color: '#ef4444' },
                { label: 'Short Permission', value: overallSummary.permissionsToday, icon: '⏱️', color: '#f59e0b' }
              ].map((stat, i) => (
                <div key={i} style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'white', border: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    {stat.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{stat.value}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Department distribution */}
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#1e293b', fontWeight: '800' }}>Department Load</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {overallSummary.deptData.slice(0, 4).map((dept, i) => {
                const percentage = overallSummary.totalEmployees > 0 ? (dept.count / overallSummary.totalEmployees) * 100 : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', fontWeight: '700' }}>
                      <span style={{ color: '#64748b' }}>{dept.name}</span>
                      <span style={{ color: '#6366f1' }}>{dept.count}</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: '#6366f1',
                        borderRadius: '10px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {reportCategory && (
        <>
          {/* Controls Container */}
          <div style={{
            background: 'white',
            padding: '16px 24px',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'end',
            marginBottom: '16px',
            border: '1px solid #f1f5f9'
          }}>

            {/* Dynamic Selectors based on category */}
            {reportCategory === 'leave' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => { setReportType(e.target.value); setReportData({}); }}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', fontWeight: '600', minWidth: '220px', outline: 'none' }}
                >
                  <option value="day-leave">Day Wise (Absent Stats)</option>
                  <option value="day-permission">Day Wise (Permission)</option>
                  <option value="weekly">Weekly Report</option>
                  <option value="monthly">Monthly Report</option>
                </select>
              </div>
            )}

            {reportCategory === 'time' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Time Report Scope</label>
                <select
                  value={reportType}
                  onChange={(e) => { setReportType(e.target.value); setReportData({}); }}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', fontWeight: '600', minWidth: '220px', outline: 'none' }}
                >
                  <option value="time-daily">Daily Audit</option>
                  <option value="time-weekly">Weekly Summary</option>
                  <option value="time-monthly">Monthly Record</option>
                </select>
              </div>
            )}

            {/* Date/Month Params */}
            {(reportType === 'day-leave' || reportType === 'day-permission' || reportType === 'time-daily') && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Select Date</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </div>
            )}

            {(reportType === 'weekly' || reportType === 'time-weekly') && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Select Week</label>
                <input type="week" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </div>
            )}

            {(reportType === 'monthly' || reportType === 'time-monthly') && (
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Month</label>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Year</label>
                  <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '90px' }} />
                </div>
              </div>
            )}

            {reportCategory === 'time' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Employee ID (Optional)</label>
                <input type="text" value={reportEmployeeId} placeholder="Ex: DM3011" onChange={(e) => setReportEmployeeId(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
              {loading && <span style={{ color: '#64748b', fontSize: '14px', alignSelf: 'center' }}>Updating...</span>}

              {Object.keys(reportData).length > 0 && (
                <>
                  <button
                    onClick={() => handlePDFAction('view')}
                    style={{ padding: '10px 24px', borderRadius: '8px', background: '#6366f1', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    👁️ View PDF
                  </button>
                  <button
                    onClick={() => handlePDFAction('download')}
                    style={{ padding: '10px 24px', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    📄 Download PDF
                  </button>
                  <button
                    onClick={downloadCSV}
                    style={{ padding: '10px 24px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    📊 CSV
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Preview Section */}
          {Object.keys(reportData).length > 0 && (
            <div className="report-preview" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{getReportTitle()}</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {reportCategory === 'time' ? (
                  Object.entries(reportData).map(([empId, records]) => {
                    const emp = empLookup[empId] || { name: empId };
                    return (
                      <div key={empId} className="preview-emp-section">
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginBottom: '12px' }}>
                          <h4 style={{ margin: 0 }}>{emp.name} ({empId})</h4>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>IN</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>OUT</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Hours</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                                  <td style={{ padding: '8px' }}>{r.date}</td>
                                  <td style={{ padding: '8px' }}>{r.inTime || '-'}</td>
                                  <td style={{ padding: '8px' }}>{r.outTime || '-'}</td>
                                  <td style={{ padding: '8px' }}>{Math.abs(r.workingHours || 0).toFixed(2)}</td>
                                  <td style={{ padding: '8px' }}>{r.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })
                ) : reportCategory === 'user' ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f1f5f9' }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Dept</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Role</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(reportData) && reportData.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>{u.id}</td>
                          <td style={{ padding: '12px' }}>{u.name}</td>
                          <td style={{ padding: '12px' }}>{u.department}</td>
                          <td style={{ padding: '12px' }}>{u.role}</td>
                          <td style={{ padding: '12px' }}>{u.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : reportCategory === 'holiday' ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f1f5f9' }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>From</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>To</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(reportData) && reportData.map((h, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>{h.name}</td>
                          <td style={{ padding: '12px' }}>{h.fromDate}</td>
                          <td style={{ padding: '12px' }}>{h.toDate}</td>
                          <td style={{ padding: '12px' }}>{h.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  Object.entries(reportData).map(([deptName, items]) => (
                    <div key={deptName} style={{ marginBottom: '16px' }}>
                      <h4 style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginBottom: '16px' }}>{deptName}</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>{reportCategory === 'directory' ? 'ID' : 'Emp ID'}</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>{reportCategory === 'directory' ? 'Designation' : 'Ref'}</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                              <td style={{ padding: '12px' }}>{item.id || item.employee_id || item.employeeId}</td>
                              <td style={{ padding: '12px' }}>{item.name || item.employee_name}</td>
                              <td style={{ padding: '12px' }}>{item.designation || item.role || item.duration || '-'}</td>
                              <td style={{ padding: '12px' }}>{item.status || 'Absent'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


export default Reports;
