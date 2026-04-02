export type LogLevel = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' | 'TRACE' | 'FATAL' | 'UNKNOWN';

export interface LogEntry {
  id: string;
  timestamp: number | null; // Storing as number for easier sorting/charting, can convert to Date
  timestampStr: string;
  level: LogLevel;
  message: string;
  source: string | null;
  thread: string | null;
  rawLine: string;
  lineNumber: number;
  sourceFile: string;
  metadata: Record<string, any>;
}

export interface LogStats {
  totalLines: number;
  parsedLines: number;
  levelCounts: Record<LogLevel, number>;
  startTime: number | null;
  endTime: number | null;
  durationMs: number;
  logsPerSecondAvg: number;
  logsPerSecondPeak: number;
  errorRate: number;
  uniqueFiles: number;
  uniqueSources: number;
}

export interface Insight {
  id: number;
  severity: 'high' | 'medium' | 'low';
  category: 'reliability' | 'stability' | 'availability' | 'errors' | 'config' | 'positive';
  title: string;
  message: string;
}
