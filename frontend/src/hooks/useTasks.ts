import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';

interface Task {
    id: string;
    title: string;
    due_date?: string;
    due_time?: string;
    due?: string;
    status: 'pending' | 'completed';
    list_id: string;
    created_at: string;
    updated_at: string;
}

export const useTasks = (selectedTasklistId: string | null) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTasks = useCallback(async () => {
        if (!selectedTasklistId) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/api/tasks?list_id=${selectedTasklistId}`);
            const data = response.data;
            if (Array.isArray(data)) {
                setTasks(data);
            } else {
                throw new Error('Неверный формат данных для задач');
            }
        } catch (err) {
            setError('Ошибка загрузки задач');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedTasklistId]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const activeTasks = useMemo(() => tasks.filter(task => task.status !== 'completed'), [tasks]);
    const completedTasks = useMemo(() => tasks.filter(task => task.status === 'completed'), [tasks]);

    return { tasks, activeTasks, completedTasks, loadTasks, isLoading, error };
};