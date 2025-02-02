import TasksList from './components/TasksList';
import CalendarEvents from './components/CalendarEvents';
import './index.css';

function App() {
  return (
    <div className="App">
      <h1 className="text-2xl font-bold mb-4">HarmonySync</h1>
      <div className="container">
        <div>
          <TasksList />
        </div>
        <div>
          <CalendarEvents />
        </div>
      </div>
    </div>
  );
}

export default App;