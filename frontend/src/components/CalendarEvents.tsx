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

  const today = new Date();

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysInMonth = Array.from(
    { length: lastDayOfMonth.getDate() },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1)
  );

  const getWeekdayIndex = (date: Date) => {
    const dayIndex = date.getDay();
    return dayIndex === 0 ? 6 : dayIndex - 1;
  };

  const startDayOfWeek = getWeekdayIndex(firstDayOfMonth);
  const prevMonthDays = [];
  if (startDayOfWeek !== 0) {
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    for (let i = startDayOfWeek; i > 0; i--) {
      prevMonthDays.push(new Date(prevMonthLastDay.getFullYear(), prevMonthLastDay.getMonth(), prevMonthLastDay.getDate() - i + 1));
    }
  }

  const calendarDays = [
    ...prevMonthDays.map((day) => ({ date: day, isCurrentMonth: false })),
    ...daysInMonth.map((day) => ({ date: day, isCurrentMonth: true })),
  ];

  const eventDays = events.reduce((acc: Record<string, boolean>, event) => {
    const date = new Date(event.start.dateTime || event.start.date);
    const dayKey = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`;
    acc[dayKey] = true;
    return acc;
  }, {});

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="calendar-section">
      <div className="calendar-weekdays">
        {weekdays.map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarDays.map(({ date, isCurrentMonth }) => {
          const dayKey = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`;
          const isToday =
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

          return (
            <div
              key={dayKey}
              className={`calendar-day ${!isCurrentMonth ? 'prev-month-day' : ''
                } ${isToday ? 'current-day' : ''} ${eventDays[dayKey] ? 'has-event' : ''}`}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

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
          <p>Нет событий в этом месяце</p>
        )}
      </ul>
    </div>
  );
};

export default CalendarEvents;