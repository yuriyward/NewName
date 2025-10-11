/**
 * Debug logging utilities for troubleshooting rename decisions
 */
import type { DebugContext, DebugEvent, DebugLevel } from './types';
import { logVerboseContext } from './verbose-formatter';

class DebugLogger {
  private enabled = false;
  private level: DebugLevel = 'basic';
  private contexts = new Map<string, DebugContext>();

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setLevel(level: DebugLevel): void {
    this.level = level;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  log(...args: unknown[]): void {
    if (!this.enabled) return;
    console.log(...args);
  }

  warn(...args: unknown[]): void {
    console.warn(...args);
    if (!this.enabled) return;
  }

  error(...args: unknown[]): void {
    console.error(...args);
    if (!this.enabled) return;
  }

  getLevel(): DebugLevel {
    return this.level;
  }

  createDownloadId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  startContext(downloadId: string, initialData: Partial<DebugContext>): void {
    if (!this.enabled) return;
    if (
      !initialData.signals ||
      !initialData.evaluation ||
      !initialData.strategy
    ) {
      return;
    }

    const context: DebugContext = {
      downloadId,
      timestamp: Date.now(),
      signals: initialData.signals,
      evaluation: initialData.evaluation,
      strategy: initialData.strategy,
      processingTime: 0,
      ...initialData,
    };

    this.contexts.set(downloadId, context);
    this.logEvent({
      type: 'instant-baseline-start',
      timestamp: Date.now(),
      downloadId,
      data: {
        signals: context.signals,
        strategy: context.strategy.selected,
      },
    });
  }

  updateContext(downloadId: string, updates: Partial<DebugContext>): void {
    if (!this.enabled) return;

    const existing = this.contexts.get(downloadId);
    if (!existing) return;

    const updated = { ...existing, ...updates };
    this.contexts.set(downloadId, updated);
  }

  finishContext(downloadId: string, finalData: Partial<DebugContext>): void {
    if (!this.enabled) return;

    const context = this.contexts.get(downloadId);
    if (!context) return;

    const finalContext: DebugContext = {
      ...context,
      ...finalData,
      processingTime: Date.now() - context.timestamp,
    };

    this.contexts.set(downloadId, finalContext);
    this.logFinalResult(finalContext);
    this.logEvent({
      type: 'instant-baseline-complete',
      timestamp: Date.now(),
      downloadId,
      data: {
        evaluation: finalContext.evaluation,
        processingTime: finalContext.processingTime,
      },
    });

    // Clean up old contexts (keep last 10)
    if (this.contexts.size > 10) {
      const entries = Array.from(this.contexts.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const toKeep = entries.slice(0, 10);
      this.contexts.clear();
      for (const [id, ctx] of toKeep) {
        this.contexts.set(id, ctx);
      }
    }
  }

  getContext(downloadId: string): DebugContext | undefined {
    return this.contexts.get(downloadId);
  }

  getAllContexts(): DebugContext[] {
    return Array.from(this.contexts.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }

  logDecision(downloadId: string, data: Record<string, unknown>): void {
    if (!this.enabled) return;
    this.logEvent({
      type: 'decision',
      timestamp: Date.now(),
      downloadId,
      data,
    });
  }

  private logEvent(event: DebugEvent): void {
    if (!this.enabled) return;

    const prefix = `[NewName Debug ${event.type}]`;

    switch (this.level) {
      case 'verbose':
        console.group(prefix);
        console.log('Event:', event.type);
        console.log('Download ID:', event.downloadId);
        console.log('Timestamp:', new Date(event.timestamp).toISOString());
        console.log('Data:', event.data);
        console.groupEnd();
        break;
      case 'detailed':
        console.log(prefix, {
          type: event.type,
          downloadId: event.downloadId,
          data: event.data,
        });
        break;
      case 'basic':
        console.log(prefix, event.type, event.downloadId);
        break;
    }
  }

  private logFinalResult(context: DebugContext): void {
    if (!this.enabled) return;

    const prefix = '[NewName Debug Final]';

    switch (this.level) {
      case 'verbose':
        console.group(prefix);
        logVerboseContext(context);
        console.groupEnd();
        break;
      case 'detailed':
        this.logDetailedContext(context);
        break;
      case 'basic':
        this.logBasicContext(context);
        break;
    }
  }

  private logBasicContext(context: DebugContext): void {
    const finalName = this.getFinalFilename(context);
    const renamed = context.evaluation.decision.outcome === 'rename';
    console.log(`[NewName Debug] ${context.downloadId}:`, {
      original: context.signals.filename,
      final: finalName,
      renamed,
      strategy: context.strategy.selected,
      time: `${context.processingTime}ms`,
    });
  }

  private logDetailedContext(context: DebugContext): void {
    console.group(`[NewName Debug] ${context.downloadId}`);
    console.log('Original filename:', context.signals.filename);
    console.log('Strategy:', context.strategy.selected);
    console.log('Inputs:', context.strategy.inputs);
    console.log('Generated filename:', this.getFinalFilename(context));
    console.log('Decision:', context.evaluation.decision);
    console.log('Processing time:', `${context.processingTime}ms`);
    console.log('Reason tags:', context.evaluation.reasonTags);
    console.groupEnd();
  }

  private getFinalFilename(context: DebugContext): string {
    if (context.evaluation.rename) {
      return context.evaluation.rename.filename;
    }
    const normalized = context.evaluation.originalPath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts.pop() ?? context.evaluation.originalPath;
  }
}

export const debugLogger = new DebugLogger();
