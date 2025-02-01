/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { fetchCalendarEvents } from '../api/api';

const CalendarEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [currentMonthEvents, setCurrentMonthEvents] = useState<any[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await fetchCalendarEvents();
        if (Array.isArray(data)) {
          setEvents(data);
          setCurrentMonthEvents(data);
        } else {
          console.error('Invalid data format for calendar events:', data);
          setEvents([]);
          setCurrentMonthEvents([]);
        }
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        setEvents([]);
        setCurrentMonthEvents([]);
      }
    };
    loadEvents();
  }, []);

  // Генерация дней месяца
  const today = new Date();
  const daysInMonth = Array.from(
    { length: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1)
  );

  // Определение дней с событиями
  const eventDays = events.reduce((acc: Record<string, boolean>, event) => {
    const date = new Date(event.start.dateTime || event.start.date);
    const dayKey = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`;
    acc[dayKey] = true;
    return acc;
  }, {});

  return (
    <div className="calendar-section">
      <h2 className="calendar-header">Calendar</h2>
      <div className="calendar-grid">
        {daysInMonth.map((day) => {
          const dayKey = `${day.getDate()}-${day.getMonth()}-${day.getFullYear()}`;
          return (
            <div
              key={dayKey}
              className={`calendar-day ${eventDays[dayKey] ? 'has-event' : ''}`}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>

      <h3>Events in Current Month</h3>
      <ul className="calendar-events-list">
        {Array.isArray(currentMonthEvents) && currentMonthEvents.length > 0 ? (
          currentMonthEvents.map((event) => (
            <li key={event.id} className="calendar-event">
              <span className="calendar-event-summary">{event.summary}</span>
              <br />
              <span className="calendar-event-time">
                {new Date(event.start.dateTime || event.start.date).toLocaleString()}
              </span>
            </li>
          ))
        ) : (
          <p>No events available.</p>
        )}
      </ul>
    </div>
  );
};

export default CalendarEvents;