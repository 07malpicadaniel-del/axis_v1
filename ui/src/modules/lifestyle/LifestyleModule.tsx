import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  CheckSquare, 
  Repeat, 
  Calendar, 
  Wallet, 
  Dumbbell, 
  BookMarked,
  Plus,
  ArrowRight,
  CheckCircle2
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
  created_at: string;
}

type LifestyleSection = 'tasks' | 'habits' | 'schedule' | 'finances' | 'gym' | 'journal';

export const LifestyleModule: React.FC = () => {
  const [activeSection, setActiveSection] = useState<LifestyleSection>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Core');

  const fetchTasks = async () => {
    try {
      const data = await invoke<Task[]>('lifestyle_get_tasks');
      setTasks(data);
    } catch (err) {
      console.error('Error al cargar tareas:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await invoke('lifestyle_create_task', {
        title: newTaskTitle.trim(),
        category: newTaskCategory,
        priority: 'Medium',
      });
      setNewTaskTitle('');
      fetchTasks();
    } catch (err) {
      console.error('Error creando tarea:', err);
    }
  };

  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    try {
      await invoke('lifestyle_update_task_status', { taskId, status });
      fetchTasks();
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  const sections = [
    { id: 'tasks', label: 'Tareas', icon: CheckSquare },
    { id: 'habits', label: 'Hábitos', icon: Repeat },
    { id: 'schedule', label: 'Horario', icon: Calendar },
    { id: 'finances', label: 'Finanzas', icon: Wallet },
    { id: 'gym', label: 'Gym & Cargas', icon: Dumbbell },
    { id: 'journal', label: 'Bitácora', icon: BookMarked },
  ] as const;

  const pendingTasks = tasks.filter((t) => t.status === 'Pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'InProgress');
  const completedTasks = tasks.filter((t) => t.status === 'Completed');

  return (
    <div className="flex-1 flex flex-col h-screen bg-zinc-900 text-zinc-100 overflow-hidden">
      <header className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950/60 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <h1 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
            Estilo de Vida
          </h1>
          <nav className="flex items-center gap-1">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/50'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {sec.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {activeSection === 'tasks' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Gestor de Tareas</h2>
                  <p className="text-xs text-zinc-400">Backing store administrado en Rust con comandos IPC directos.</p>
                </div>

                <form onSubmit={handleCreateTask} className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Nueva tarea..."
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-700"
                  />
                  <input
                    type="text"
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    placeholder="Categoría"
                    className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-700"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-zinc-100 text-zinc-950 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Añadir
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PENDIENTES */}
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 flex flex-col min-h-[420px]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-zinc-400 uppercase font-semibold">Pendientes</span>
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
                      {pendingTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {pendingTasks.map((t) => (
                      <div key={t.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-200">{t.title}</span>
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700/50">
                            {t.category}
                          </span>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'InProgress')}
                            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            Empezar <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* EN CURSO */}
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 flex flex-col min-h-[420px]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-zinc-400 uppercase font-semibold">En Curso</span>
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
                      {inProgressTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {inProgressTasks.map((t) => (
                      <div key={t.id} className="bg-zinc-900 border border-zinc-700/60 p-3 rounded-lg flex flex-col gap-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-100">{t.title}</span>
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700/50">
                            {t.category}
                          </span>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'Completed')}
                            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            Completar <CheckCircle2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COMPLETADAS */}
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 flex flex-col min-h-[420px]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-zinc-400 uppercase font-semibold">Completadas</span>
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
                      {completedTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {completedTasks.map((t) => (
                      <div key={t.id} className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-lg flex items-center justify-between opacity-60">
                        <span className="text-xs line-through text-zinc-400">{t.title}</span>
                        <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                          {t.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection !== 'tasks' && (
            <div className="flex flex-col items-center justify-center h-96 border border-zinc-800 rounded-xl bg-zinc-950/20 text-center">
              <p className="text-zinc-300 font-medium capitalize">Submódulo: {activeSection}</p>
              <p className="text-xs text-zinc-500 mt-1">Estructuras listas en Rust para conectar la interfaz.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
