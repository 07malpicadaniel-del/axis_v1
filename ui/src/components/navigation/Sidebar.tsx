import React from 'react';
import { Activity, BookOpen, Settings } from 'lucide-react';

export type ProjectId = 'lifestyle' | 'library';

interface SidebarProps {
  activeProject: ProjectId;
  onSelectProject: (id: ProjectId) => void;
}

interface ProjectItem {
  id: ProjectId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const projects: ProjectItem[] = [
  { id: 'lifestyle', label: 'Lifestyle', icon: Activity },
  { id: 'library', label: 'Library', icon: BookOpen },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeProject, onSelectProject }) => {
  return (
    <aside className="w-16 md:w-56 h-screen bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between p-3 select-none shrink-0">
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-950 font-black flex items-center justify-center tracking-tighter text-sm">
            AX
          </div>
          <span className="hidden md:block font-bold text-zinc-100 tracking-wider text-sm uppercase">
            Axis Core
          </span>
        </div>

        <nav className="space-y-1.5">
          <p className="hidden md:block px-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase mb-2">
            Modules
          </p>
          {projects.map((project) => {
            const Icon = project.icon;
            const isActive = activeProject === project.id;

            return (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline truncate">{project.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-3 border-t border-zinc-800/80">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors">
          <Settings className="w-5 h-5 shrink-0" />
          <span className="hidden md:inline">Settings</span>
        </button>
      </div>
    </aside>
  );
};
