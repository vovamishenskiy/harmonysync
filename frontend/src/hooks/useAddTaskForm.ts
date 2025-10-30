import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useClickOutside } from './useClickOutside';

export const useAddTaskForm = (selectedTasklistId: string | null, loadTasks: () => Promise<void>) => {
    const [newTaskInput, setNewTaskInput] = useState('');
    const [dueDate, setDueDate] = useState<string>('');
    const [dueTime, setDueTime] = useState<string>('');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const datePickerRef = useRef<HTMLDivElement>(null);
    const timePickerRef = useRef<HTMLDivElement>(null);

    useClickOutside(datePickerRef, () => setIsDatePickerOpen(false));
    useClickOutside(timePickerRef, () => setIsTimePickerOpen(false));

    const handleAddTask = useCallback(async () => {
        if (!newTaskInput.trim() || !selectedTasklistId) return;
        setError(null);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const taskData: any = { title: newTaskInput, list_id: selectedTasklistId };
            if (dueDate) taskData.due = dueDate;
            if (dueTime) taskData.time = dueTime;
            await axios.post('/api/tasks', taskData);
            await loadTasks();
            setNewTaskInput('');
            setDueDate('');
            setDueTime('');
        } catch (err) {
            setError('Ошибка добавления задачи');
            console.error(err);
        }
    }, [newTaskInput, selectedTasklistId, dueDate, dueTime, loadTasks]);

    return {
        newTaskInput,
        setNewTaskInput,
        dueDate,
        setDueDate,
        dueTime,
        setDueTime,
        isDatePickerOpen,
        setIsDatePickerOpen,
        isTimePickerOpen,
        setIsTimePickerOpen,
        datePickerRef,
        timePickerRef,
        handleAddTask,
        error,
    };
};