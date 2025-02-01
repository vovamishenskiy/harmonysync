/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { fetchTaskLists, fetchTasks, deleteTask } from '../api/api';

const TasksList: React.FC = () => {
  const [tasklists, setTasklists] = useState<any[]>([]);
  const [selectedTasklistId, setSelectedTasklistId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const loadTaskLists = async () => {
      try {
        const data = await fetchTaskLists();
        if (Array.isArray(data)) {
          setTasklists(data);
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

  const handleTaskDelete = async (tasklistId: string, taskId: string) => {
    try {
      await deleteTask(tasklistId, taskId);
      setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return (
    <div className="tasks-section">
      <h2 className="calendar-header">Task Lists</h2>
      <ul className="tasks-list">
        {Array.isArray(tasklists) && tasklists.length > 0 ? (
          tasklists.map((tasklist) => (
            <li
              key={tasklist.id}
              className="tasklist-title"
              onClick={() => handleTasklistSelect(tasklist.id)}
            >
              {tasklist.title}
            </li>
          ))
        ) : (
          <p>No task lists available.</p>
        )}
      </ul>

      {selectedTasklistId && (
        <div>
          <h3>Tasks in "{tasklists.find((tl) => tl.id === selectedTasklistId)?.title}"</h3>
          <ul className="tasks-list">
            {Array.isArray(tasks) && tasks.length > 0 ? (
              tasks.map((task) => (
                <li key={task.id} className="task-item">
                  <span className="task-title">{task.title}</span>
                  <button
                    className="task-delete-button"
                    onClick={() => handleTaskDelete(selectedTasklistId!, task.id)}
                  >
                    Delete
                  </button>
                </li>
              ))
            ) : (
              <p>No tasks available.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TasksList;