import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Clock, Trash2, ChevronDown } from 'lucide-react';

export interface ScheduleSlot {
  id: string;
  day_of_week: number; // 1 (Mon) to 7 (Sun)
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  activity: string;
  category: string;
}

const DAYS = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 7, name: 'Sunday', short: 'Sun' },
];

export const ScheduleView: React.FC = () => {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState('Core');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchSchedule = async () => {
    try {
      const data = await invoke<ScheduleSlot[]>('lifestyle_get_schedule');
      setSlots(data);
    } catch (err) {
      console.error('Error fetching schedule:', err);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDayDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity.trim()) return;

    try {
      await invoke('lifestyle_create_schedule_slot', {
        dayOfWeek: Number(dayOfWeek),
        startTime: startTime.trim() || '08:00',
        endTime: endTime.trim() || '09:00',
        activity: activity.trim(),
        category: category.trim() || 'General',
      });
      setActivity('');
      fetchSchedule();
    } catch (err) {
      console.error('Error creating schedule slot:', err);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await invoke('lifestyle_delete_schedule_slot', { slotId });
      fetchSchedule();
    } catch (err) {
      console.error('Error deleting schedule slot:', err);
    }
  };

  const selectedDayObj = DAYS.find((d) => d.id === dayOfWeek) || DAYS[0];

  return (
    <div className="space-y-6">
      {/* Header and Add Block Form */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Weekly Schedule</h2>
          <p className="text-xs text-zinc-400">Structured timeblocking and calendar routines.</p>
        </div>

        <form onSubmit={handleCreateSlot} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="Activity name..."
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
          />

          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-600"
          />

          {/* Custom React Dropdown para el Día (evita el bug de WebKitGTK) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
              className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 transition-colors"
            >
              <span>{selectedDayObj.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {isDayDropdownOpen && (
              <div className="absolute left-0 mt-1 w-36 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl py-1 z-50">
                {DAYS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDayOfWeek(d.id);
                      setIsDayDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      d.id === dayOfWeek
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Control de Tiempo con Inputs Editables */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 rounded-lg text-xs">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="08:00"
              maxLength={5}
              className="w-11 bg-transparent text-center font-mono text-xs text-zinc-100 focus:outline-hidden"
              title="Start Time (HH:MM)"
            />
            <span className="text-zinc-600 font-bold">-</span>
            <input
              type="text"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="09:30"
              maxLength={5}
              className="w-11 bg-transparent text-center font-mono text-xs text-zinc-100 focus:outline-hidden"
              title="End Time (HH:MM)"
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 bg-zinc-100 text-zinc-950 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Block
          </button>
        </form>
      </div>

      {/* 7-Day Agenda Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {DAYS.map((day) => {
          const daySlots = slots
            .filter((s) => s.day_of_week === day.id)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          return (
            <div
              key={day.id}
              className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col min-h-[480px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 mb-3">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  {day.short}
                </span>
                <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                  {daySlots.length}
                </span>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto">
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 p-2.5 rounded-lg flex flex-col gap-1.5 transition-all shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-semibold text-zinc-100 leading-tight">
                        {slot.activity}
                      </span>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{slot.start_time} - {slot.end_time}</span>
                      </div>
                      <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded border border-zinc-700/40 font-medium">
                        {slot.category}
                      </span>
                    </div>
                  </div>
                ))}

                {daySlots.length === 0 && (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <span className="text-[11px] text-zinc-600 italic">No blocks</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
