/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const TasksList: React.FC = () => {
  const [tasklists, setTasklists] = useState<any[]>([]);
  const [selectedTasklistId, setSelectedTasklistId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  // Закрытие попапов при клике вне их области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDatePickerOpen &&
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setIsDatePickerOpen(false);
      }
      if (
        isTimePickerOpen &&
        timePickerRef.current &&
        !timePickerRef.current.contains(event.target as Node)
      ) {
        setIsTimePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePickerOpen, isTimePickerOpen]);

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

    try {
      const taskData: any = {
        title: newTaskInput,
        list_id: selectedTasklistId, // ID списка задач
      };

      // Добавляем дату, если она указана
      if (dueDate) {
        taskData.due = dueDate;
      }

      // Добавляем время, если оно указано
      if (dueTime) {
        taskData.time = dueTime;
      }

      // Создаём задачу на сервере
      await axios.post('/api/tasks', taskData);

      // После успешного создания задачи переполучаем список задач
      if (selectedTasklistId) {
        handleTasklistSelect(selectedTasklistId);
      }

      // Очищаем поля ввода
      setNewTaskInput('');
      setDueDate('');
      setDueTime('');
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

      {selectedTasklistId && (
        <div>
          <div className="add-task">
            <input
              type="text"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              placeholder="Название задачи"
              style={{ width: 'calc(100% - 80px)' }}
            />

            <button
              className="time-icon"
              onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
            >
              <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </button>

            {isTimePickerOpen && (
              <div className="time-picker-popup" ref={timePickerRef}>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
            )}

            <button
              className="date-icon"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            >
              <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </button>

            {isDatePickerOpen && (
              <div className="date-picker-popup" ref={datePickerRef}>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            )}

            <button onClick={handleAddTask}>
              <svg enable-background="new 0 0 24 24" focusable="false" height="24" viewBox="0 0 24 24" width="24"><rect fill="none" height="24" width="24"></rect><path d="M22,5.18L10.59,16.6l-4.24-4.24l1.41-1.41l2.83,2.83l10-10L22,5.18z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8 c1.57,0,3.04,0.46,4.28,1.25l1.45-1.45C16.1,2.67,14.13,2,12,2C6.48,2,2,6.48,2,12s4.48,10,10,10c1.73,0,3.36-0.44,4.78-1.22 l-1.5-1.5C14.28,19.74,13.17,20,12,20z M19,15h-3v2h3v3h2v-3h3v-2h-3v-3h-2V15z"></path></svg>
            </button>
          </div>

          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className="task-item">
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
                      <>
                        <div className="task-date">
                          <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" stroke-linecap="round" stroke-linejoin="round"></path>
                          </svg>
                          {new Date(task.due).getFullYear() !== new Date().getFullYear() ||
                            new Date(task.due).getMonth() !== new Date().getMonth() ||
                            new Date(task.due).getDate() !== new Date().getDate() ? (
                            <span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-calendar" viewBox="0 0 16 16">
                                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                              </svg>
                              {new Date(task.due).toLocaleDateString([], {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })}
                            </span>
                          ) : null}
                        </div>
                        <div className="task-time">
                          <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke-linecap="round" stroke-linejoin="round"></path>
                          </svg>
                          {new Date(task.due).getHours() !== 0 || new Date(task.due).getMinutes() !== 0 ? (
                            <span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-clock" viewBox="0 0 16 16">
                                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
                              </svg>
                              {new Date(task.due).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : null}
                        </div>
                      </>
                    )}
                    <button className="task-delete-button" onClick={() => handleTaskDelete(task.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                        className="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>Нет задач</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TasksList;