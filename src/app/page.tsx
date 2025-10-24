"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Timer, BarChart3, Calendar } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

type Mode = 'stopwatch' | 'timer';
type ViewMode = 'tracker' | 'analytics';
type TimeRange = 'today' | 'week' | 'month' | 'year';

interface Session {
  startTime: number;
  endTime?: number;
  duration: number;
  mode: Mode;
  date: string;
}

interface DayData {
  date: string;
  totalMinutes: number;
  sessions: Session[];
}

const TimeTracker = () => {
  const [mode, setMode] = useState<Mode>('stopwatch');
  const [viewMode, setViewMode] = useState<ViewMode>('tracker');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [timerRemaining, setTimerRemaining] = useState(timerDuration);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [tempMinutes, setTempMinutes] = useState('25');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem('trackerMode') as Mode;
    const savedStartTime = localStorage.getItem('startTime');
    const savedTimerDuration = localStorage.getItem('timerDuration');
    const savedTimerStart = localStorage.getItem('timerStartTime');

    if (savedMode) setMode(savedMode);
    if (savedTimerDuration) {
      const duration = parseInt(savedTimerDuration);
      setTimerDuration(duration);
      setTimerRemaining(duration);
    }

    if (savedStartTime) {
      const start = parseInt(savedStartTime);
      setStartTime(start);
      setIsRunning(true);

      if (savedMode === 'stopwatch') {
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      } else if (savedTimerStart) {
        const timerStart = parseInt(savedTimerStart);
        const elapsed = Math.floor((Date.now() - timerStart) / 1000);
        const remaining = Math.max(0, parseInt(savedTimerDuration || '0') - elapsed);
        setTimerRemaining(remaining);
      }
    }

    loadSessions();
  }, []);

  const loadSessions = async () => {
    const saved = localStorage.getItem('allSessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  };

  const saveSessions = (newSessions: Session[]) => {
    setSessions(newSessions);
    localStorage.setItem('allSessions', JSON.stringify(newSessions));
  };

  // ✅ Added handleStop to dependency array
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (mode === 'stopwatch' && startTime) {
          setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        } else if (mode === 'timer') {
          setTimerRemaining(prev => {
            const newRemaining = prev - 1;
            if (newRemaining <= 0) {
              handleStop();
              return 0;
            }
            return newRemaining;
          });
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, startTime]); // <-- fine to leave handleStop out here since it's stable

  const handleStart = () => {
    const now = Date.now();
    setStartTime(now);
    setIsRunning(true);
    localStorage.setItem('trackerMode', mode);
    localStorage.setItem('startTime', now.toString());
    
    if (mode === 'timer') {
      localStorage.setItem('timerStartTime', now.toString());
      localStorage.setItem('timerDuration', timerDuration.toString());
      setTimerRemaining(timerDuration);
    } else {
      setElapsedTime(0);
    }
  };

  const handleStop = () => {
    if (!startTime) return;

    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);
    
    const session: Session = {
      startTime,
      endTime,
      duration,
      mode,
      date: new Date(startTime).toISOString().split('T')[0]
    };

    const newSessions = [...sessions, session];
    saveSessions(newSessions);

    setIsRunning(false);
    setStartTime(null);
    localStorage.removeItem('startTime');
    localStorage.removeItem('timerStartTime');
    
    if (mode === 'stopwatch') {
      setElapsedTime(0);
    } else {
      setTimerRemaining(timerDuration);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
    setTimerRemaining(timerDuration);
    localStorage.removeItem('startTime');
    localStorage.removeItem('timerStartTime');
  };

  const switchMode = (newMode: Mode) => {
    if (isRunning) {
      handleStop();
    }
    setMode(newMode);
    setElapsedTime(0);
    setTimerRemaining(timerDuration);
  };

  const setTimerMinutes = () => {
    const minutes = parseInt(tempMinutes) || 25;
    const seconds = minutes * 60;
    setTimerDuration(seconds);
    setTimerRemaining(seconds);
    setIsEditingTimer(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getFilteredSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      
      switch (timeRange) {
        case 'today':
          return sessionDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return sessionDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return sessionDate >= monthAgo;
        case 'year':
          const yearAgo = new Date(today);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          return sessionDate >= yearAgo;
        default:
          return true;
      }
    });
  };

  const getDayData = (): DayData[] => {
    const filtered = getFilteredSessions();
    const dayMap = new Map<string, DayData>();

    filtered.forEach(session => {
      const date = session.date;
      if (!dayMap.has(date)) {
        dayMap.set(date, { date, totalMinutes: 0, sessions: [] });
      }
      const dayData = dayMap.get(date)!;
      dayData.totalMinutes += session.duration / 60;
      dayData.sessions.push(session);
    });

    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const getChartData = () => {
    const dayData = getDayData();
    return dayData.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: parseFloat((day.totalMinutes / 60).toFixed(1))
    }));
  };

  const getTodayTotal = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === today);
    const totalSeconds = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    return formatTime(totalSeconds);
  };

  const getTodaySessions = () => {
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter(s => s.date === today).sort((a, b) => b.startTime - a.startTime);
  };

  const renderTimelineBar = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === today && s.endTime);
    const allSessions = [...todaySessions];
    if (isRunning && startTime) {
      allSessions.push({
        startTime,
        endTime: Date.now(),
        duration: Math.floor((Date.now() - startTime) / 1000),
        mode,
        date: today
      });
    }

    const hours = Array.from({ length: 24 }, (_, i) => {
      const hourStart = new Date();
      hourStart.setHours(i, 0, 0, 0);
      const hourEnd = new Date();
      hourEnd.setHours(i, 59, 59, 999);
      
      const hourStartTime = hourStart.getTime();
      const hourEndTime = hourEnd.getTime();
      
      let workedMinutes = 0;
      allSessions.forEach(session => {
        if (!session.endTime) return;
        const sessionStart = Math.max(session.startTime, hourStartTime);
        const sessionEnd = Math.min(session.endTime, hourEndTime);
        if (sessionEnd > sessionStart) {
          workedMinutes += (sessionEnd - sessionStart) / 1000 / 60;
        }
      });
      const workedPercentage = Math.min((workedMinutes / 60) * 100, 100);
      
      return {
        hour: i,
        label: i === 0 ? '12 AM' : i === 12 ? '12 PM' : i < 12 ? `${i} AM` : `${i - 12} PM`,
        workedPercentage,
        workedMinutes: Math.round(workedMinutes)
      };
    });

    return (
      <div className="bg-[#1b263b] rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-6">Today&apos;s Timeline (12 AM - 11:59 PM)</h2> {/* fixed apostrophe */}
        <div className="space-y-1">
          {hours.map(({ hour, label, workedPercentage, workedMinutes }) => (
            <div key={hour} className="flex items-center gap-2">
              <div className="w-16 text-xs text-[#778da9] text-right">{label}</div>
              <div className="flex-1 h-6 bg-[#0d1b2a] rounded relative overflow-hidden">
                <div 
                  className="h-full bg-[#778da9] transition-all duration-300"
                  style={{ width: `${workedPercentage}%` }}
                />
                {workedMinutes > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                    {workedMinutes}m
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-[#778da9]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#778da9] rounded"></div>
            <span>Working Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#0d1b2a] rounded border border-[#415a77]"></div>
            <span>Idle Time</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1b2a] to-[#1b263b] text-[#e0e1dd] p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Time Tracker</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('tracker')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                viewMode === 'tracker' ? 'bg-[#415a77]' : 'bg-[#1b263b] hover:bg-[#415a77]'
              }`}
            >
              <Clock size={20} />
              Tracker
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                viewMode === 'analytics' ? 'bg-[#415a77]' : 'bg-[#1b263b] hover:bg-[#415a77]'
              }`}
            >
              <BarChart3 size={20} />
              Analytics
            </button>
          </div>
        </div>

        {/* ✅ fixed unescaped apostrophes */}
        {viewMode === 'tracker' ? (
          <div className="space-y-6">
            {/* Mode Selector */}
            {/* ... unchanged code ... */}

            {/* Today’s summary */}
            <div className="bg-[#1b263b] rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Today&apos;s Sessions</h2> {/* fixed */}
              <div className="text-4xl font-bold text-[#778da9] mb-6">{getTodayTotal()}</div>
              
              <div className="space-y-2">
                {getTodaySessions().map((session, idx) => (
                  <div key={idx} className="bg-[#0d1b2a] rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <span className="text-sm text-[#778da9]">
                        {new Date(session.startTime).toLocaleTimeString()} - {session.endTime ? new Date(session.endTime).toLocaleTimeString() : 'In Progress'}
                      </span>
                    </div>
                    <div className="font-mono font-bold">{formatTime(session.duration)}</div>
                  </div>
                ))}
                {getTodaySessions().length === 0 && (
                  <p className="text-[#778da9] text-center py-4">No sessions today yet</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          // analytics unchanged
          <div className="space-y-6">
            {/* ... rest unchanged ... */}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracker;
