/**
 * Debug logging utilities for troubleshooting rename decisions
 */
import type {
  DebugCandidate,
  DebugContext,
  DebugEvent,
  DebugLevel,
} from './types';
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
      !initialData.heuristicResult ||
      !initialData.policyResult ||
      !initialData.finalOutcome
    ) {
      return;
    }

    const context: DebugContext = {
      downloadId,
      timestamp: Date.now(),
      signals: initialData.signals,
      heuristicResult: initialData.heuristicResult,
      policyResult: initialData.policyResult,
      finalOutcome: initialData.finalOutcome,
      processingTime: 0,
      renamed: false,
      decision: { shouldRename: false, reason: 'unknown' },
      ...initialData,
    };

    this.contexts.set(downloadId, context);
    this.logEvent({
      type: 'phase1-start',
      timestamp: Date.now(),
      downloadId,
      data: { signals: context.signals },
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

    const finalContext = {
      ...context,
      ...finalData,
      processingTime: Date.now() - context.timestamp,
    };

    this.contexts.set(downloadId, finalContext);
    this.logFinalResult(finalContext);
    this.logEvent({
      type: 'phase1-complete',
      timestamp: Date.now(),
      downloadId,
      data: {
        outcome: finalContext.finalOutcome,
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
    console.log(`[NewName Debug] ${context.downloadId}:`, {
      original: context.signals.filename,
      final: context.finalOutcome.filename,
      renamed: context.renamed,
      reason: context.decision.reason,
      time: `${context.processingTime}ms`,
    });
  }

  private logDetailedContext(context: DebugContext): void {
    console.group(`[NewName Debug] ${context.downloadId}`);
    console.log('Original filename:', context.signals.filename);
    console.log('Final filename:', context.finalOutcome.filename);
    console.log('Renamed:', context.renamed);
    console.log('Decision:', context.decision);
    console.log('Processing time:', `${context.processingTime}ms`);
    console.log('File type:', context.finalOutcome.fileType);
    console.log('Source:', context.finalOutcome.source);
    console.log('Reason tags:', context.finalOutcome.reasonTags);

    if (context.heuristicResult?.debug) {
      console.log('Selected candidate:', {
        value: context.heuristicResult.debug.selectedCandidate.value,
        reason: context.heuristicResult.debug.selectedCandidate.reason,
        score: context.heuristicResult.debug.selectedCandidate.score,
      });
    }
    console.groupEnd();
  }

  logCandidateEvaluation(
    downloadId: string,
    candidates: DebugCandidate[],
  ): void {
    if (!this.enabled || this.level === 'basic') return;

    this.logEvent({
      type: 'candidate-evaluation',
      timestamp: Date.now(),
      downloadId,
      data: { candidates: candidates.slice(0, 5) }, // Limit for performance
    });
  }

  logPolicyApplication(
    downloadId: string,
    policyData: Record<string, unknown>,
  ): void {
    if (!this.enabled || this.level === 'basic') return;

    this.logEvent({
      type: 'policy-application',
      timestamp: Date.now(),
      downloadId,
      data: { policy: policyData },
    });
  }

  logDecision(
    downloadId: string,
    decision: { shouldRename: boolean; reason: string },
  ): void {
    if (!this.enabled) return;

    this.logEvent({
      type: 'decision',
      timestamp: Date.now(),
      downloadId,
      data: { decision },
    });
  }
}

export const debugLogger = new DebugLogger();
