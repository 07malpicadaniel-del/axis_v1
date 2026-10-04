import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  CheckCircle2, 
  RotateCcw,
  ChevronDown
} from 'lucide-react';

export type TaskStatus = 'Pending' | 'InProgress' | 'Completed';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  category: string;
  due_date?: string;
  created_at: string;
}

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const priorityRef = useRef<HTMLDivElement>(null);

  const fetchTasks = async () => {
    try {
      const data = await invoke<Task[]>('lifestyle_get_tasks');
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setIsPriorityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await invoke('lifestyle_create_task', {
        title: title.trim(),
        description: null,
        category: category.trim() || 'General',
        priority,
        dueDate: null,
      });
      setTitle('');
      fetchTasks();
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    try {
      await invoke('lifestyle_update_task_status', { taskId, status });
      fetchTasks();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await invoke('lifestyle_delete_task', { taskId });
      fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const priorityBadge = (p: Priority) => {
    return (
      <span className="text-[10px] font-semibold text-zinc-300 bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 rounded">
        {p}
      </span>
    );
  };

  const categories = ['All', ...Array.from(new Set(tasks.map((t) => t.category)))];
  const filteredTasks = selectedCategory === 'All' 
    ? tasks 
    : tasks.filter((t) => t.category === selectedCategory);

  const pending = filteredTasks.filter((t) => t.status === 'Pending');
  const inProgress = filteredTasks.filter((t) => t.status === 'InProgress');
  const completed = filteredTasks.filter((t) => t.status === 'Completed');

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Task Manager</h2>
          <p className="text-xs text-zinc-400">Synchronized with native Rust backend.</p>
        </div>

        <form onSubmit={handleCreateTask} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task title..."
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
          />

          {/* Custom Dropdown de Prioridad (elimina la caja blanca de GTK) */}
          <div className="relative" ref={priorityRef}>
            <button
              type="button"
              onClick={() => setIsPriorityOpen(!isPriorityOpen)}
              className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 transition-colors"
            >
              <span>{priority}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {isPriorityOpen && (
              <div className="absolute right-0 mt-1 w-28 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl py-1 z-50">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPriority(p);
                      setIsPriorityOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      p === priority
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 bg-zinc-100 text-zinc-950 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        </form>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[11px] text-zinc-500 uppercase font-bold mr-1">Filter:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PENDING */}
        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 uppercase font-semibold">Pending</span>
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
              {pending.length}
            </span>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {pending.map((t) => (
              <div key={t.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-200">{t.title}</span>
                  <button 
                    onClick={() => handleDeleteTask(t.id)} 
                    className="text-zinc-600 hover:text-zinc-300 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {priorityBadge(t.priority)}
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700/40">
                      {t.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'InProgress')}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100 transition-colors font-medium"
                  >
                    Start <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IN PROGRESS */}
        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 uppercase font-semibold">In Progress</span>
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
              {inProgress.length}
            </span>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {inProgress.map((t) => (
              <div key={t.id} className="bg-zinc-900 border border-zinc-700/60 p-3 rounded-lg flex flex-col gap-2 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-100">{t.title}</span>
                  <button 
                    onClick={() => handleDeleteTask(t.id)} 
                    className="text-zinc-600 hover:text-zinc-300 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {priorityBadge(t.priority)}
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700/40">
                      {t.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'Pending')}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Move back to pending"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'Completed')}
                      className="flex items-center gap-1 text-[11px] text-zinc-200 hover:text-white transition-colors font-medium"
                    >
                      Complete <CheckCircle2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COMPLETED */}
        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 uppercase font-semibold">Completed</span>
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
              {completed.length}
            </span>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {completed.map((t) => (
              <div key={t.id} className="bg-zinc-900/50 border border-zinc-800/60 p-3 rounded-lg flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex flex-col">
                  <span className="text-xs line-through text-zinc-400">{t.title}</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{t.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'InProgress')}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    title="Move back to in progress"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(t.id)} 
                    className="text-zinc-600 hover:text-zinc-300 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
