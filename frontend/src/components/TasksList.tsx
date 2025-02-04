/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TasksList: React.FC = () => {
  const [tasklists, setTasklists] = useState<any[]>([]);
  const [selectedTasklistId, setSelectedTasklistId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskInput, setNewTaskInput] = useState('');

  // Загрузка списков задач при монтировании компонента
  useEffect(() => {
    const loadTaskLists = async () => {
      try {
        const response = await axios.get('/api/tasklists');
        const data = response.data;
        if (Array.isArray(data)) {
          setTasklists(data);
          if (data.length > 0) {
            setSelectedTasklistId(data[0].id);
          }
        } else {
          console.error('Invalid data format for task lists:', data);
          setTasklists([]);
        }
      } catch (error) {
        console.error('Error fetching task lists:', error);
        setTasklists([]);
      }
    };
    loadTaskLists();
  }, []);

  // Загрузка задач при выборе списка задач
  useEffect(() => {
    if (selectedTasklistId) {
      handleTasklistSelect(selectedTasklistId);
    }
  }, [selectedTasklistId]);

  // Функция для получения задач из выбранного списка
  const handleTasklistSelect = async (id: string) => {
    setSelectedTasklistId(id);
    try {
      const response = await axios.get(`/api/tasks?list_id=${id}`);
      const data = response.data;
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        console.error('Invalid data format for tasks:', data);
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    }
  };

  // Обработка добавления новой задачи
  const handleAddTask = async () => {
    if (!newTaskInput.trim()) return;

    // Парсим строку задачи
    const match = newTaskInput.match(/^(.*?)\s*(?:@(\d{2}:\d{2}))?$/);
    if (!match) return;

    const title = match[1].trim(); // Название задачи
    const time = match[2];         // Время уведомления

    try {
      const taskData = {
        title,
        due: new Date().toISOString().split('T')[0], // Текущая дата
        time: time || undefined,                    // Передаём время, если оно указано
        list_id: selectedTasklistId,               // ID списка задач
      };

      const response = await axios.post('/api/tasks', taskData);
      const newTask = response.data;
      setTasks([...tasks, newTask]);
      setNewTaskInput('');           // Очищаем поле ввода
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  // Обработка завершения задачи
  const handleCompleteTask = async (taskId: string) => {
    try {
      await axios.put(`/api/tasks/${taskId}`, { status: 'completed' });
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: 'completed' } : task
      ));
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  // Обработка удаления задачи
  const handleTaskDelete = async (taskId: string) => {
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return (
    <div className="tasks-section">
      {/* Выбор списка задач */}
      <div className="tasklist-dropdown">
        <select
          value={selectedTasklistId || ''}
          onChange={(e) => handleTasklistSelect(e.target.value)}
        >
          <option value="">Выбрать список задач</option>
          {tasklists.map((tasklist) => (
            <option key={tasklist.id} value={tasklist.id}>
              {tasklist.title}
            </option>
          ))}
        </select>
      </div>

      {/* Отображение задач */}
      {selectedTasklistId && (
        <div>
          {/* Поле для добавления новой задачи */}
          <div className="add-task">
            <input
              type="text"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              placeholder="Название задачи @время"
            />
            <button onClick={handleAddTask}>
              <svg enable-background="new 0 0 24 24" focusable="false" height="24" viewBox="0 0 24 24" width="24"><rect fill="none" height="24" width="24"></rect><path d="M22,5.18L10.59,16.6l-4.24-4.24l1.41-1.41l2.83,2.83l10-10L22,5.18z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8 c1.57,0,3.04,0.46,4.28,1.25l1.45-1.45C16.1,2.67,14.13,2,12,2C6.48,2,2,6.48,2,12s4.48,10,10,10c1.73,0,3.36-0.44,4.78-1.22 l-1.5-1.5C14.28,19.74,13.17,20,12,20z M19,15h-3v2h3v3h2v-3h3v-2h-3v-3h-2V15z"></path></svg>
            </button>
          </div>

          {/* Список задач */}
          <ul className="tasks-list">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <li key={task.id} className="task-item">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleCompleteTask(task.id)}
                  />
                  <div className="task-item-inner">
                    <span className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                      {task.title}
                    </span>
                    <div className="task-item-inner-bottom">
                      {task.due && (
                        <div className="task-time">
                          {new Date(task.due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      <button
                        className="task-delete-button"
                        onClick={() => handleTaskDelete(task.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <p>Нет задач</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TasksList;