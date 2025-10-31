import React, { useState, useMemo } from 'react';
import { useTaskLists } from '../hooks/useTaskLists';
import { useTasks } from '../hooks/useTasks';
import { useTaskActions } from '../hooks/useTaskActions';
import { useAddTaskForm } from '../hooks/useAddTaskForm';
import { useCompletedTasksCount } from '../hooks/useCompletedTasksCount';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateString));
};

type SortOption =
  | 'created_asc' | 'created_desc'
  | 'due_asc' | 'due_desc'
  | 'due_date_asc' | 'due_date_desc'
  | 'due_time_asc' | 'due_time_desc';

const TasksList: React.FC = () => {
  const { tasklists, selectedTasklistId, setSelectedTasklistId, isLoading: listsLoading, error: listsError } = useTaskLists();
  const { activeTasks, completedTasks, loadTasks, isLoading: tasksLoading, error: tasksError } = useTasks(selectedTasklistId);
  const { handleCompleteTask, handleTaskDelete } = useTaskActions(setTasks => setTasks); // передаём setTasks из useTasks, но для простоты используем loadTasks после действий
  const {
    newTaskInput, setNewTaskInput, dueDate, setDueDate, dueTime, setDueTime,
    isDatePickerOpen, setIsDatePickerOpen, isTimePickerOpen, setIsTimePickerOpen,
    datePickerRef, timePickerRef, handleAddTask, error: addError
  } = useAddTaskForm(selectedTasklistId, loadTasks);
  const completedTasksCount = useCompletedTasksCount(activeTasks.concat(completedTasks));
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('created_desc');

  // после complete/delete перезагружаем задачи для синхронизации
  const wrappedComplete = async (id: string, status: string) => {
    await handleCompleteTask(id, status);
    loadTasks();
  };
  const wrappedDelete = async (id: string) => {
    await handleTaskDelete(id);
    loadTasks();
  };

  // сортировка задач
  const sortedActiveTasks = useMemo(() => {
    const tasks = [...activeTasks];
    return tasks.sort((a, b) => {
      let dateA: Date | null = null;
      let dateB: Date | null = null;

      switch (sortOption) {
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

        case 'due_asc':
        case 'due_desc':
          dateA = a.due ? new Date(a.due) : null;
          dateB = b.due ? new Date(b.due) : null;
          if (!dateA && !dateB) return 0;
          if (!dateA) return sortOption === 'due_asc' ? 1 : -1;
          if (!dateB) return sortOption === 'due_asc' ? -1 : 1;
          return sortOption === 'due_asc'
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();

        case 'due_date_asc':
        case 'due_date_desc':
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return sortOption === 'due_date_asc' ? 1 : -1;
          if (!b.due_date) return sortOption === 'due_date_asc' ? -1 : 1;
          return sortOption === 'due_date_asc'
            ? new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            : new Date(b.due_date).getTime() - new Date(a.due_date).getTime();

        case 'due_time_asc':
        case 'due_time_desc':
          if (!a.due_time && !b.due_time) return 0;
          if (!a.due_time) return sortOption === 'due_time_asc' ? 1 : -1;
          if (!b.due_time) return sortOption === 'due_time_asc' ? -1 : 1;
          return sortOption === 'due_time_asc'
            ? a.due_time.localeCompare(b.due_time)
            : b.due_time.localeCompare(a.due_time);

        default:
          return 0;
      }
    });
  }, [activeTasks, sortOption]);

  const sortedCompletedTasks = useMemo(() => {
    return [...completedTasks].sort((a, b) => {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [completedTasks]);

  if (listsError || tasksError || addError) {
    return <p>Ошибка: {listsError || tasksError || addError}</p>;
  }

  return (
    <section className="tasks-main-left">
      <div className="tasks-section">
        {listsLoading ? <p>Загрузка списков...</p> : (
          <div className="tasks-section-header">
            <div className="tasklist-dropdown">
              <select value={selectedTasklistId || ''} onChange={(e) => setSelectedTasklistId(e.target.value)}>
                <option value="" disabled>Выберите список задач</option>
                {tasklists.map((tasklist) => (
                  <option key={tasklist.id} value={tasklist.id}>
                    {tasklist.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-dropdown">
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)}>
                <option value="created_desc">Сначала новые</option>
                <option value="created_asc">Сначала старые</option>
                <option value="due_asc">Дедлайн: сначала ранние</option>
                <option value="due_desc">Дедлайн: сначала поздние</option>
                <option value="due_date_asc">Дата дедлайна ↑</option>
                <option value="due_date_desc">Дата дедлайна ↓</option>
                <option value="due_time_asc">Время дедлайна ↑</option>
                <option value="due_time_desc">Время дедлайна ↓</option>
              </select>
            </div>
          </div>
        )}

        {selectedTasklistId && (
          <div>
            <div className="add-task">
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTaskInput.trim()) {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
                placeholder="Название задачи"
                style={{ width: 'calc(100% - 80px)' }}
              />
              <button className="time-icon" onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}>
                <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </button>
              {isTimePickerOpen && (
                <div className="time-picker-popup" ref={timePickerRef}>
                  <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
                </div>
              )}
              <button className="date-icon" onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}>
                <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </button>
              {isDatePickerOpen && (
                <div className="date-picker-popup" ref={datePickerRef}>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              )}
              <button onClick={handleAddTask}>
                <svg enable-background="new 0 0 24 24" focusable="false" height="24" viewBox="0 0 24 24" width="24"><rect fill="none" height="24" width="24"></rect><path d="M22,5.18L10.59,16.6l-4.24-4.24l1.41-1.41l2.83,2.83l10-10L22,5.18z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8 c1.57,0,3.04,0.46,4.28,1.25l1.45-1.45C16.1,2.67,14.13,2,12,2C6.48,2,2,6.48,2,12s4.48,10,10,10c1.73,0,3.36-0.44,4.78-1.22 l-1.5-1.5C14.28,19.74,13.17,20,12,20z M19,15h-3v2h3v3h2v-3h3v-2h-3v-3h-2V15z"></path></svg>
              </button>
            </div>

            {tasksLoading ? <p>Загрузка задач...</p> : sortedActiveTasks.length > 0 ? (
              sortedActiveTasks.map((task) => (
                <div key={task.id} className="task-item">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => wrappedComplete(task.id, task.status)}
                  />
                  <div className="task-item-inner">
                    <span className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                      {task.title}
                    </span>
                    <div className="task-item-inner-bottom">
                      {task.due_date && (
                        <div className="task-date">
                          <svg fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" strokeLinecap="round" strokeLinejoin="round"></path>
                          </svg>
                          <span>{formatDate(task.due_date)}</span>
                        </div>
                      )}
                      {task.due_time && (
                        <div className="task-time">
                          <svg fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round"></path>
                          </svg>
                          <span>{task.due_time}</span>
                        </div>
                      )}
                      <button className="task-delete-button" onClick={() => wrappedDelete(task.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>Нет активных задач</p>
            )}
          </div>
        )}
        <button onClick={() => setShowCompletedTasks(!showCompletedTasks)} className='show-completed-tasks-btn'>
          {showCompletedTasks ? `▲ Выполненные задачи (${completedTasksCount})` : `▼ Выполненные задачи (${completedTasksCount})`}
        </button>
      </div>
      {
        showCompletedTasks && (
          <div className='completed-tasks-container'>
            {completedTasks.map((task) => (
              <div key={task.id} className='completed-task'>
                <input type="checkbox" checked={task.status === 'completed'} onChange={() => wrappedComplete(task.id, task.status)} />
                <div className="task-item-inner">
                  <span>{task.title}</span>
                  <div className="task-item-inner-bottom">
                    {task.due_date && (
                      <div className="task-date">
                        <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                        <span>{formatDate(task.due_date)}</span>
                      </div>
                    )}
                    {task.due_time && (
                      <div className="task-time">
                        <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                        <span>{task.due_time}</span>
                      </div>
                    )}
                    <button className="task-delete-button" onClick={() => wrappedDelete(task.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                        className="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </section >
  );
};

export default TasksList;