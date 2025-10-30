import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useCompletedTasksCount = (tasks: any[]) => {
    const [completedTasksCount, setCompletedTasksCount] = useState(0);

    const getCompletedTasksCount = useCallback(async () => {
        try {
            const response = await axios.get('/api/completed_tasks_count');
            setCompletedTasksCount(response.data.completed_tasks_count);
        } catch (error) {
            console.error('Ошибка загрузки счётчика завершённых задач:', error);
        }
    }, []);

    useEffect(() => {
        getCompletedTasksCount();
    }, [tasks, getCompletedTasksCount]);

    return completedTasksCount;
};