import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Plus, 
  GitBranch, 
  Folder, 
  RefreshCw, 
  Trash2, 
  Search, 
  Terminal, 
  CheckCircle2, 
  CircleDot,
  ArrowLeft,
  GitCommit as GitCommitIcon,
  FileCode2,
  GitFork,
  UploadCloud
} from 'lucide-react';

export interface LocalRepo {
  id: string;
  name: string;
  path: string;
  current_branch: string;
  is_clean: boolean;
  last_commit: string;
  last_commit_time: string;
  tag: string;
}

export interface GitCommit {
  hash: string;
  author: string;
  date_rel: string;
  message: string;
}

export interface GitFileChange {
  status: string;
  path: string;
}

export interface RepoDetails {
  branch: string;
  branches: string[];
  is_clean: boolean;
  commits: GitCommit[];
  changes: GitFileChange[];
}

export const ReposModule: React.FC = () => {
  const [repos, setRepos] = useState<LocalRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPath, setNewPath] = useState('');
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('Rust');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Inspector detailed view states
  const [selectedRepo, setSelectedRepo] = useState<LocalRepo | null>(null);
  const [repoDetails, setRepoDetails] = useState<RepoDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Commit & Push action states
  const [commitMessage, setCommitMessage] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; isError: boolean } | null>(null);

  const fetchRepos = async () => {
    setIsRefreshing(true);
    try {
      const data = await invoke<LocalRepo[]>('repos_get_list');
      setRepos(data);
    } catch (err) {
      console.error('Error fetching repositories:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchDetails = async (repo: LocalRepo) => {
    setIsLoadingDetails(true);
    setActionNotice(null);
    try {
      const data = await invoke<RepoDetails>('repos_get_details', { path: repo.path });
      setRepoDetails(data);
      setSelectedRepo(repo);
    } catch (err) {
      console.error('Error fetching git details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;

    try {
      await invoke('repos_add_repo', {
        path: newPath.trim(),
        name: newName.trim() || null,
        tag: newTag.trim() || 'General',
      });
      setNewPath('');
      setNewName('');
      fetchRepos();
    } catch (err) {
      console.error('Error adding repository:', err);
    }
  };

  const handleDeleteRepo = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await invoke('repos_delete_repo', { id });
      if (selectedRepo?.id === id) {
        setSelectedRepo(null);
        setRepoDetails(null);
      }
      fetchRepos();
    } catch (err) {
      console.error('Error deleting repository:', err);
    }
  };

  const handleCommitAndPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;

    setIsPushing(true);
    setActionNotice(null);

    try {
      const result = await invoke<string>('repos_commit_and_push', {
        path: selectedRepo.path,
        message: commitMessage.trim(),
      });
      setCommitMessage('');
      setActionNotice({ text: result, isError: false });
      await fetchDetails(selectedRepo);
      fetchRepos();
    } catch (err: any) {
      setActionNotice({ text: String(err), isError: true });
    } finally {
      setIsPushing(false);
    }
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-screen bg-zinc-900 text-zinc-100 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          {selectedRepo ? (
            <button
              onClick={() => {
                setSelectedRepo(null);
                setRepoDetails(null);
                setActionNotice(null);
              }}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Repositories</span>
            </button>
          ) : (
            <>
              <h1 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
                Local Repositories
              </h1>
              <span className="text-[10px] bg-zinc-800 border border-zinc-700/60 px-2 py-0.5 rounded text-zinc-400 font-mono">
                {repos.length} managed
              </span>
            </>
          )}
        </div>

        <button
          onClick={() => (selectedRepo ? fetchDetails(selectedRepo) : fetchRepos())}
          disabled={isRefreshing || isLoadingDetails || isPushing}
          className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoadingDetails ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* VIEW 1: REPOSITORIES GRID */}
          {!selectedRepo && (
            <>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs w-full lg:w-72">
                  <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search local projects..."
                    className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden"
                  />
                </div>

                <form onSubmit={handleAddRepo} className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    placeholder="Absolute path (/home/...)"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600 font-mono"
                  />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Alias (optional)"
                    className="w-28 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
                  />
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Tag"
                    className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-zinc-100 text-zinc-950 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Track Repo
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => fetchDetails(repo)}
                    className="cursor-pointer bg-zinc-950/40 border border-zinc-800/80 hover:border-zinc-600/80 rounded-xl p-4 flex flex-col justify-between gap-4 transition-all shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-zinc-100">{repo.name}</h3>
                          <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                            {repo.tag}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono mt-1 truncate max-w-sm">
                          <Folder className="w-3 h-3 shrink-0" />
                          <span className="truncate">{repo.path}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteRepo(e, repo.id)}
                        className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                        title="Untrack repo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-zinc-300">
                          <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{repo.current_branch}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {repo.is_clean ? (
                            <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3 text-zinc-300" /> Clean
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-zinc-200 font-mono bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded font-semibold">
                              <CircleDot className="w-3 h-3 text-zinc-100" /> Modified
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-zinc-800/40 pt-2 flex flex-col gap-0.5">
                        <p className="text-[11px] text-zinc-300 font-mono truncate" title={repo.last_commit}>
                          {repo.last_commit}
                        </p>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {repo.last_commit_time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredRepos.length === 0 && (
                  <div className="col-span-full border-2 border-dashed border-zinc-800/80 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                    <Terminal className="w-8 h-8 text-zinc-600 mb-2" />
                    <p className="text-xs text-zinc-400 font-medium">No repositories tracked.</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      Enter an absolute path to register your local projects into AXIS.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* VIEW 2: GIT INSPECTOR & ONE-CLICK PUSH */}
          {selectedRepo && repoDetails && (
            <div className="space-y-6">
              {/* Header Card with Quick Sync Bar */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-zinc-100">{selectedRepo.name}</h2>
                      <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
                        {selectedRepo.tag}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3 text-zinc-400" />
                        {repoDetails.branch}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono mt-1">{selectedRepo.path}</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    {repoDetails.is_clean ? (
                      <span className="flex items-center gap-1.5 text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" /> Working Tree Clean
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-zinc-100 bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-lg font-semibold">
                        <CircleDot className="w-3.5 h-3.5" /> {repoDetails.changes.length} Uncommitted Changes
                      </span>
                    )}
                  </div>
                </div>

                {/* One-Click Push & Commit Form */}
                <form
                  onSubmit={handleCommitAndPush}
                  className="pt-3 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center gap-2"
                >
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message (leave blank for auto-timestamp)..."
                    disabled={isPushing}
                    className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isPushing}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-100 text-zinc-950 hover:bg-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 disabled:opacity-50"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${isPushing ? 'animate-bounce' : ''}`} />
                    <span>{isPushing ? 'Pushing to remote...' : 'Commit & Push'}</span>
                  </button>
                </form>

                {actionNotice && (
                  <div
                    className={`text-xs font-mono p-2.5 rounded-lg border ${
                      actionNotice.isError
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                    }`}
                  >
                    {actionNotice.text}
                  </div>
                )}
              </div>

              {/* Two Column Layout: Commits Timeline & Working Tree Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Commits History (2 Cols) */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitCommitIcon className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-300">
                        Commit History
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Last {repoDetails.commits.length} commits
                    </span>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 min-h-[460px] flex flex-col">
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {repoDetails.commits.map((c) => (
                        <div
                          key={c.hash}
                          className="bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 p-3 rounded-lg flex flex-col gap-1.5 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-semibold text-zinc-100 leading-snug">
                              {c.message}
                            </span>
                            <span className="text-[10px] font-mono bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300 shrink-0">
                              {c.hash}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-800/40">
                            <span>{c.author}</span>
                            <span>{c.date_rel}</span>
                          </div>
                        </div>
                      ))}

                      {repoDetails.commits.length === 0 && (
                        <div className="h-full flex items-center justify-center text-center p-8 text-xs text-zinc-600 italic">
                          No commits found in repository history.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Working Tree Changes & Branches */}
                <div className="space-y-6">
                  {/* Changed Files */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-300">
                        Status / Modified Files
                      </h3>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-3 min-h-[220px] flex flex-col">
                      <div className="space-y-1.5 flex-1 overflow-y-auto">
                        {repoDetails.changes.map((file, idx) => (
                          <div
                            key={idx}
                            className="bg-zinc-900/60 border border-zinc-800/60 p-2 rounded-lg flex items-center justify-between gap-2 text-xs font-mono"
                          >
                            <span className="truncate text-zinc-300" title={file.path}>
                              {file.path}
                            </span>
                            <span className="text-[10px] bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-bold shrink-0">
                              {file.status}
                            </span>
                          </div>
                        ))}

                        {repoDetails.changes.length === 0 && (
                          <div className="h-full flex items-center justify-center text-center p-6 text-xs text-zinc-500">
                            No uncommitted changes detected.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Branches List */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GitFork className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-300">
                        Local Branches
                      </h3>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-3 space-y-1.5">
                      {repoDetails.branches.map((b) => (
                        <div
                          key={b}
                          className={`p-2 rounded-lg text-xs font-mono flex items-center justify-between ${
                            b === repoDetails.branch
                              ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700/60'
                              : 'text-zinc-400 bg-zinc-900/40'
                          }`}
                        >
                          <span>{b}</span>
                          {b === repoDetails.branch && (
                            <span className="text-[9px] bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-normal">
                              HEAD
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
