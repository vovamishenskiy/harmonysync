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
      const newTask = response.data.task;

      setTasks([...tasks, newTask]); // Добавляем задачу в список
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
              Добавить
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
                        Удалить
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