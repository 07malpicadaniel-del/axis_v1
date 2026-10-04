import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Plus, 
  Search, 
  Trash2, 
  Save, 
  FileText, 
  BookMarked, 
  Layers, 
  ChevronDown 
} from 'lucide-react';

export interface LibraryItem {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  updated_at: string;
}

const CATEGORIES = ['All', 'Journal', 'Notes', 'Books', 'Research'];
const EDIT_CATEGORIES = ['Journal', 'Notes', 'Books', 'Research'];

export const LibraryModule: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados del editor activo
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Notes');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  const fetchItems = async () => {
    try {
      const data = await invoke<LibraryItem[]>('library_get_items');
      setItems(data);
      if (data.length > 0 && !selectedId) {
        selectItem(data[0]);
      }
    } catch (err) {
      console.error('Error fetching library items:', err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectItem = (item: LibraryItem) => {
    setSelectedId(item.id);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditContent(item.content);
    setEditTags(item.tags.join(', '));
  };

  const handleCreateNew = async () => {
    try {
      const isJournal = filterCategory === 'Journal';
      const defaultTitle = isJournal 
        ? `${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} - Journal Entry`
        : 'Untitled Document';

      const newItem = await invoke<LibraryItem>('library_create_item', {
        title: defaultTitle,
        category: isJournal ? 'Journal' : 'Notes',
        content: '',
        tags: isJournal ? ['journal'] : [],
      });

      setItems([newItem, ...items]);
      selectItem(newItem);
    } catch (err) {
      console.error('Error creating library item:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;

    try {
      const parsedTags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const updated = await invoke<LibraryItem>('library_update_item', {
        id: selectedId,
        title: editTitle.trim() || 'Untitled',
        category: editCategory,
        content: editContent,
        tags: parsedTags,
      });

      setItems(items.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      console.error('Error saving library item:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;

    try {
      await invoke('library_delete_item', { id: selectedId });
      const nextItems = items.filter((i) => i.id !== selectedId);
      setItems(nextItems);
      if (nextItems.length > 0) {
        selectItem(nextItems[0]);
      } else {
        setSelectedId(null);
        setEditTitle('');
        setEditContent('');
      }
    } catch (err) {
      console.error('Error deleting library item:', err);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCat = filterCategory === 'All' || item.category === filterCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex h-screen bg-zinc-900 text-zinc-100 overflow-hidden">
      {/* Columna Izquierda: Document Explorer */}
      <aside className="w-80 border-r border-zinc-800 bg-zinc-950/70 flex flex-col shrink-0">
        {/* Explorador Top Header */}
        <div className="p-4 border-b border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
              Library & Docs
            </h2>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1 bg-zinc-100 text-zinc-950 hover:bg-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  filterCategory === cat
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Item Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredItems.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <button
                key={item.id}
                onClick={() => selectItem(item)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-zinc-800/90 border-zinc-700 text-zinc-100 shadow-xs'
                    : 'bg-zinc-900/40 border-zinc-800/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold truncate text-zinc-200">
                    {item.title || 'Untitled'}
                  </span>
                  <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-mono shrink-0">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                  {item.content || 'Empty document...'}
                </p>
              </button>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-xs italic">
              No entries found.
            </div>
          )}
        </div>
      </aside>

      {/* Columna Derecha: Live Editor Pane */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-900">
        {selectedId ? (
          <>
            {/* Editor Action Bar */}
            <div className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-3 flex-1 max-w-xl">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Document Title..."
                  className="w-full bg-transparent text-sm font-bold text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden"
                />

                {/* Custom Category Dropdown (evita el bug de WebKitGTK) */}
                <div className="relative" ref={catDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                    className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 transition-colors"
                  >
                    <span>{editCategory}</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>

                  {isCatDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-32 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl py-1 z-50">
                      {EDIT_CATEGORIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setEditCategory(c);
                            setIsCatDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                            c === editCategory
                              ? 'bg-zinc-800 text-zinc-100 font-semibold'
                              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 bg-zinc-100 text-zinc-950 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tags line */}
            <div className="px-6 py-2 border-b border-zinc-800/60 bg-zinc-950/20 flex items-center gap-2 text-xs">
              <span className="text-[11px] text-zinc-500 font-mono">Tags:</span>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Comma separated tags (e.g. rust, ideas, paper)..."
                className="flex-1 bg-transparent text-zinc-300 placeholder:text-zinc-600 focus:outline-hidden text-xs"
              />
            </div>

            {/* Content Textarea */}
            <div className="flex-1 p-6 overflow-y-auto">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Write your document, markdown notes, journal reflections..."
                className="w-full h-full bg-transparent text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-hidden font-mono"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-10 h-10 text-zinc-700 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-400">No document selected</h3>
            <p className="text-xs text-zinc-600 mt-1">
              Select an entry from the list or click "New" to start writing.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
