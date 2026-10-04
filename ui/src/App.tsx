import { useState } from 'react';
import { Sidebar, ProjectId } from './components/navigation/Sidebar';
import { LifestyleModule } from './modules/lifestyle/LifestyleModule';
import { LibraryModule } from './modules/library/LibraryModule';

export function App() {
  const [activeProject, setActiveProject] = useState<ProjectId>('lifestyle');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      <Sidebar 
        activeProject={activeProject} 
        onSelectProject={setActiveProject} 
      />

      <div className="flex-1 flex overflow-hidden">
        {activeProject === 'lifestyle' && <LifestyleModule />}
        {activeProject === 'library' && <LibraryModule />}
      </div>
    </div>
  );
}

export default App;
