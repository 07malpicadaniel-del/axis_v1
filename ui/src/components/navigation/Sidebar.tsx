import React from 'react';
import { 
  Activity, 
  BookOpen, 
  TrendingUp, 
  Cpu, 
  Settings 
} from 'lucide-react';

export type ProjectId = 'lifestyle' | 'library' | 'aurora' | 'bob';

interface SidebarProps {
  activeProject: ProjectId;
  onSelectProject: (id: ProjectId) => void;
}

interface ProjectItem {
  id: ProjectId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const projects: ProjectItem[] = [
  { id: 'lifestyle', label: 'Lifestyle', icon: Activity },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'aurora', label: 'Aurora', icon: TrendingUp, disabled: true },
  { id: 'bob', label: 'Bob', icon: Cpu, disabled: true },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeProject, onSelectProject }) => {
  return (
    <aside className="w-16 md:w-56 h-screen bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between p-3 select-none">
      <div className="space-y-6">
        {/* Identidad AXIS */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-950 font-black flex items-center justify-center tracking-tighter text-sm">
            AX
          </div>
          <span className="hidden md:block font-bold text-zinc-100 tracking-wider text-sm uppercase">
            Axis Core
          </span>
        </div>

        {/* Lista de Proyectos */}
        <nav className="space-y-1.5">
          <p className="hidden md:block px-2 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">
            Proyectos
          </p>
          {projects.map((project) => {
            const Icon = project.icon;
            const isActive = activeProject === project.id;

            return (
              <button
                key={project.id}
                disabled={project.disabled}
                onClick={() => onSelectProject(project.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : project.disabled
                    ? 'opacity-30 cursor-not-allowed text-zinc-400'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline truncate">{project.label}</span>
                {project.disabled && (
                  <span className="hidden md:inline-block ml-auto text-[9px] bg-zinc-900 border border-zinc-700/60 px-1.5 py-0.5 rounded text-zinc-400">
                    WIP
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Acceso a Configuración General */}
      <div className="pt-3 border-t border-zinc-800/80">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors">
          <Settings className="w-5 h-5 shrink-0" />
          <span className="hidden md:inline">Ajustes</span>
        </button>
      </div>
    </aside>
  );
};
