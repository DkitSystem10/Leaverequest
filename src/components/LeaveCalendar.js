import React, { useState, useEffect } from 'react';
import { dataService } from '../utils/dataService';
import './LeaveCalendar.css';

function LeaveCalendar({ user, scope = 'personal' }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [companyHolidays, setCompanyHolidays] = useState([]);

  useEffect(() => {
    if (user?.id) {
      generateCalendar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, user?.id, scope]);

  const generateCalendar = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get all requests for the current month
    const requests = await dataService.getMonthlySummary(year, month + 1);
    const holidays = await dataService.fetchHolidays();
    setCompanyHolidays(holidays);

    let displayRequests = requests;
    if (scope === 'personal') {
      displayRequests = requests.filter(req => (req.employee_id || req.employeeId) === user.id);
    }
    // For 'team', we show all requests (or could filter by manager's team if dataService supported it, but simpler to show all for now as per requirement)

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendar = [];
    let currentWeek = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRequests = displayRequests.filter(req => {
        const startDate = req.start_date || req.startDate;
        const endDate = req.end_date || req.endDate || startDate;
        const reqDate = new Date(startDate);
        const reqEndDate = new Date(endDate);
        const checkDate = new Date(dateStr);
        reqDate.setHours(0, 0, 0, 0);
        reqEndDate.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate >= reqDate && checkDate <= reqEndDate;
      });

      const dayHolidays = holidays.filter(h => {
        const startDate = new Date(h.fromDate);
        const endDate = new Date(h.toDate || h.fromDate);
        const checkDate = new Date(dateStr);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate >= startDate && checkDate <= endDate;
      });

      currentWeek.push({
        day,
        date: dateStr,
        requests: dayRequests,
        holidays: dayHolidays
      });

      if (currentWeek.length === 7) {
        calendar.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add empty cells for remaining days
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      calendar.push(currentWeek);
    }

    setCalendarData(calendar);
  };

  const getMonthName = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#28a745';
      case 'pending': return '#ffc107';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="leave-calendar">
      <div className="calendar-header">
        <button onClick={goToPreviousMonth} className="calendar-nav-btn">← Previous</button>
        <h2 className="calendar-month-title">{getMonthName()}</h2>
        <button onClick={goToNextMonth} className="calendar-nav-btn">Next →</button>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#28a745' }}></span>
          <span>Approved</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ffc107' }}></span>
          <span>Pending</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#dc3545' }}></span>
          <span>Rejected</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#7c3aed' }}></span>
          <span>Holiday</span>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>

        {calendarData.map((week, weekIndex) => (
          <div key={weekIndex} className="calendar-week">
            {week.map((dayData, dayIndex) => (
              <div
                key={dayIndex}
                className={`calendar-day ${dayData ? 'has-data' : 'empty'} ${selectedDate === dayData?.date ? 'selected' : ''}`}
                onClick={() => dayData && setSelectedDate(dayData.date === selectedDate ? null : dayData.date)}
              >
                {dayData && (
                  <>
                    <div className="calendar-day-number">{dayData.day}</div>
                    {dayData.holidays.length > 0 && (
                      <div className="calendar-holiday-indicator">🎉</div>
                    )}
                    {(dayData.requests.length > 0 || dayData.holidays.length > 0) && (
                      <div className="calendar-day-requests">
                        {dayData.holidays.map((h, idx) => (
                          <div
                            key={`h-${idx}`}
                            className="calendar-request-dot"
                            style={{ background: '#7c3aed' }}
                            title={`Holiday: ${h.name}`}
                          ></div>
                        ))}
                        {dayData.requests.map((req, idx) => (
                          <div
                            key={`r-${idx}`}
                            className="calendar-request-dot"
                            style={{ background: getStatusColor(req.status) }}
                            title={`${req.type} - ${req.status}`}
                          ></div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {selectedDate && (
        <div className="calendar-details">
          <h3>Details for {formatDate(selectedDate)}</h3>
          {(() => {
            const dayData = calendarData.flat().find(d => d?.date === selectedDate);
            const hasActivity = (dayData?.requests?.length > 0 || dayData?.holidays?.length > 0);

            if (!hasActivity) return <div className="no-requests">No requests or holidays for this date</div>;

            return (
              <div className="selected-date-requests">
                {/* Holidays first */}
                {dayData.holidays.map(h => (
                  <div key={`h-${h.id}`} className="request-detail-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                    <div className="request-detail-header">
                      <strong>🎉 Company Holiday</strong>
                      <span className="badge" style={{ background: '#f5f3ff', color: '#7c3aed' }}>{h.type}</span>
                    </div>
                    <div className="request-detail-info">
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#7c3aed', marginBottom: '4px' }}>{h.name}</div>
                      <div><strong>Duration:</strong> {formatDate(h.fromDate)} {h.toDate && h.toDate !== h.fromDate && ` to ${formatDate(h.toDate)}`}</div>
                    </div>
                  </div>
                ))}

                {/* Requests */}
                {dayData.requests.map(req => {
                  const reqType = req.type;
                  const startDate = req.start_date || req.startDate;
                  const endDate = req.end_date || req.endDate;
                  const startTime = req.start_time || req.startTime;
                  const endTime = req.end_time || req.endTime;
                  const reqStatus = req.status;
                  const reason = req.reason;

                  return (
                    <div key={req.id} className="request-detail-card">
                      <div className="request-detail-header">
                        <strong>{req.id}</strong>
                        <span className={`badge badge-${reqStatus}`}>{reqStatus}</span>
                      </div>
                      <div className="request-detail-info">
                        {scope === 'team' && (
                          <div><strong>Employee:</strong> {req.employee_name || req.employeeName || req.employee_id}</div>
                        )}
                        <div><strong>Type:</strong> {reqType}</div>
                        {reqType === 'leave' && (
                          <div><strong>Dates:</strong> {formatDate(startDate)} to {formatDate(endDate)}</div>
                        )}
                        {reqType === 'permission' && (
                          <div><strong>Time:</strong> {startTime} - {endTime}</div>
                        )}
                        <div><strong>Reason:</strong> {reason}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default LeaveCalendar;

