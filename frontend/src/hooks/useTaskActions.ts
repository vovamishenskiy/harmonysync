import { useCallback } from 'react';
import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useTaskActions = (setTasks: React.Dispatch<React.SetStateAction<any[]>>) => {
    const handleCompleteTask = useCallback(async (taskId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        try {
            await axios.put(`/api/tasks/${taskId}`, { status: newStatus });
            setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: newStatus } : task));
        } catch (error) {
            console.error('Ошибка завершения задачи:', error);
        }
    }, [setTasks]);

    const handleTaskDelete = useCallback(async (taskId: string) => {
        try {
            await axios.delete(`/api/tasks/${taskId}`);
            setTasks(prev => prev.filter(task => task.id !== taskId));
        } catch (error) {
            console.error('Ошибка удаления задачи:', error);
        }
    }, [setTasks]);

    return { handleCompleteTask, handleTaskDelete };
};