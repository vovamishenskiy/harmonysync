/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
}

export const useCalendarData = (currentYear: number, currentMonth: number, events: any[]) => {
    const today = useMemo(() => new Date(), []);

    const calendarData = useMemo(() => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = Array.from(
            { length: lastDayOfMonth.getDate() },
            (_, i) => new Date(currentYear, currentMonth, i + 1)
        );

        const getWeekdayIndex = (date: Date) => {
            const dayIndex = date.getDay();
            return dayIndex === 0 ? 6 : dayIndex - 1;
        };

        const startDayOfWeek = getWeekdayIndex(firstDayOfMonth);
        const prevMonthDays: CalendarDay[] = [];
        if (startDayOfWeek !== 0) {
            const prevMonthLastDay = new Date(currentYear, currentMonth, 0);
            for (let i = startDayOfWeek; i > 0; i--) {
                const day = new Date(prevMonthLastDay.getFullYear(), prevMonthLastDay.getMonth(), prevMonthLastDay.getDate() - i + 1);
                prevMonthDays.push({ date: day, isCurrentMonth: false });
            }
        }

        const currentMonthDays: CalendarDay[] = daysInMonth.map((day) => ({ date: day, isCurrentMonth: true }));

        const totalDays = prevMonthDays.length + currentMonthDays.length;
        let remainingDays = 0;
        if (totalDays % 7 !== 0) {
            remainingDays = 7 - (totalDays % 7);
        }
        const nextMonthDays: CalendarDay[] = [];
        if (remainingDays > 0) {
            const nextMonthFirstDay = new Date(currentYear, currentMonth + 1, 1);
            for (let i = 1; i <= remainingDays; i++) {
                const day = new Date(nextMonthFirstDay.getFullYear(), nextMonthFirstDay.getMonth(), i);
                nextMonthDays.push({ date: day, isCurrentMonth: false });
            }
        }

        return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
    }, [currentYear, currentMonth]);

    const eventDays = useMemo(() => events.reduce((acc: Record<string, boolean>, event) => {
        const date = new Date(event.start.dateTime || event.start.date);
        const dayKey = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`;
        acc[dayKey] = true;
        return acc;
    }, {}), [events]);

    const monthName = useMemo(() => new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(new Date(currentYear, currentMonth)), [currentYear, currentMonth]);

    return { calendarData, eventDays, today, monthName };
};