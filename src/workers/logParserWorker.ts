import { LogEntry, LogLevel } from '../types';

interface ParseMessage {
  files: File[];
}

const LEVEL_REGEX = /\b(INFO|ERROR|WARN|WARNING|DEBUG|TRACE|FATAL|CRITICAL)\b/i;
// Match ISO 8601, common syslog, or custom timestamp formats
const DATE_REGEX = /(?:\b|\[)(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?|[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2})(?:\b|\])/;
// Try to match [thread] or [Thread-1]
const THREAD_REGEX = /\[([^\]]+)\]/;
// Try to match logger name (usually comes after level or thread, e.g., c.m.s.MyClass or com.example.MyClass)
const SOURCE_REGEX = /\b([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)\b/;

function parseLine(line: string, fileName: string, lineNumber: number): LogEntry {
  let level: LogLevel = 'UNKNOWN';
  let timestamp: number | null = null;
  let timestampStr = '';
  let message = line;
  let source: string | null = null;
  let thread: string | null = null;
  let metadata: Record<string, any> = {};

  // Try JSON parsing
  if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(line);
      const rawLevel = (parsed.level || parsed.severity || 'UNKNOWN').toUpperCase();
      if (rawLevel === 'WARNING') level = 'WARN';
      else if (rawLevel === 'CRITICAL') level = 'FATAL';
      else level = rawLevel as LogLevel;

      timestampStr = parsed.timestamp || parsed.time || parsed.date || '';
      if (timestampStr) {
        timestamp = new Date(timestampStr).getTime();
      }
      message = parsed.message || parsed.msg || line;
      source = parsed.logger || parsed.source || parsed.name || null;
      thread = parsed.thread || parsed.thread_name || null;
      
      // Extract other fields as metadata
      const knownKeys = ['level', 'severity', 'timestamp', 'time', 'date', 'message', 'msg', 'logger', 'source', 'name', 'thread', 'thread_name'];
      for (const key in parsed) {
        if (!knownKeys.includes(key)) {
          metadata[key] = parsed[key];
        }
      }
      
      return {
        id: `${fileName}-${lineNumber}`,
        timestamp: isNaN(timestamp as number) ? null : timestamp,
        timestampStr,
        level,
        message,
        source,
        thread,
        rawLine: line,
        lineNumber,
        sourceFile: fileName,
        metadata,
      };
    } catch (e) {
      // Not valid JSON, fallback to regex
    }
  }

  // Fallback to regex
  const levelMatch = line.match(LEVEL_REGEX);
  if (levelMatch) {
    let l = levelMatch[1].toUpperCase();
    if (l === 'WARNING') l = 'WARN';
    if (l === 'CRITICAL') l = 'FATAL';
    level = l as LogLevel;
  }

  const dateMatch = line.match(DATE_REGEX);
  if (dateMatch) {
    timestampStr = dateMatch[1];
    timestamp = new Date(timestampStr).getTime();
    if (isNaN(timestamp)) {
      timestamp = null;
    }
  }
  
  // Try to extract thread (often in brackets)
  const threadMatch = line.match(THREAD_REGEX);
  if (threadMatch && threadMatch[1] && !threadMatch[1].match(DATE_REGEX)) {
    // Avoid matching the timestamp if it's in brackets
    thread = threadMatch[1];
  }
  
  // Try to extract source (often a class name like com.example.MyClass)
  const sourceMatch = line.match(SOURCE_REGEX);
  if (sourceMatch) {
    source = sourceMatch[1];
  }

  return {
    id: `${fileName}-${lineNumber}`,
    timestamp,
    timestampStr,
    level,
    message,
    source,
    thread,
    rawLine: line,
    lineNumber,
    sourceFile: fileName,
    metadata,
  };
}

self.onmessage = async (e: MessageEvent<ParseMessage>) => {
  const { files } = e.data;
  const entries: LogEntry[] = [];
  
  for (let f = 0; f < files.length; f++) {
    const file = files[f];
    
    // Report progress
    self.postMessage({ type: 'progress', fileIndex: f, totalFiles: files.length, fileName: file.name });
    
    const text = await file.text();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      entries.push(parseLine(line, file.name, i + 1));
    }
  }

  self.postMessage({ type: 'progress', message: 'Sorting logs by timestamp...' });

  // Sort by timestamp
  entries.sort((a, b) => {
    if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;
    if (a.timestamp) return -1;
    if (b.timestamp) return 1;
    return 0;
  });

  self.postMessage({ type: 'done', entries });
};
