import { useState } from 'react';
import { Sidebar, ProjectId } from './components/navigation/Sidebar';
import { LifestyleModule } from './modules/lifestyle/LifestyleModule';

export function App() {
  const [activeProject, setActiveProject] = useState<ProjectId>('lifestyle');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Barra Lateral Izquierda */}
      <Sidebar 
        activeProject={activeProject} 
        onSelectProject={setActiveProject} 
      />

      {/* Escenario Dinámico según el proyecto activo */}
      <div className="flex-1 flex overflow-hidden">
        {activeProject === 'lifestyle' && <LifestyleModule />}
        {activeProject === 'library' && (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
            Módulo Library (En espera)
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
