import React, { useState, useEffect, useCallback } from 'react';
import { dataService } from '../utils/dataService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './AttendanceManagement.css';

const AttendanceManagement = ({ currentUser, permissions, onSaveSuccess }) => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [stats, setStats] = useState({
        present: 0,
        late: 0,
        permission: 0,
        extraTime: 0
    });
    const [message, setMessage] = useState(null);
    const [viewMode, setViewMode] = useState('morning'); // morning, full
    const [resultsMode, setResultsMode] = useState('daily'); // daily, reports
    const [reportFilters, setReportFilters] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        employeeId: '',
        department: ''
    });

    const [yesterdayData, setYesterdayData] = useState({}); // { empId: { outTime, ... } }
    const [todayData, setTodayData] = useState({}); // { empId: { inTime, ... } }
    const [yesterdayStr, setYesterdayStr] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            await dataService.fetchAllEmployeesFromDB();
            const activeEmployees = dataService.getActiveEmployees() || [];

            const dateObj = new Date(selectedDate);
            const yesterday = new Date(selectedDate);
            yesterday.setDate(yesterday.getDate() - 1);

            // If selectedDate is Monday (1), previous working day is Saturday (subtract 2 total)
            if (dateObj.getDay() === 1 && yesterday.getDay() === 0) {
                yesterday.setDate(yesterday.getDate() - 1);
            }

            const processedYesterdayStr = yesterday.toISOString().split('T')[0];
            setYesterdayStr(processedYesterdayStr);

            // Fetch records for both days
            const [todayRecords, yesterdayRecords] = await Promise.all([
                dataService.getAttendanceByDate(selectedDate),
                dataService.getAttendanceByDate(processedYesterdayStr)
            ]);

            const todayMap = {};
            todayRecords.forEach(record => { todayMap[record.employeeId] = record; });

            const yesterdayMap = {};
            yesterdayRecords.forEach(record => { yesterdayMap[record.employeeId] = record; });

            setEmployees(activeEmployees);
            setTodayData(todayMap);
            setYesterdayData(yesterdayMap);

            // Calculate stats for today
            let p = 0, l = 0, per = 0, e = 0;
            todayRecords.forEach(r => {
                if (r.inTime) p++;
                if (r.isLate) l++;
                if (r.isPermission) per++;
                if (r.isExtra) e++;
            });
            setStats({ present: p, late: l, permission: per, extraTime: e });

        } catch (error) {
            console.error('Error loading attendance data:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleTimeChange = (empId, field, value, isYesterday = false) => {
        const setData = isYesterday ? setYesterdayData : setTodayData;
        const dateStr = isYesterday ? yesterdayStr : selectedDate;

        setData(prev => {
            const current = prev[empId] || { inTime: '', outTime: '', employeeId: empId, date: dateStr };
            const updated = { ...current, [field]: value };

            const metrics = dataService.calculateAttendanceMetrics(updated.inTime, updated.outTime);
            return {
                ...prev,
                [empId]: { ...updated, ...metrics }
            };
        });
    };

    const handleSaveRecord = async (empId, isYesterday = false, refresh = true) => {
        const data = isYesterday ? yesterdayData : todayData;
        const record = data[empId];
        if (!record) return;

        const result = await dataService.saveAttendanceRecord(record);
        if (result.success) {
            if (refresh) await loadData();
            if (onSaveSuccess) onSaveSuccess();
        } else {
            setMessage({ type: 'error', text: `Failed to save: ${result.error}` });
        }
    };

    const handleBulkSave = async () => {
        setLoading(true);
        const recordsToSave = [
            ...Object.values(todayData),
            ...Object.values(yesterdayData)
        ].filter(r => r.inTime || r.outTime);

        const promises = recordsToSave.map(record =>
            dataService.saveAttendanceRecord(record)
        );
        await Promise.all(promises);
        setMessage({ type: 'success', text: 'All records (Today & Yesterday) saved successfully' });
        setTimeout(() => setMessage(null), 3000);
        await loadData();
        if (onSaveSuccess) onSaveSuccess();
    };

    const handleReportAction = (reportDate = selectedDate, action = 'download') => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text(`Time Management Report - ${reportDate}`, 14, 20);

        // Decide which data source to use
        const dataToUse = reportDate === yesterdayStr ? yesterdayData : todayData;

        const tableData = filteredEmployees.map(emp => {
            const att = dataToUse[emp.id] || {};
            return [
                emp.id,
                emp.name,
                emp.department,
                att.inTime || '-',
                att.outTime || '-',
                att.status || 'Absent'
            ];
        });

        autoTable(doc, {
            startY: 30,
            head: [['ID', 'Name', 'Department', 'IN Time', 'OUT Time', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }
        });

        if (action === 'download') {
            doc.save(`Time_Report_${reportDate}.pdf`);
        } else {
            window.open(doc.output('bloburl'), '_blank');
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!permissions.viewAttendance) {
        return (
            <div className="restricted-overlay">
                <div className="lock-icon">🔐</div>
                <h2>Access Restricted</h2>
                <p>You do not have permission to view Time Management.</p>
            </div>
        );
    }

    return (
        <div className="attendance-management-container">
            {/* STICKY DATE HEADER */}
            <div className="attendance-date-header" style={{
                background: '#4f46e5',
                margin: '-32px -32px 32px -32px',
                padding: '20px 32px',
                borderRadius: '24px 24px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'white',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Attendance Date Selection</h2>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontWeight: '700',
                                outline: 'none',
                                fontSize: '16px',
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                        style={{
                            background: 'white',
                            color: '#4f46e5',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Go to Today
                    </button>
                </div>
                <div className="search-group" style={{ margin: 0 }}>
                    <input
                        type="text"
                        placeholder="Search employee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            background: 'white',
                            border: 'none',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            width: '240px',
                            fontSize: '14px'
                        }}
                    />
                </div>
            </div>

            {/* MESSAGE INDICATOR FOR PAST DATES */}
            {selectedDate !== new Date().toISOString().split('T')[0] && (
                <div style={{
                    background: '#fff7ed',
                    border: '1px solid #ffedd5',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    color: '#9a3412',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span>📅</span> You are viewing/editing attendance for a past date: <strong>{new Date(selectedDate).toLocaleDateString()}</strong>
                </div>
            )}

            {/* VIEW MODE TOGGLE */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: '#f1f5f9', padding: '8px', borderRadius: '12px', width: 'fit-content' }}>
                <button
                    onClick={() => setViewMode('morning')}
                    style={{
                        padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        background: viewMode === 'morning' ? 'white' : 'transparent',
                        boxShadow: viewMode === 'morning' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                        fontWeight: '700', color: viewMode === 'morning' ? '#4f46e5' : '#64748b'
                    }}
                >
                    Morning Entry
                </button>
                <button
                    onClick={() => setViewMode('full')}
                    style={{
                        padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        background: viewMode === 'full' ? 'white' : 'transparent',
                        boxShadow: viewMode === 'full' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                        fontWeight: '700', color: viewMode === 'full' ? '#4f46e5' : '#64748b'
                    }}
                >
                    Full Day View
                </button>
            </div>


            {message && (
                <div className={`notification-banner ${message.type}`} style={{ padding: '12px', marginBottom: '20px', borderRadius: '8px' }}>
                    {message.text}
                </div>
            )}

            {/* ATTENDANCE TABLE */}
            <div className="attendance-table-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            {viewMode === 'morning' ? (
                                <>
                                    <th style={{ background: '#fefce8', color: '#854d0e' }}>
                                        {yesterdayStr ? new Date(yesterdayStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Previous'} OUT Time
                                    </th>
                                    <th style={{ background: '#f0fdf4', color: '#166534' }}>
                                        {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} IN Time
                                    </th>
                                </>
                            ) : (
                                <>
                                    <th>IN Time</th>
                                    <th>OUT Time</th>
                                    <th>Working Hours</th>
                                </>
                            )}
                            <th>Status Indicators</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={viewMode === 'full' ? "6" : "4"} className="text-center" style={{ padding: '40px' }}>Loading Time Records...</td></tr>
                        ) : filteredEmployees.length === 0 ? (
                            <tr><td colSpan={viewMode === 'full' ? "6" : "4"} className="text-center" style={{ padding: '40px' }}>No employees found.</td></tr>
                        ) : filteredEmployees.map(emp => (
                            <tr key={emp.id} className={(todayData[emp.id]?.workingHours > 0 || yesterdayData[emp.id]?.outTime) ? 'row-active' : ''}>
                                <td>
                                    <div className="emp-cell">
                                        <span className="avatar">{emp.name.charAt(0)}</span>
                                        <div>
                                            <div className="name">{emp.name}</div>
                                            <div className="id">{emp.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{emp.department}</td>

                                {viewMode === 'morning' ? (
                                    <>
                                        <td style={{ background: '#fffbeb' }}>
                                            <input
                                                type="time"
                                                value={yesterdayData[emp.id]?.outTime || ''}
                                                onChange={(e) => handleTimeChange(emp.id, 'outTime', e.target.value, true)}
                                                onBlur={() => handleSaveRecord(emp.id, true, false)}
                                                className="time-input"
                                                disabled={!permissions.editAttendance && !permissions.manualAttendance}
                                            />
                                        </td>
                                        <td style={{ background: '#f0fdf4' }}>
                                            <input
                                                type="time"
                                                value={todayData[emp.id]?.inTime || ''}
                                                onChange={(e) => handleTimeChange(emp.id, 'inTime', e.target.value, false)}
                                                onBlur={() => handleSaveRecord(emp.id, false, false)}
                                                className="time-input"
                                                disabled={!permissions.editAttendance && !permissions.manualAttendance}
                                                style={{ borderColor: todayData[emp.id]?.inTime ? (todayData[emp.id]?.isLate ? '#ef4444' : '#10b981') : '#ddd' }}
                                            />
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td>
                                            <input
                                                type="time"
                                                value={todayData[emp.id]?.inTime || ''}
                                                onChange={(e) => handleTimeChange(emp.id, 'inTime', e.target.value, false)}
                                                onBlur={() => handleSaveRecord(emp.id, false, false)}
                                                className="time-input"
                                                disabled={!permissions.editAttendance && !permissions.manualAttendance}
                                                style={{ borderColor: todayData[emp.id]?.inTime ? (todayData[emp.id]?.isLate ? '#ef4444' : '#10b981') : '#ddd' }}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="time"
                                                value={todayData[emp.id]?.outTime || ''}
                                                onChange={(e) => handleTimeChange(emp.id, 'outTime', e.target.value, false)}
                                                onBlur={() => handleSaveRecord(emp.id, false, false)}
                                                className="time-input"
                                                disabled={!permissions.editAttendance && !permissions.manualAttendance}
                                            />
                                        </td>
                                        <td className="hours-cell" style={{ color: (todayData[emp.id]?.workingHours || 0) < 0 ? '#ef4444' : '#4f46e5' }}>
                                            {Math.abs(todayData[emp.id]?.workingHours || 0).toFixed(2)} hrs
                                        </td>
                                    </>
                                )}

                                <td>
                                    <div className="status-tags">
                                        {todayData[emp.id]?.isLate && <span className="tag late">LATE</span>}
                                        {todayData[emp.id]?.isPermission && <span className="tag permission">PERMISSION</span>}
                                        {viewMode === 'full' && todayData[emp.id]?.isExtra && <span className="tag extra">EXTRA</span>}
                                        {viewMode === 'full' && todayData[emp.id]?.isFullPresent && <span className="tag present">FULL</span>}
                                        {!todayData[emp.id]?.inTime && todayData[emp.id]?.status === 'Absent' && <span className="tag absent">ABSENT</span>}
                                        {todayData[emp.id]?.inTime && !todayData[emp.id]?.isLate && <span className="tag present">ON TIME</span>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ACTION BUTTONS AT BOTTOM */}
            <div style={{
                marginTop: '32px',
                padding: '24px',
                background: 'white',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                flexWrap: 'wrap'
            }}>
                {/* Previous Day Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginRight: '8px' }}>
                        {yesterdayStr ? new Date(yesterdayStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Previous'}:
                    </span>
                    <button
                        className="btn-secondary"
                        onClick={() => handleReportAction(yesterdayStr, 'view')}
                        style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        👁️ View
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => handleReportAction(yesterdayStr, 'download')}
                        style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        📥 Download
                    </button>
                </div>

                {/* Today Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginRight: '8px' }}>Today:</span>
                    <button
                        className="btn-secondary"
                        onClick={() => handleReportAction(selectedDate, 'view')}
                        style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        👁️ View
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => handleReportAction(selectedDate, 'download')}
                        style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        📋 Download
                    </button>
                </div>

                {(permissions.editAttendance || permissions.manualAttendance) && (
                    <button
                        className="btn-primary"
                        style={{
                            background: '#10b981',
                            padding: '12px 48px',
                            fontSize: '15px'
                        }}
                        onClick={handleBulkSave}
                    >
                        🚀 Submit Attendance
                    </button>
                )}
            </div>
        </div>
    );
};

export default AttendanceManagement;
