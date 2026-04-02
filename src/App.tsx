import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UploadCloud, FileText, BarChart2, AlertTriangle, Moon, Sun, Search, Download, Trash2, CheckCircle, Info, Folder, Activity, Clock, Fingerprint, FolderOpen, Lightbulb, LayoutDashboard, Terminal, Github } from 'lucide-react';
import { LogEntry, LogLevel, LogStats, Insight } from './types';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, Brush
} from 'recharts';
import html2canvas from 'html2canvas';

import LogWorker from './workers/logParserWorker?worker';
import { LandingPage } from './LandingPage';

const LEVEL_COLORS: Record<string, string> = {
  INFO: '#3b82f6', // blue-500
  ERROR: '#ef4444', // red-500
  WARN: '#f59e0b', // amber-500
  DEBUG: '#9ca3af', // gray-400
  TRACE: '#d1d5db', // gray-300
  FATAL: '#b91c1c', // red-700
  UNKNOWN: '#9ca3af',
};

type TabType = 'overview' | 'timeline' | 'errors' | 'patterns' | 'sources' | 'search' | 'insights' | 'raw';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState<{ fileIndex: number; totalFiles: number; fileName: string; message?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const [searchQuery, setSearchQuery] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set(['INFO', 'ERROR', 'WARN', 'DEBUG', 'TRACE', 'FATAL', 'UNKNOWN']));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const handleFiles = async (fileList: FileList | File[]) => {
    setIsParsing(true);
    const filesArray = Array.from(fileList).filter(f => f.type === 'text/plain' || f.name.endsWith('.log') || f.name.endsWith('.txt') || f.name.endsWith('.json') || f.name.endsWith('.out') || f.name.endsWith('.err') || f.name.endsWith('.syslog'));

    if (filesArray.length === 0) {
      setIsParsing(false);
      setParseProgress(null);
      return;
    }

    setParseProgress({ fileIndex: 0, totalFiles: filesArray.length, fileName: 'Starting...' });

    if (workerRef.current) {
      workerRef.current.terminate();
    }

    workerRef.current = new LogWorker();
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'progress') {
        setParseProgress({
          fileIndex: e.data.fileIndex ?? parseProgress?.fileIndex ?? 0,
          totalFiles: e.data.totalFiles ?? parseProgress?.totalFiles ?? filesArray.length,
          fileName: e.data.fileName ?? parseProgress?.fileName ?? '',
          message: e.data.message
        });
      } else if (e.data.type === 'done') {
        setLogs(e.data.entries);
        setIsParsing(false);
        setParseProgress(null);
      }
    };
    workerRef.current.postMessage({ files: filesArray });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const filteredLogs = useMemo(() => {
    let result = logs.filter(log => selectedLevels.has(log.level));

    if (searchQuery) {
      if (useRegex) {
        try {
          const regex = new RegExp(searchQuery, 'i');
          result = result.filter(log => regex.test(log.rawLine));
        } catch (e) {
          // Invalid regex, ignore search
        }
      } else {
        const lowerQuery = searchQuery.toLowerCase();
        result = result.filter(log => log.rawLine.toLowerCase().includes(lowerQuery));
      }
    }

    return result;
  }, [logs, selectedLevels, searchQuery, useRegex]);

  const [page, setPage] = useState(1);
  const itemsPerPage = 100;
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, page]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const stats = useMemo(() => {
    const s: LogStats = {
      totalLines: logs.length,
      parsedLines: logs.filter(l => l.timestamp !== null).length,
      levelCounts: { INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0, TRACE: 0, FATAL: 0, UNKNOWN: 0 },
      startTime: logs.length > 0 ? logs[0].timestamp : null,
      endTime: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
      durationMs: 0,
      logsPerSecondAvg: 0,
      logsPerSecondPeak: 0,
      errorRate: 0,
      uniqueFiles: 0,
      uniqueSources: 0,
    };

    const files = new Set<string>();
    const sources = new Set<string>();

    logs.forEach(l => {
      if (s.levelCounts[l.level] !== undefined) {
        s.levelCounts[l.level]++;
      } else {
        s.levelCounts.UNKNOWN++;
      }
      files.add(l.sourceFile);
      if (l.source) sources.add(l.source);
    });

    s.uniqueFiles = files.size;
    s.uniqueSources = sources.size;

    if (s.startTime && s.endTime) {
      s.durationMs = s.endTime - s.startTime;
      if (s.durationMs > 0) {
        s.logsPerSecondAvg = (s.totalLines / s.durationMs) * 1000;
      }
    }

    if (s.totalLines > 0) {
      s.errorRate = (s.levelCounts.ERROR + s.levelCounts.FATAL) / s.totalLines;
    }

    return s;
  }, [logs]);

  const chartData = useMemo(() => {
    if (filteredLogs.length === 0) return [];

    const timeRange = (stats.endTime || 0) - (stats.startTime || 0);

    // Target ~100 buckets
    let bucketSize = 60 * 1000; // 1 minute default
    if (timeRange > 0) {
      const targetBuckets = 100;
      const rawBucketSize = timeRange / targetBuckets;

      if (rawBucketSize <= 1000) bucketSize = 1000; // 1 second
      else if (rawBucketSize <= 60 * 1000) bucketSize = 60 * 1000; // 1 minute
      else if (rawBucketSize <= 5 * 60 * 1000) bucketSize = 5 * 60 * 1000; // 5 minutes
      else if (rawBucketSize <= 60 * 60 * 1000) bucketSize = 60 * 60 * 1000; // 1 hour
      else if (rawBucketSize <= 24 * 60 * 60 * 1000) bucketSize = 24 * 60 * 60 * 1000; // 1 day
      else bucketSize = Math.ceil(rawBucketSize / (24 * 60 * 60 * 1000)) * 24 * 60 * 60 * 1000; // multiple days
    }

    const buckets: Record<number, Record<string, number>> = {};

    filteredLogs.forEach(log => {
      if (!log.timestamp) return;
      const bucketTime = Math.floor(log.timestamp / bucketSize) * bucketSize;
      if (!buckets[bucketTime]) {
        buckets[bucketTime] = { time: bucketTime, INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0, FATAL: 0, UNKNOWN: 0 };
      }
      if (buckets[bucketTime][log.level] !== undefined) {
        buckets[bucketTime][log.level]++;
      }
    });

    return Object.values(buckets).sort((a, b) => a.time - b.time).map(b => {
      let formatStr = 'HH:mm:ss';
      if (bucketSize >= 24 * 60 * 60 * 1000) formatStr = 'MMM dd';
      else if (bucketSize >= 60 * 1000) formatStr = 'MMM dd HH:mm';

      return {
        ...b,
        timeStr: format(new Date(b.time), formatStr)
      };
    });
  }, [filteredLogs, stats]);

  const pieData = useMemo(() => {
    return (Object.entries(stats.levelCounts) as [string, number][])
      .filter(([_, count]) => count > 0)
      .map(([level, count]) => ({ name: level, value: count }));
  }, [stats]);

  const exportCSV = () => {
    const header = "Timestamp,Level,Source,Message\n";
    const csv = filteredLogs.map(l => `"${l.timestampStr}","${l.level}","${l.sourceFile}","${l.message.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logninja_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportChart = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff' });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch (e) {
      console.error('Failed to export chart', e);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setSearchQuery('');
    setPage(1);
  };

  const toggleLevel = (level: LogLevel) => {
    const newLevels = new Set(selectedLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setSelectedLevels(newLevels);
    setPage(1);
  };

  const insights = useMemo(() => {
    const result: Insight[] = [];
    let id = 1;

    if (stats.errorRate > 0.1) {
      result.push({ id: id++, severity: 'high', category: 'reliability', title: 'High error rate detected', message: `Error rate is ${(stats.errorRate * 100).toFixed(1)}% (>10%).` });
    } else if (stats.errorRate > 0.02) {
      result.push({ id: id++, severity: 'medium', category: 'reliability', title: 'Moderate error rate', message: `Error rate is ${(stats.errorRate * 100).toFixed(1)}% (>2%).` });
    }

    if (stats.levelCounts.FATAL > 0) {
      result.push({ id: id++, severity: 'high', category: 'reliability', title: 'Fatal errors detected', message: `Found ${stats.levelCounts.FATAL} fatal errors.` });
    }

    if (stats.totalLines > 0 && stats.levelCounts.ERROR === 0 && stats.levelCounts.FATAL === 0) {
      result.push({ id: id++, severity: 'low', category: 'positive', title: 'Clean logs — no errors found 🎉', message: '0 errors across all files.' });
    }

    if (stats.totalLines > 0 && (stats.levelCounts.DEBUG + stats.levelCounts.TRACE) / stats.totalLines > 0.9) {
      result.push({ id: id++, severity: 'low', category: 'config', title: 'Verbose logging detected', message: '>90% of logs are DEBUG/TRACE.' });
    }

    // Find dominant error
    const errorMessages = new Map<string, number>();
    let maxErrorCount = 0;
    let dominantError = '';

    filteredLogs.forEach(l => {
      if (l.level === 'ERROR' || l.level === 'FATAL') {
        const count = (errorMessages.get(l.message) || 0) + 1;
        errorMessages.set(l.message, count);
        if (count > maxErrorCount) {
          maxErrorCount = count;
          dominantError = l.message;
        }
      }
    });

    const totalErrors = stats.levelCounts.ERROR + stats.levelCounts.FATAL;
    if (totalErrors > 0 && maxErrorCount / totalErrors > 0.5) {
      result.push({ id: id++, severity: 'high', category: 'errors', title: 'Dominant error pattern', message: `Single error message accounts for ${((maxErrorCount / totalErrors) * 100).toFixed(1)}% of all errors: "${dominantError.substring(0, 50)}..."` });
    }

    // Check for quiet gaps
    let maxGap = 0;
    for (let i = 1; i < filteredLogs.length; i++) {
      const prev = filteredLogs[i - 1].timestamp;
      const curr = filteredLogs[i].timestamp;
      if (prev && curr) {
        const gap = curr - prev;
        if (gap > maxGap) maxGap = gap;
      }
    }

    if (maxGap > 5 * 60 * 1000) { // 5 minutes
      result.push({ id: id++, severity: 'medium', category: 'availability', title: 'Service gap detected', message: `Quiet gap of ${(maxGap / 60000).toFixed(1)} minutes detected.` });
    }

    return result;
  }, [stats, filteredLogs]);

  if (logs.length === 0) {
    return (
      <LandingPage
        onFilesSelected={handleFiles}
        isParsing={isParsing}
        parseProgress={parseProgress || { totalFiles: 0, parsedFiles: 0, currentFile: '', fileIndex: 0, fileName: '', message: '' }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-on-surface)] font-sans transition-colors duration-200 flex flex-col">
      <header className="bg-[var(--color-surface-container)] px-6 md:px-12 xl:px-24 py-4 sticky top-0 z-10 shadow-sm border-b border-[var(--color-outline-variant)]/30 w-full">
        <div className="flex items-center justify-between w-full max-w-[1920px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[var(--color-primary)] to-[#6b3fd4] p-2 rounded-lg shadow-[0_0_15px_rgba(132,85,239,0.4)] border border-white/10">
              <Terminal className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">LogNinja</h1>
          </div>
          <div className="flex items-center gap-4">
            {logs.length > 0 && (
              <>
                <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] transition-colors cursor-pointer border border-[var(--color-outline-variant)]/50">
                  <Download size={16} /> Export CSV
                </button>
                <button onClick={clearLogs} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-[var(--color-error)] bg-[var(--color-error-container)]/20 hover:bg-[var(--color-error-container)]/40 transition-colors cursor-pointer border border-[var(--color-error)]/20">
                  <Trash2 size={16} /> Clear
                </button>
              </>
            )}
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-[var(--color-surface-container-high)] transition-colors cursor-pointer">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-6 w-full md:px-12 xl:px-24">
        <div className="flex flex-col h-full gap-6 max-w-[1920px] mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-[var(--color-surface-container-high)] p-1 rounded-lg w-fit overflow-x-auto max-w-full border border-[var(--color-outline-variant)]/30">
              <button
                onClick={() => setActiveTab('overview')}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap", activeTab === 'overview' ? "bg-[var(--color-surface-bright)] shadow-sm text-[var(--color-primary)]" : "text-[var(--color-outline)] hover:text-[var(--color-on-surface)]")}
              >
                <LayoutDashboard size={16} /> Overview
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap", activeTab === 'timeline' ? "bg-[var(--color-surface-bright)] shadow-sm text-[var(--color-primary)]" : "text-[var(--color-outline)] hover:text-[var(--color-on-surface)]")}
              >
                <Clock size={16} /> Timeline
              </button>
              <button
                onClick={() => setActiveTab('errors')}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap", activeTab === 'errors' ? "bg-[var(--color-surface-bright)] shadow-sm text-[var(--color-primary)]" : "text-[var(--color-outline)] hover:text-[var(--color-on-surface)]")}
              >
                <AlertTriangle size={16} /> Errors
              </button>
              <button
                onClick={() => setActiveTab('patterns')}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap", activeTab === 'patterns' ? "bg-[var(--color-surface-bright)] shadow-sm text-[var(--color-primary)]" : "text-[var(--color-outline)] hover:text-[var(--color-on-surface)]")}
              >
                <Fingerprint size={16} /> Patterns
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap", activeTab === 'sources' ? "bg-[var(--color-surface-bright)] shadow-sm text-[var(--color-primary)]" : "text-[var(--color-outline)] hover:text-[var(--color-on-surface)]")}
              >
                <FolderOpen size={16} /> Sources
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap", activeTab === 'search' ? "bg-[var(--color-surface-bright)] shadow-sm text-[var(--color-primary)]" : "text-[var(--color-outline)] hover:text-[var(--color-on-surface)]")}
              >
                <Search size={16} /> Search
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap", activeTab === 'insights' ? "bg-[var(--color-surface-bright)] shadow-sm text-[var(--color-primary)]" : "text-[var(--color-outline)] hover:text-[var(--color-on-surface)]")}
              >
                <Lightbulb size={16} /> Insights
                {insights.length > 0 && <span className="bg-[var(--color-primary)] text-[var(--color-surface)] text-[10px] px-1.5 py-0.5 rounded-full font-bold">{insights.length}</span>}
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap", activeTab === 'raw' ? "bg-[var(--color-surface-bright)] shadow-sm text-[var(--color-primary)]" : "text-[var(--color-outline)] hover:text-[var(--color-on-surface)]")}
              >
                <FileText size={16} /> Raw Logs
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-3 text-[var(--color-outline)]" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-9 pr-20 py-2 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]/30 rounded-lg text-sm focus:ring-1 focus:ring-[var(--color-primary)] outline-none w-64 transition-shadow text-[var(--color-on-surface)]"
                />
                <button
                  onClick={() => setUseRegex(!useRegex)}
                  className={cn("absolute right-2 text-xs font-mono px-1.5 py-0.5 rounded transition-colors cursor-pointer", useRegex ? "bg-[var(--color-primary-dim)]/20 text-[var(--color-primary)]" : "text-[var(--color-outline)] hover:bg-[var(--color-surface-container-high)]")}
                  title="Toggle Regex"
                >
                  .*
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(stats.levelCounts) as LogLevel[]).filter(l => stats.levelCounts[l] > 0).map(level => (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer",
                  selectedLevels.has(level)
                    ? "bg-[var(--color-surface-container-high)] shadow-sm border-[var(--color-outline-variant)]/50 text-[var(--color-on-surface)]"
                    : "opacity-50 border-transparent hover:bg-[var(--color-surface-container)] text-[var(--color-outline)]"
                )}
              >
                <span className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: LEVEL_COLORS[level], color: LEVEL_COLORS[level] }} />
                {level} <span className="text-[var(--color-outline)] ml-1">{stats.levelCounts[level]}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]/30 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {activeTab === 'overview' && (
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-[var(--color-surface-container-high)] p-4 rounded-xl border border-[var(--color-outline-variant)]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <h3 className="text-sm font-medium text-[var(--color-outline)] mb-1">Total Lines</h3>
                    <p className="text-3xl font-bold text-[var(--color-on-surface)]">{stats.totalLines.toLocaleString()}</p>
                  </div>
                  <div className="bg-[var(--color-surface-container-high)] p-4 rounded-xl border border-[var(--color-outline-variant)]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <h3 className="text-sm font-medium text-[var(--color-outline)] mb-1">Error Rate</h3>
                    <p className="text-3xl font-bold text-[var(--color-error)] drop-shadow-[0_0_8px_rgba(255,110,132,0.4)]">
                      {stats.totalLines > 0 ? (((stats.levelCounts.ERROR + stats.levelCounts.FATAL) / stats.totalLines) * 100).toFixed(2) : 0}%
                    </p>
                  </div>
                  <div className="bg-[var(--color-surface-container-high)] p-4 rounded-xl border border-[var(--color-outline-variant)]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <h3 className="text-sm font-medium text-[var(--color-outline)] mb-1">Time Range</h3>
                    <p className="text-sm font-medium">
                      {stats.startTime ? format(new Date(stats.startTime), 'MMM dd, HH:mm:ss') : 'N/A'}
                      <br />
                      <span className="text-[var(--color-outline)]">to</span>
                      <br />
                      {stats.endTime ? format(new Date(stats.endTime), 'MMM dd, HH:mm:ss') : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-[var(--color-surface-container-high)] p-4 rounded-xl border border-[var(--color-outline-variant)]/20 h-80 relative group shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-medium text-[var(--color-outline)]">Log Volume Over Time</h3>
                      <button onClick={() => exportChart('volume-chart', 'log-volume.png')} className="text-xs text-[var(--color-outline)] hover:text-[var(--color-on-surface)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">Export PNG</button>
                    </div>
                    <div id="volume-chart" className="w-full h-[calc(100%-2rem)]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.3} vertical={false} />
                          <XAxis dataKey="timeStr" stroke="var(--color-outline)" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="var(--color-outline)" fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: 'var(--color-surface-container-high)', borderColor: 'var(--color-outline-variant)', borderRadius: '8px', color: 'var(--color-on-surface)' }}
                            itemStyle={{ fontSize: '12px' }}
                            labelStyle={{ fontSize: '12px', color: 'var(--color-outline)', marginBottom: '4px' }}
                          />
                          <Line type="monotone" dataKey="ERROR" stroke={LEVEL_COLORS.ERROR} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="WARN" stroke={LEVEL_COLORS.WARN} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="INFO" stroke={LEVEL_COLORS.INFO} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-[var(--color-surface-container-high)] p-4 rounded-xl border border-[var(--color-outline-variant)]/20 h-80 flex flex-col relative group shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-medium text-[var(--color-outline)]">Level Distribution</h3>
                      <button onClick={() => exportChart('level-chart', 'level-distribution.png')} className="text-xs text-[var(--color-outline)] hover:text-[var(--color-on-surface)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">Export PNG</button>
                    </div>
                    <div id="level-chart" className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={LEVEL_COLORS[entry.name] || LEVEL_COLORS.UNKNOWN} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: 'var(--color-surface-container-high)', borderColor: 'var(--color-outline-variant)', borderRadius: '8px', color: 'var(--color-on-surface)' }}
                            itemStyle={{ fontSize: '12px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Timeline Analysis</h3>
                  <button
                    onClick={() => exportChart('timelineChart', 'logninja-timeline.png')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/30 rounded hover:bg-[var(--color-surface-bright)] transition-colors cursor-pointer text-[var(--color-on-surface)]"
                  >
                    <Download size={16} />
                    Export Chart
                  </button>
                </div>

                <div className="bg-[var(--color-surface-container-high)] rounded-xl border border-[var(--color-outline-variant)]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] p-4 h-[500px]" id="timelineChart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.3} vertical={false} />
                      <XAxis
                        dataKey="timeStr"
                        stroke="var(--color-outline)"
                        tick={{ fontSize: 12 }}
                        tickMargin={10}
                      />
                      <YAxis
                        stroke="var(--color-outline)"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-surface-container-high)',
                          borderColor: 'var(--color-outline-variant)',
                          color: 'var(--color-on-surface)',
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="ERROR" stackId="a" fill={LEVEL_COLORS.ERROR} name="Error" />
                      <Bar dataKey="WARN" stackId="a" fill={LEVEL_COLORS.WARN} name="Warning" />
                      <Bar dataKey="INFO" stackId="a" fill={LEVEL_COLORS.INFO} name="Info" />
                      <Bar dataKey="DEBUG" stackId="a" fill={LEVEL_COLORS.DEBUG} name="Debug" />
                      <Bar dataKey="TRACE" stackId="a" fill={LEVEL_COLORS.TRACE} name="Trace" />
                      <Brush
                        dataKey="time"
                        height={30}
                        stroke="var(--color-outline)"
                        fill="var(--color-surface-container)"
                        tickFormatter={() => ''}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'errors' && (
              <div className="p-6 overflow-y-auto flex-1">
                <h3 className="text-lg font-semibold mb-6 text-[var(--color-on-surface)]">Error Analysis</h3>

                {stats.levelCounts.ERROR === 0 && stats.levelCounts.FATAL === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[var(--color-outline)]">
                    <CheckCircle size={48} className="text-[var(--color-tertiary)] mb-4 opacity-50" />
                    <p>No errors found in the current log selection.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="bg-[var(--color-surface-container-high)] rounded-xl border border-[var(--color-outline-variant)]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
                      <div className="p-4 border-b border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container)]">
                        <h4 className="font-medium text-[var(--color-on-surface)]">Top Error Messages</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead className="bg-[var(--color-surface-container)]">
                            <tr>
                              <th className="py-2 px-4 font-medium text-[var(--color-outline)] w-16">Count</th>
                              <th className="py-2 px-4 font-medium text-[var(--color-outline)] w-24">%</th>
                              <th className="py-2 px-4 font-medium text-[var(--color-outline)]">Message</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-outline-variant)]/30">
                            {(() => {
                              const errorCounts = new Map<string, number>();
                              filteredLogs.forEach(l => {
                                if (l.level === 'ERROR' || l.level === 'FATAL') {
                                  errorCounts.set(l.message, (errorCounts.get(l.message) || 0) + 1);
                                }
                              });
                              const totalErrors = stats.levelCounts.ERROR + stats.levelCounts.FATAL;
                              return Array.from(errorCounts.entries())
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 10)
                                .map(([msg, count], i) => (
                                  <tr key={i} className="hover:bg-[var(--color-surface-container)] transition-colors">
                                    <td className="py-2 px-4 font-mono text-[var(--color-on-surface)]">{count}</td>
                                    <td className="py-2 px-4 text-[var(--color-outline)]">
                                      {((count / totalErrors) * 100).toFixed(1)}%
                                    </td>
                                    <td className="py-2 px-4 font-mono text-xs break-all text-[var(--color-error)]">
                                      {msg}
                                    </td>
                                  </tr>
                                ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'patterns' && (
              <div className="p-6 overflow-y-auto flex-1">
                <h3 className="text-lg font-semibold mb-6 text-[var(--color-on-surface)]">Pattern Detection</h3>

                <div className="space-y-6">
                  <div className="bg-[var(--color-surface-container-high)] rounded-xl border border-[var(--color-outline-variant)]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container)]">
                      <h4 className="font-medium text-[var(--color-on-surface)]">Frequent Message Templates</h4>
                      <p className="text-xs text-[var(--color-outline)] mt-1">Common log structures with dynamic values abstracted.</p>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-[var(--color-surface-container)] sticky top-0">
                          <tr>
                            <th className="py-2 px-4 font-medium text-[var(--color-outline)] w-24">Count</th>
                            <th className="py-2 px-4 font-medium text-[var(--color-outline)]">Template Pattern</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-outline-variant)]/30">
                          {(() => {
                            const templates = new Map<string, number>();
                            filteredLogs.forEach(l => {
                              // Simple abstraction: replace numbers, UUIDs, IPs, and quoted strings with placeholders
                              let template = l.message
                                .replace(/\b\d+\b/g, '{NUM}')
                                .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '{UUID}')
                                .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '{IP}')
                                .replace(/"[^"]*"/g, '"{STR}"')
                                .replace(/'[^']*'/g, "'{STR}'");

                              templates.set(template, (templates.get(template) || 0) + 1);
                            });

                            return Array.from(templates.entries())
                              .filter(([_, count]) => count > 1)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 20)
                              .map(([template, count], i) => (
                                <tr key={i} className="hover:bg-[var(--color-surface-container)] transition-colors">
                                  <td className="py-2 px-4 font-mono text-[var(--color-on-surface)]">{count}</td>
                                  <td className="py-2 px-4 font-mono text-xs text-[var(--color-outline)] break-all">
                                    {template.split(/(\{NUM\}|\{UUID\}|\{IP\}|\{STR\}|'\{STR\}'|"\{STR\}")/g).map((part, j) => {
                                      if (['{NUM}', '{UUID}', '{IP}', '{STR}', "'{STR}'", '"{STR}"'].includes(part)) {
                                        return <span key={j} className="text-[var(--color-primary)] bg-[var(--color-primary-dim)]/20 px-1 rounded">{part}</span>;
                                      }
                                      return part;
                                    })}
                                  </td>
                                </tr>
                              ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-container-high)] rounded-xl border border-[var(--color-outline-variant)]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container)]">
                      <h4 className="font-medium text-[var(--color-on-surface)]">Activity Bursts</h4>
                      <p className="text-xs text-[var(--color-outline)] mt-1">Time periods with unusually high log volume.</p>
                    </div>
                    <div className="p-4">
                      {(() => {
                        if (logs.length < 100 || !stats.startTime || !stats.endTime) {
                          return <p className="text-[var(--color-outline)] text-sm text-center py-4">Not enough data to detect bursts.</p>;
                        }

                        // Group logs into 1-minute buckets
                        const buckets = new Map<number, number>();
                        logs.forEach(l => {
                          if (l.timestamp) {
                            const minute = Math.floor(l.timestamp.getTime() / 60000) * 60000;
                            buckets.set(minute, (buckets.get(minute) || 0) + 1);
                          }
                        });

                        const bucketArray = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
                        if (bucketArray.length === 0) return null;

                        // Calculate average and standard deviation
                        const counts = bucketArray.map(b => b[1]);
                        const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
                        const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length;
                        const stdDev = Math.sqrt(variance);

                        // Find bursts (count > avg + 2*stdDev)
                        const threshold = avg + (stdDev * 2);
                        const bursts = bucketArray.filter(b => b[1] > threshold && b[1] > 10);

                        if (bursts.length === 0) {
                          return <p className="text-[var(--color-outline)] text-sm text-center py-4">No significant activity bursts detected.</p>;
                        }

                        return (
                          <div className="space-y-3">
                            {bursts.slice(0, 10).map(([time, count], i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Activity className="text-[var(--color-error)]" size={18} />
                                  <div>
                                    <div className="font-medium text-sm text-[var(--color-on-surface)]">{format(new Date(time), 'MMM d, yyyy HH:mm:ss')}</div>
                                    <div className="text-xs text-[var(--color-outline)]">
                                      {count} logs in 1 minute (Avg: {Math.round(avg)})
                                    </div>
                                  </div>
                                </div>
                                <div className="text-[var(--color-error)] font-bold text-lg">
                                  {Math.round(count / avg)}x spike
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sources' && (
              <div className="p-6 overflow-y-auto flex-1">
                <h3 className="text-lg font-semibold mb-6 text-[var(--color-on-surface)]">Source Breakdown</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[var(--color-surface-container-high)] rounded-xl border border-[var(--color-outline-variant)]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container)]">
                      <h4 className="font-medium text-[var(--color-on-surface)]">By File</h4>
                    </div>
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-[var(--color-surface-container)] sticky top-0">
                          <tr>
                            <th className="py-2 px-4 font-medium text-[var(--color-outline)]">File Name</th>
                            <th className="py-2 px-4 font-medium text-[var(--color-outline)] w-24">Lines</th>
                            <th className="py-2 px-4 font-medium text-[var(--color-outline)] w-24">Errors</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-outline-variant)]/30">
                          {(() => {
                            const fileStats = new Map<string, { total: number; errors: number }>();
                            filteredLogs.forEach(l => {
                              const stats = fileStats.get(l.sourceFile) || { total: 0, errors: 0 };
                              stats.total++;
                              if (l.level === 'ERROR' || l.level === 'FATAL') stats.errors++;
                              fileStats.set(l.sourceFile, stats);
                            });
                            return Array.from(fileStats.entries())
                              .sort((a, b) => b[1].total - a[1].total)
                              .map(([file, stats], i) => (
                                <tr key={i} className="hover:bg-[var(--color-surface-container)] transition-colors">
                                  <td className="py-2 px-4 font-mono text-xs text-[var(--color-outline)] truncate max-w-[200px]" title={file}>{file}</td>
                                  <td className="py-2 px-4 font-mono text-[var(--color-on-surface)]">{stats.total}</td>
                                  <td className={cn("py-2 px-4 font-mono", stats.errors > 0 ? "text-[var(--color-error)]" : "text-[var(--color-outline)]")}>{stats.errors}</td>
                                </tr>
                              ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-container-high)] rounded-xl border border-[var(--color-outline-variant)]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container)]">
                      <h4 className="font-medium text-[var(--color-on-surface)]">By Logger / Component</h4>
                    </div>
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-[var(--color-surface-container)] sticky top-0">
                          <tr>
                            <th className="py-2 px-4 font-medium text-[var(--color-outline)]">Source</th>
                            <th className="py-2 px-4 font-medium text-[var(--color-outline)] w-24">Lines</th>
                            <th className="py-2 px-4 font-medium text-[var(--color-outline)] w-24">Errors</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-outline-variant)]/30">
                          {(() => {
                            const sourceStats = new Map<string, { total: number; errors: number }>();
                            filteredLogs.forEach(l => {
                              const source = l.source || 'unknown';
                              const stats = sourceStats.get(source) || { total: 0, errors: 0 };
                              stats.total++;
                              if (l.level === 'ERROR' || l.level === 'FATAL') stats.errors++;
                              sourceStats.set(source, stats);
                            });
                            return Array.from(sourceStats.entries())
                              .sort((a, b) => b[1].total - a[1].total)
                              .slice(0, 50) // Limit to top 50 to avoid massive tables
                              .map(([source, stats], i) => (
                                <tr key={i} className="hover:bg-[var(--color-surface-container)] transition-colors">
                                  <td className="py-2 px-4 font-mono text-xs text-[var(--color-outline)] truncate max-w-[200px]" title={source}>{source}</td>
                                  <td className="py-2 px-4 font-mono text-[var(--color-on-surface)]">{stats.total}</td>
                                  <td className={cn("py-2 px-4 font-mono", stats.errors > 0 ? "text-[var(--color-error)]" : "text-[var(--color-outline)]")}>{stats.errors}</td>
                                </tr>
                              ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[var(--color-outline-variant)]/30 flex justify-between items-center bg-[var(--color-surface-container)]">
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-[var(--color-on-surface)]">Advanced Search</h3>
                    {searchQuery && (
                      <span className="text-sm text-[var(--color-outline)]">
                        {filteredLogs.length} matches found
                      </span>
                    )}
                  </div>
                </div>
                <div className="overflow-auto flex-1 p-4">
                  {!searchQuery ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--color-outline)]">
                      <Search size={48} className="text-[var(--color-outline-variant)] mb-4" />
                      <p>Enter a search query above to see results with context.</p>
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--color-outline)]">
                      <p>No results found for "{searchQuery}".</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {filteredLogs.slice(0, 50).map((match) => {
                        const matchIndex = logs.findIndex(l => l.id === match.id);
                        const contextBefore = logs.slice(Math.max(0, matchIndex - 2), matchIndex);
                        const contextAfter = logs.slice(matchIndex + 1, Math.min(logs.length, matchIndex + 3));

                        return (
                          <div key={match.id} className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/20 rounded-lg overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                            <div className="bg-[var(--color-surface-container)] px-4 py-2 border-b border-[var(--color-outline-variant)]/30 text-xs font-mono text-[var(--color-outline)] flex justify-between">
                              <span>{match.sourceFile}</span>
                              <span>Line {match.lineNumber}</span>
                            </div>
                            <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto text-[var(--color-on-surface-variant)]">
                              {contextBefore.map(log => (
                                <div key={log.id} className="opacity-50 flex gap-4 py-0.5">
                                  <span className="w-12 text-right shrink-0">{log.lineNumber}</span>
                                  <span className="shrink-0 w-16">{log.level}</span>
                                  <span className="break-all">{log.message}</span>
                                </div>
                              ))}
                              <div className="flex gap-4 py-1 bg-[var(--color-primary-dim)]/10 -mx-4 px-4 border-y border-[var(--color-primary)]/20">
                                <span className="w-12 text-right shrink-0 font-bold text-[var(--color-primary)]">{match.lineNumber}</span>
                                <span className="shrink-0 w-16 font-bold" style={{ color: LEVEL_COLORS[match.level] || LEVEL_COLORS.UNKNOWN }}>{match.level}</span>
                                <span className="break-all font-bold text-[var(--color-on-surface)]" dangerouslySetInnerHTML={{
                                  __html: (() => {
                                    try {
                                      const regex = new RegExp(`(${useRegex ? searchQuery : searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                                      return match.message.replace(regex, '<mark class="bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded px-0.5">$1</mark>');
                                    } catch (e) {
                                      return match.message;
                                    }
                                  })()
                                }} />
                              </div>
                              {contextAfter.map(log => (
                                <div key={log.id} className="opacity-50 flex gap-4 py-0.5">
                                  <span className="w-12 text-right shrink-0">{log.lineNumber}</span>
                                  <span className="shrink-0 w-16">{log.level}</span>
                                  <span className="break-all">{log.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {filteredLogs.length > 50 && (
                        <div className="text-center text-sm text-[var(--color-outline)] py-4">
                          Showing first 50 matches. Refine your search to see more.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="p-6 overflow-y-auto flex-1">
                <h2 className="text-lg font-semibold mb-4 text-[var(--color-on-surface)]">Automated Insights</h2>
                {insights.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[var(--color-outline)]">
                    <CheckCircle size={48} className="text-[var(--color-tertiary)] mb-4 opacity-50" />
                    <p>No significant issues detected in the logs.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {insights.map((insight) => (
                      <div
                        key={insight.id}
                        className={cn(
                          "p-4 rounded-xl border flex gap-4 items-start shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                          insight.severity === 'high' ? "bg-[var(--color-error)]/10 border-[var(--color-error)]/20 text-[var(--color-error)]" :
                            insight.severity === 'medium' ? "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20 text-[var(--color-warning)]" :
                              insight.category === 'positive' ? "bg-[var(--color-tertiary)]/10 border-[var(--color-tertiary)]/20 text-[var(--color-tertiary)]" :
                                "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)]"
                        )}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {insight.severity === 'high' ? <AlertTriangle size={20} /> :
                            insight.severity === 'medium' ? <AlertTriangle size={20} /> :
                              insight.category === 'positive' ? <CheckCircle size={20} /> :
                                <Info size={20} />}
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">{insight.title}</h4>
                          <p className="opacity-90">{insight.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-[var(--color-surface-container)] sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                      <tr>
                        <th className="py-2 px-4 font-medium text-[var(--color-outline)] w-48">Timestamp</th>
                        <th className="py-2 px-4 font-medium text-[var(--color-outline)] w-24">Level</th>
                        <th className="py-2 px-4 font-medium text-[var(--color-outline)] w-32 truncate">Source</th>
                        <th className="py-2 px-4 font-medium text-[var(--color-outline)]">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-outline-variant)]/30 font-mono text-xs">
                      {paginatedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-[var(--color-outline)]">No logs match the current filters.</td>
                        </tr>
                      ) : (
                        paginatedLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[var(--color-surface-container)] transition-colors">
                            <td className="py-2 px-4 whitespace-nowrap text-[var(--color-outline)]">
                              {log.timestampStr || '-'}
                            </td>
                            <td className="py-2 px-4">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
                                style={{
                                  backgroundColor: `${LEVEL_COLORS[log.level]}20`,
                                  color: LEVEL_COLORS[log.level]
                                }}
                              >
                                {log.level}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-[var(--color-outline)] truncate max-w-[120px]" title={log.sourceFile}>
                              {log.sourceFile}
                            </td>
                            <td className="py-2 px-4 break-all text-[var(--color-on-surface-variant)]">
                              {searchQuery ? (
                                <span dangerouslySetInnerHTML={{
                                  __html: (() => {
                                    try {
                                      const regex = new RegExp(`(${useRegex ? searchQuery : searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                                      return log.message.replace(regex, '<mark class="bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded px-0.5">$1</mark>');
                                    } catch (e) {
                                      return log.message;
                                    }
                                  })()
                                }} />
                              ) : (
                                log.message
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="border-t border-[var(--color-outline-variant)]/30 p-3 flex items-center justify-between bg-[var(--color-surface-container)]">
                    <span className="text-sm text-[var(--color-outline)]">
                      Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 rounded border border-[var(--color-outline-variant)]/50 disabled:opacity-50 hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] text-sm cursor-pointer transition-colors"
                      >
                        Prev
                      </button>
                      <span className="px-3 py-1 text-sm flex items-center text-[var(--color-on-surface)]">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 rounded border border-[var(--color-outline-variant)]/50 disabled:opacity-50 hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] text-sm cursor-pointer transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-outline-variant)]/20 py-6 px-6 mt-auto w-full">
        <div className="w-full max-w-[1920px] px-0 md:px-10 lg:px-18 mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-[var(--color-on-surface)]">
              <Terminal className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2.5} />
              <span className="text-base font-bold tracking-tight">LogNinja</span>
            </div>
            <div className="w-[1px] h-4 bg-[var(--color-outline-variant)]/30"></div>
            <a href="https://github.com/nagarjunx/logninja" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors">
              <Github className="w-4 h-4" />
              <span className="font-medium">GitHub</span>
            </a>
          </div>

          <div className="text-sm font-medium text-[var(--color-outline)] text-center md:text-right">
            © 2026 LogNinja • Built with 💖 by Nagarjuna
          </div>
        </div>
      </footer>
    </div>
  );
}
