import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = '/api';

export const fetchTaskLists = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/tasks`);
        return response.data;
    } catch (error) {
        console.error('Error fetching task lists: ', error);
        throw error;
    }
};

export const fetchTasks = async (tasklistId: string) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/tasks/${tasklistId}/tasks`);
        return response.data;
    } catch (error) {
        console.error('Error fetching tasks: ', error);
        throw error;
    }
};

export const deleteTask = async (tasklistId: string, taskId: string) => {
    try {
        await axios.delete(`${API_BASE_URL}/tasks/${tasklistId}/tasks/${taskId}`);
    } catch (error) {
        console.error('Error deleting task: ', error);
        throw error;
    }
};

export const fetchCalendarEvents = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/calendar/events`);
        return response.data;
    } catch (error) {
        console.error('Error fetching calendar events: ', error);
        throw error;
    }
};

export const createCalendarTask = async (taskData: {
    title: string;
    due?: string;
    time?: string;
}) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/calendar/events`, taskData);
        return response.data;
    } catch (error) {
        console.error('Error creating calendar task: ', error);
        throw error;
    }
}