import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

interface TaskList {
    id: string;
    title: string;
}

export const useTaskLists = () => {
    const [tasklists, setTasklists] = useState<TaskList[]>([]);
    const [selectedTasklistId, setSelectedTasklistId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTaskLists = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/tasklists');
            const data = response.data;
            if (Array.isArray(data)) {
                setTasklists(data);
                if (data.length > 0) setSelectedTasklistId(data[0].id);
            } else {
                throw new Error('Неверный формат данных для списков задач');
            }
        } catch (err) {
            setError('Ошибка загрузки списков задач');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTaskLists();
    }, [loadTaskLists]);

    return { tasklists, selectedTasklistId, setSelectedTasklistId, isLoading, error };
};