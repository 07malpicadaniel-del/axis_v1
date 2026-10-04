import React, { useState } from 'react';
import { 
  CheckSquare, 
  Repeat, 
  Calendar, 
  Wallet 
} from 'lucide-react';
import { TasksView } from './components/TasksView';
import { HabitsView } from './components/HabitsView';
import { ScheduleView } from './components/ScheduleView';
import { FinancesView } from './components/FinancesView';

type LifestyleSection = 'tasks' | 'habits' | 'schedule' | 'finances';

export const LifestyleModule: React.FC = () => {
  const [activeSection, setActiveSection] = useState<LifestyleSection>('tasks');

  const sections = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'habits', label: 'Habits', icon: Repeat },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'finances', label: 'Finances', icon: Wallet },
  ] as const;

  return (
    <div className="flex-1 flex flex-col h-screen bg-zinc-900 text-zinc-100 overflow-hidden">
      <header className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
            Lifestyle
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
        <div className="max-w-6xl mx-auto">
          {activeSection === 'tasks' && <TasksView />}
          {activeSection === 'habits' && <HabitsView />}
          {activeSection === 'schedule' && <ScheduleView />}
          {activeSection === 'finances' && <FinancesView />}
        </div>
      </main>
    </div>
  );
};
