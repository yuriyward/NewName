/**
 * Offscreen Logger - Debugging utility for offscreen documents
 *
 * Provides logging for offscreen contexts where storage access is unavailable.
 * Works independently without relying on chrome.storage or WXT storage APIs.
 * Always enabled to ensure offscreen operations are visible during debugging.
 *
 * Usage in offscreen documents:
 * - `offscreenLogger.log(message, data)` - Standard logging
 * - `offscreenLogger.warn(message, data)` - Warning messages
 * - `offscreenLogger.error(message, data)` - Error messages
 */

type LogLevel = 'log' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class OffscreenLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 100; // Keep last 100 logs in memory for debugging
  private enabled = true;

  /**
   * Mirror debugLogger.isEnabled() API. Offscreen logging is always on.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Mirror debugLogger.setEnabled() API. Stored locally to satisfy callers.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log a message at standard level
   * Always outputs to console in offscreen documents
   */
  log(message: string, data?: unknown): void {
    if (!this.enabled) return;
    this.recordLog('log', message, data);
    if (data !== undefined) {
      console.log(`[Offscreen] ${message}`, data);
    } else {
      console.log(`[Offscreen] ${message}`);
    }
  }

  /**
   * Log a warning message
   * Always outputs to console in offscreen documents
   */
  warn(message: string, data?: unknown): void {
    if (!this.enabled) return;
    this.recordLog('warn', message, data);
    if (data !== undefined) {
      console.warn(`[Offscreen] ${message}`, data);
    } else {
      console.warn(`[Offscreen] ${message}`);
    }
  }

  /**
   * Log an error message
   * Always outputs to console in offscreen documents
   */
  error(message: string, data?: unknown): void {
    if (!this.enabled) return;
    this.recordLog('error', message, data);
    if (data !== undefined) {
      console.error(`[Offscreen] ${message}`, data);
    } else {
      console.error(`[Offscreen] ${message}`);
    }
  }

  /**
   * Get all recorded logs (useful for debugging)
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear recorded logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Record a log entry in memory
   */
  private recordLog(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Export logs as JSON for troubleshooting
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const offscreenLogger = new OffscreenLogger();
