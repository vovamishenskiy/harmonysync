/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { fetchTaskLists, fetchTasks } from '../api/api';
import axios from 'axios';

const TasksList: React.FC = () => {
  const [tasklists, setTasklists] = useState<any[]>([]);
  const [selectedTasklistId, setSelectedTasklistId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    const loadTaskLists = async () => {
      try {
        const data = await fetchTaskLists();
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

  useEffect(() => {
    if (selectedTasklistId) {
      handleTasklistSelect(selectedTasklistId);
    }
  }, [selectedTasklistId]);

  const handleTasklistSelect = async (id: string) => {
    setSelectedTasklistId(id);
    try {
      const data = await fetchTasks(id);
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

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    axios.post(`/api/tasks/${selectedTasklistId}/tasks`, { title: newTaskTitle })
      .then(response => {
        setTasks([...tasks, response.data]);
        setNewTaskTitle('');
      })
      .catch(error => console.error('Error adding task:', error));
  };

  const handleCompleteTask = (taskId: any) => {
    axios.put(`/api/tasks/${selectedTasklistId}/tasks/${taskId}`, { status: 'completed' })
      .then(() => {
        setTasks(tasks.map(task =>
          task.id === taskId ? { ...task, status: 'completed' } : task
        ));
      })
      .catch(error => console.error('Error completing task:', error));
  };

  const handleTaskDelete = async (taskId: string) => {
    axios.delete(`/api/tasks/${selectedTasklistId}/tasks/${taskId}`)
      .then(() => {
        setTasks(tasks.filter(task => task.id !== taskId));
      })
      .catch(error => console.error('Error deleting task:', error));
  };

  return (
    <div className="tasks-section">
      <div className="tasklist-dropdown">
        <select
          value={selectedTasklistId || ''}
          onChange={(e) => handleTasklistSelect(e.target.value)}
        >
          <option value="">Select a task list</option>
          {tasklists.map((tasklist) => (
            <option key={tasklist.id} value={tasklist.id}>
              {tasklist.title}
            </option>
          ))}
        </select>
      </div>

      {selectedTasklistId && (
        <div>
          <h3>{tasklists.find((tl) => tl.id === selectedTasklistId)?.title}</h3>

          <div className="add-task">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Enter task title"
            />
            <button onClick={handleAddTask}>Добавить</button>
          </div>

          <ul className="tasks-list">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <li key={task.id} className="task-item">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleCompleteTask(task.id)}
                  />
                  <span className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                    {task.title}
                  </span>
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