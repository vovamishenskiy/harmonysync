/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useCalendarData } from '../hooks/useCalendarData';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import CalendarSkeleton from './CalendarSkeleton';

const CalendarEvents: React.FC = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const { events, isLoading, error } = useCalendarEvents(currentYear, currentMonth);
  const { calendarData, eventDays, today: currentToday, monthName } = useCalendarData(currentYear, currentMonth, events);

  const handlePrevMonth = () => {
    const newMonth = currentMonth - 1;
    setCurrentMonth(newMonth >= 0 ? newMonth : 11);
    if (newMonth < 0) setCurrentYear(currentYear - 1);
  };

  const handleNextMonth = () => {
    const newMonth = currentMonth + 1;
    setCurrentMonth(newMonth <= 11 ? newMonth : 0);
    if (newMonth > 11) setCurrentYear(currentYear + 1);
  };

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return <CalendarSkeleton />;
  if (isLoading) return <CalendarSkeleton />;
  if (error) return <p>{error}</p>;

  return (
    <div className="calendar-section">
      <div className="calendar-header">
        <button onClick={handlePrevMonth} className="calendar-nav">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h2 className="calendar-month">{monthName} {currentYear}</h2>
        <button onClick={handleNextMonth} className="calendar-nav">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      <div className="calendar-weekdays">
        {weekdays.map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarData.map(({ date, isCurrentMonth }) => {
          const dayKey = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`;
          const isToday =
            date.getDate() === currentToday.getDate() &&
            date.getMonth() === currentToday.getMonth() &&
            date.getFullYear() === currentToday.getFullYear();

          return (
            <div
              key={dayKey}
              className={`calendar-day ${!isCurrentMonth ? 'prev-month-day' : ''} ${isToday ? 'current-day' : ''} ${eventDays[dayKey] ? 'has-event' : ''}`}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <ul className="calendar-events-list">
        {events.length > 0 ? (
          events.map((event) => (
            <li key={event.id} className="calendar-event">
              <span className="calendar-event-summary">{event.summary}</span>
              <br />
              <span className="calendar-event-time">
                {new Date(event.start.dateTime || event.start.date).toLocaleString('ru-RU')}
              </span>
            </li>
          ))
        ) : (
          <p>Нет событий в этом месяце</p>
        )}
      </ul>
    </div>
  );
};

export default CalendarEvents;