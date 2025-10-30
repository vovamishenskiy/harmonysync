import React, { useState } from 'react';
import { useCalendarData } from '../hooks/useCalendarData';
import { useCalendarEvents } from '../hooks/useCalendarEvents';

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

  if (isLoading) return <p>Загрузка событий...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="calendar-section">
      <div className="calendar-header">
        <button onClick={handlePrevMonth} className="calendar-nav">◀</button>
        <h2 className="calendar-month">{monthName} {currentYear}</h2>
        <button onClick={handleNextMonth} className="calendar-nav">▶</button>
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
              className={`calendar-day ${!isCurrentMonth ? 'other-month-day' : ''} ${isToday ? 'current-day' : ''} ${eventDays[dayKey] ? 'has-event' : ''}`}
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