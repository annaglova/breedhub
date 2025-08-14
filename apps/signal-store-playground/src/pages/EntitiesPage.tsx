import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { 
  createSignalStore, 
  withEntities, 
  withSelection,
  withRequestStatus,
  createSelectors,
  type Entity 
} from '@breedhub/signal-store';
import StateViewer from '../components/StateViewer';
import ActionLog from '../components/ActionLog';

interface Task extends Entity {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

// Create store
const useTaskStore = createSignalStore<Task>('tasks', [
  withEntities<Task>(),
  withSelection<Task>(),
  withRequestStatus(),
]);

const taskSelectors = createSelectors<Task>(useTaskStore);

export default function EntitiesPage() {
  const store = useTaskStore();
  const tasks = taskSelectors.useAllEntities();
  const selectedTask = taskSelectors.useSelectedEntity();
  const isLoading = taskSelectors.useIsLoading();
  const actions = taskSelectors.useActions();
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [actionLog, setActionLog] = useState<string[]>([]);

  // Initialize with sample data
  useEffect(() => {
    if (tasks.length === 0) {
      const sampleTasks: Task[] = [
        { id: '1', title: 'Learn SignalStore', completed: false, priority: 'high', createdAt: new Date() },
        { id: '2', title: 'Build a demo app', completed: false, priority: 'medium', createdAt: new Date() },
        { id: '3', title: 'Write documentation', completed: true, priority: 'low', createdAt: new Date() },
      ];
      actions.setAllEntities(sampleTasks);
      logAction('Initialized with sample tasks');
    }
  }, []);

  const logAction = (action: string) => {
    setActionLog(prev => [`${new Date().toLocaleTimeString()}: ${action}`, ...prev].slice(0, 10));
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      completed: false,
      priority: 'medium',
      createdAt: new Date(),
    };
    
    actions.addEntity(newTask);
    setNewTaskTitle('');
    logAction(`Added task: "${newTask.title}"`);
  };

  const handleUpdateTask = (id: string) => {
    if (!editTitle.trim()) return;
    
    actions.updateEntity(id, { title: editTitle });
    setEditingId(null);
    setEditTitle('');
    logAction(`Updated task ${id}`);
  };

  const handleToggleComplete = (task: Task) => {
    actions.updateEntity(task.id, { completed: !task.completed });
    logAction(`Toggled task ${task.id} completion`);
  };

  const handleDeleteTask = (id: string) => {
    actions.removeEntity(id);
    logAction(`Deleted task ${id}`);
  };

  const handleSelectTask = (id: string) => {
    actions.selectEntity(id);
    logAction(`Selected task ${id}`);
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Entity Management</h1>
        <p className="text-gray-600">
          Demonstrates CRUD operations, selection, and state management
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Task */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Add New Task</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Enter task title..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleAddTask}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Tasks ({tasks.length})</h2>
            
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No tasks yet. Add one above!</div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedTask?.id === task.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {editingId === task.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateTask(task.id);
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleToggleComplete(task)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className={task.completed ? 'line-through text-gray-500' : ''}>
                            {task.title}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            task.priority === 'high' ? 'bg-red-100 text-red-700' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(task.id);
                              setEditTitle(task.title);
                            }}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task.id);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Batch Actions</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  actions.clearEntities();
                  logAction('Cleared all tasks');
                }}
                className="btn btn-secondary"
              >
                Clear All
              </button>
              <button
                onClick={() => {
                  const newTasks = Array.from({ length: 5 }, (_, i) => ({
                    id: `generated-${Date.now()}-${i}`,
                    title: `Generated Task ${i + 1}`,
                    completed: Math.random() > 0.5,
                    priority: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
                    createdAt: new Date(),
                  }));
                  actions.addEntities(newTasks);
                  logAction(`Added ${newTasks.length} generated tasks`);
                }}
                className="btn btn-secondary"
              >
                Generate 5 Tasks
              </button>
              <button
                onClick={() => {
                  actions.clearSelection();
                  logAction('Cleared selection');
                }}
                className="btn btn-secondary"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <StateViewer 
            state={{
              entities: Array.from(store.entities.entries()),
              selectedId: store.selectedId,
              selectedIds: Array.from(store.selectedIds),
              totalCount: tasks.length,
            }}
          />
          
          <ActionLog logs={actionLog} />
        </div>
      </div>
    </div>
  );
}