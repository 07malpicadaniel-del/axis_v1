import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Plus, 
  Trash2, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ChevronDown 
} from 'lucide-react';

export type TransactionType = 'Income' | 'Expense';

export interface FinanceEntry {
  id: string;
  title: string;
  amount: number;
  transaction_type: TransactionType;
  category: string;
  date: string;
}

export interface SavingGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
}

export const FinancesView: React.FC = () => {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);

  // Transaction form states
  const [entryTitle, setEntryTitle] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCategory, setEntryCategory] = useState('Core');
  const [entryType, setEntryType] = useState<TransactionType>('Expense');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Goal form states
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  const fetchFinanceData = async () => {
    try {
      const [entriesData, goalsData] = await Promise.all([
        invoke<FinanceEntry[]>('lifestyle_get_finances'),
        invoke<SavingGoal[]>('lifestyle_get_saving_goals'),
      ]);
      setEntries(entriesData);
      setGoals(goalsData);
    } catch (err) {
      console.error('Error fetching finance data:', err);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(entryAmount);
    if (!entryTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      await invoke('lifestyle_create_finance_entry', {
        title: entryTitle.trim(),
        amount: parsedAmount,
        transactionType: entryType,
        category: entryCategory.trim() || 'General',
      });
      setEntryTitle('');
      setEntryAmount('');
      fetchFinanceData();
    } catch (err) {
      console.error('Error creating finance entry:', err);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await invoke('lifestyle_delete_finance_entry', { entryId });
      fetchFinanceData();
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseFloat(goalTarget);
    if (!goalTitle.trim() || isNaN(parsedTarget) || parsedTarget <= 0) return;

    try {
      await invoke('lifestyle_create_saving_goal', {
        title: goalTitle.trim(),
        targetAmount: parsedTarget,
      });
      setGoalTitle('');
      setGoalTarget('');
      fetchFinanceData();
    } catch (err) {
      console.error('Error creating goal:', err);
    }
  };

  const handleContributeGoal = async (goalId: string, amount: number) => {
    try {
      await invoke('lifestyle_contribute_saving_goal', { goalId, amount });
      fetchFinanceData();
    } catch (err) {
      console.error('Error contributing to goal:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await invoke('lifestyle_delete_saving_goal', { goalId });
      fetchFinanceData();
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  // Metrics calculations
  const totalIncome = entries
    .filter((e) => e.transaction_type === 'Income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = entries
    .filter((e) => e.transaction_type === 'Expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Financial Ledger</h2>
          <p className="text-xs text-zinc-400">Cashflow tracking, expenditures, and capital allocation.</p>
        </div>
      </div>

      {/* Metrics Row (Monochrome aesthetic) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Balance</span>
            <Wallet className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-2xl font-black font-mono tracking-tight text-zinc-100">
            ${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Inflow</span>
            <TrendingUp className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-2xl font-black font-mono tracking-tight text-zinc-100">
            +${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outflow</span>
            <TrendingDown className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-2xl font-black font-mono tracking-tight text-zinc-400">
            -${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Split View: Transactions (Left) & Savings Goals (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions Panel (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-zinc-400 uppercase font-semibold">Transactions</span>

            {/* Add Transaction Form */}
            <form onSubmit={handleCreateEntry} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={entryTitle}
                onChange={(e) => setEntryTitle(e.target.value)}
                placeholder="Description..."
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
              />

              <input
                type="number"
                step="0.01"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                placeholder="Amount"
                className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
              />

              {/* Custom Dropdown for Type (Income / Expense) */}
              <div className="relative" ref={typeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                  className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 transition-colors"
                >
                  <span>{entryType}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {isTypeDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-28 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl py-1 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setEntryType('Income');
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        entryType === 'Income'
                          ? 'bg-zinc-800 text-zinc-100 font-semibold'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      }`}
                    >
                      Income
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEntryType('Expense');
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        entryType === 'Expense'
                          ? 'bg-zinc-800 text-zinc-100 font-semibold'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      }`}
                    >
                      Expense
                    </button>
                  </div>
                )}
              </div>

              <input
                type="text"
                value={entryCategory}
                onChange={(e) => setEntryCategory(e.target.value)}
                placeholder="Category"
                className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
              />

              <button
                type="submit"
                className="flex items-center gap-1 bg-zinc-100 text-zinc-950 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Log
              </button>
            </form>
          </div>

          {/* Transactions List */}
          <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 min-h-[380px] flex flex-col">
            <div className="space-y-2 flex-1 overflow-y-auto">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 p-3 rounded-lg flex items-center justify-between transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-zinc-200">
                      {entry.transaction_type === 'Income' ? '+' : '-'}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-zinc-100">{entry.title}</p>
                      <span className="text-[10px] text-zinc-500 font-medium">{entry.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-mono font-bold ${
                        entry.transaction_type === 'Income' ? 'text-zinc-100' : 'text-zinc-400'
                      }`}
                    >
                      {entry.transaction_type === 'Income' ? '+' : '-'}$
                      {entry.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {entries.length === 0 && (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <p className="text-xs text-zinc-600 italic">No transaction records logged.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Savings Goals Panel (1 column) */}
        <div className="space-y-4">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Saving Targets</span>

          {/* Add Goal Form */}
          <form onSubmit={handleCreateGoal} className="flex gap-2">
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="Target name..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
            />
            <input
              type="number"
              step="10"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              placeholder="$ Target"
              className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
            />
            <button
              type="submit"
              className="bg-zinc-100 text-zinc-950 hover:bg-white p-1.5 rounded-lg transition-colors"
              title="Add goal"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Goals List */}
          <div className="space-y-3">
            {goals.map((goal) => {
              const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));

              return (
                <div
                  key={goal.id}
                  className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">{goal.title}</h4>
                      <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                        ${goal.current_amount.toFixed(0)} /${goal.target_amount.toFixed(0)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleContributeGoal(goal.id, 50)}
                        className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded text-zinc-300 transition-colors"
                        title="Quick deposit +$50"
                      >
                        +$50
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
                        title="Delete goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar (Monochrome High Contrast) */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-zinc-100 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {goals.length === 0 && (
              <div className="border-2 border-dashed border-zinc-800/80 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <Target className="w-6 h-6 text-zinc-600 mb-1" />
                <p className="text-xs text-zinc-500">No active saving targets.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
