import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

export const useCalendarEvents = (currentYear: number, currentMonth: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadEvents = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get('/api/calendar/events');
                const data = response.data;
                if (Array.isArray(data)) {
                    setEvents(data);
                } else {
                    throw new Error('Неверный формат данных для событий календаря');
                }
            } catch (err) {
                setError('Ошибка загрузки событий календаря');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadEvents();
    }, []);

    const currentMonthEvents = useMemo(() => events.filter((event) => {
        const startDate = new Date(event.start.dateTime || event.start.date);
        return startDate.getFullYear() === currentYear && startDate.getMonth() === currentMonth;
    }), [events, currentYear, currentMonth]);

    return { events: currentMonthEvents, isLoading, error };
};