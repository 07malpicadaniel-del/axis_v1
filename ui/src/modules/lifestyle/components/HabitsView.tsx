import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Flame, Check, Trash2, CalendarCheck } from 'lucide-react';

export interface Habit {
  id: string;
  name: string;
  target_per_week: number;
  streak: number;
  completed_today: boolean;
  history: string[]; // YYYY-MM-DD
}

export const HabitsView: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState('');
  const [targetDays, setTargetDays] = useState(7);

  const fetchHabits = async () => {
    try {
      const data = await invoke<Habit[]>('lifestyle_get_habits');
      setHabits(data);
    } catch (err) {
      console.error('Error fetching habits:', err);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await invoke('lifestyle_create_habit', {
        name: name.trim(),
        targetPerWeek: Number(targetDays),
      });
      setName('');
      fetchHabits();
    } catch (err) {
      console.error('Error creating habit:', err);
    }
  };

  const handleToggleHabit = async (habitId: string, dateStr?: string) => {
    try {
      await invoke('lifestyle_toggle_habit', { habitId, date: dateStr || null });
      fetchHabits();
    } catch (err) {
      console.error('Error toggling habit:', err);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await invoke('lifestyle_delete_habit', { habitId });
      fetchHabits();
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  const getWeekDates = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);

    const week = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      week.push({ name: dayNames[i], date: iso, isToday: iso === now.toISOString().split('T')[0] });
    }
    return week;
  };

  const weekDays = getWeekDates();

  return (
    <div className="space-y-6">
      {/* Header and Creation Form */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Habits & Streaks</h2>
          <p className="text-xs text-zinc-400">Track your consistency and maintain active daily momentum.</p>
        </div>

        <form onSubmit={handleCreateHabit} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New habit name..."
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
          />
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300">
            <span className="text-[11px] text-zinc-500 font-medium">Days/wk:</span>
            <input
              type="number"
              min="1"
              max="7"
              value={targetDays}
              onChange={(e) => setTargetDays(Number(e.target.value))}
              className="w-8 bg-transparent text-center font-mono focus:outline-hidden text-zinc-100 font-semibold"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-zinc-100 text-zinc-950 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Habit
          </button>
        </form>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {habits.map((habit) => {
          const completedThisWeek = weekDays.filter((d) => habit.history.includes(d.date)).length;
          const progressPercent = Math.min(100, Math.round((completedThisWeek / habit.target_per_week) * 100));

          return (
            <div
              key={habit.id}
              className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">{habit.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-zinc-100 font-semibold">
                      <Flame className="w-3.5 h-3.5 fill-zinc-100/20" />
                      {habit.streak} days
                    </span>
                    <span className="text-zinc-600 text-xs">•</span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {completedThisWeek}/{habit.target_per_week} target
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleHabit(habit.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      habit.completed_today
                        ? 'bg-zinc-100 text-zinc-950 border border-zinc-100'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {habit.completed_today ? 'Done Today' : 'Mark Done'}
                  </button>
                  <button
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="p-1.5 text-zinc-600 hover:text-zinc-200 transition-colors"
                    title="Delete habit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Weekly Day Matrix */}
              <div className="pt-2 border-t border-zinc-800/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase">This Week</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{progressPercent}%</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {weekDays.map((day) => {
                    const isDone = habit.history.includes(day.date);
                    return (
                      <button
                        key={day.date}
                        onClick={() => handleToggleHabit(habit.id, day.date)}
                        className={`flex flex-col items-center justify-center py-1.5 rounded-md border text-center transition-all ${
                          isDone
                            ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-bold'
                            : day.isToday
                            ? 'bg-zinc-900 border-zinc-600 text-zinc-200'
                            : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                        }`}
                      >
                        <span className="text-[9px] uppercase font-mono">{day.name}</span>
                        <span className="text-[11px] mt-0.5">{isDone ? '✓' : '·'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {habits.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-zinc-800/80 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <CalendarCheck className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-400">No habits added yet.</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">Use the form above to start tracking your daily routines.</p>
          </div>
        )}
      </div>
    </div>
  );
};
