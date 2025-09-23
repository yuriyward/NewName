/**
 * Tests for debug logger functionality
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CandidateReason } from '@/entrypoints/shared/analysis/content-filtering';
import { debugLogger } from './logger';

// Mock console methods
const consoleSpy = {
  log: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
  table: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(console, consoleSpy);
  debugLogger.setEnabled(false);
  debugLogger.setLevel('basic');
});

describe('DebugLogger', () => {
  describe('basic functionality', () => {
    it('should be disabled by default', () => {
      expect(debugLogger.isEnabled()).toBe(false);
    });

    it('should enable/disable correctly', () => {
      debugLogger.setEnabled(true);
      expect(debugLogger.isEnabled()).toBe(true);

      debugLogger.setEnabled(false);
      expect(debugLogger.isEnabled()).toBe(false);
    });

    it('should set debug level', () => {
      debugLogger.setLevel('verbose');
      expect(debugLogger.getLevel()).toBe('verbose');

      debugLogger.setLevel('basic');
      expect(debugLogger.getLevel()).toBe('basic');
    });
  });

  describe('context management', () => {
    beforeEach(() => {
      debugLogger.setEnabled(true);
    });

    it('should create unique download IDs', () => {
      const id1 = debugLogger.createDownloadId();
      const id2 = debugLogger.createDownloadId();

      expect(id1).toMatch(/^debug_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^debug_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should track contexts', () => {
      const downloadId = debugLogger.createDownloadId();
      const mockContext = {
        downloadId,
        timestamp: Date.now(),
        signals: {
          url: 'https://example.com/file.pdf',
          filename: 'document.pdf',
          mime: 'application/pdf',
          referrer: '',
          startTime: '',
        },
        heuristicResult: {
          subject: 'test',
          qualifiers: [],
          reasonTags: [],
          fileType: 'pdf' as const,
          extension: 'pdf',
          source: 'on-device' as const,
          debug: {
            candidateEvaluation: [],
            selectedCandidate: {
              value: 'test',
              reason: 'Title' as CandidateReason,
              score: 80,
              source: 'on-device' as const,
              debug: {
                originalValue: 'test',
                lengthBonus: 0,
                penalty: 0,
                finalScore: 80,
                scoreBreakdown: {
                  base: 80,
                  length: 0,
                  heading: 0,
                  penalty: 0,
                },
              },
            },
            qualifierAnalysis: {
              qualifiers: [],
              reasonTags: [],
              debug: {
                metadata: {},
                appliedRules: [],
              },
            },
            processingTime: 10,
          },
        },
        policyResult: {
          base: 'test',
          extension: 'pdf',
          filename: 'test.pdf',
          debug: {
            input: {
              subject: 'test',
              qualifiers: [],
              extension: 'pdf',
              maxLength: 60,
              separator: 'clean' as const,
              transliterateAscii: false,
            },
            tokenProcessing: {
              subjectTokens: ['test'],
              qualifierTokens: [],
              formattedSubject: ['Test'],
              formattedQualifiers: [],
              includedEntries: [{ value: 'Test', type: 'subject' as const }],
            },
            lengthCalculation: {
              allowance: 56,
              effectiveAllowance: 56,
              finalLength: 8,
            },
          },
        },
        finalOutcome: {
          path: 'test.pdf',
          filename: 'test.pdf',
          reasonTags: [],
          source: 'on-device' as const,
          originalPath: 'document.pdf',
          fileType: 'pdf' as const,
        },
        processingTime: 15,
        renamed: true,
        decision: {
          shouldRename: true,
          reason: 'file type enabled',
        },
      };

      debugLogger.startContext(downloadId, mockContext);
      const retrieved = debugLogger.getContext(downloadId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.downloadId).toBe(downloadId);
    });

    it('should limit context storage', () => {
      // Create more than 10 contexts
      const ids = Array.from({ length: 15 }, () =>
        debugLogger.createDownloadId(),
      );

      ids.forEach((id, index) => {
        debugLogger.startContext(id, {
          downloadId: id,
          timestamp: Date.now() + index,
          signals: {
            url: `https://example.com/file${index}.pdf`,
            filename: `document${index}.pdf`,
            mime: 'application/pdf',
            referrer: '',
            startTime: '',
          },
          heuristicResult: {
            subject: '',
            qualifiers: [],
            reasonTags: [],
            fileType: 'pdf' as const,
            extension: null,
            source: 'on-device' as const,
            debug: {
              candidateEvaluation: [],
              selectedCandidate: {
                value: 'test',
                reason: 'Title' as CandidateReason,
                score: 80,
                source: 'on-device' as const,
                debug: {
                  originalValue: 'test',
                  lengthBonus: 0,
                  penalty: 0,
                  finalScore: 80,
                  scoreBreakdown: {
                    base: 80,
                    length: 0,
                    penalty: 0,
                  },
                },
              },
              qualifierAnalysis: {
                qualifiers: [],
                reasonTags: [],
                debug: {
                  metadata: {},
                  appliedRules: [],
                },
              },
              processingTime: 0,
            },
          },
          policyResult: {
            base: '',
            extension: null,
            filename: '',
            debug: {
              input: {
                subject: 'test',
                qualifiers: [],
                extension: 'pdf',
                maxLength: 100,
                separator: 'clean' as const,
                transliterateAscii: false,
              },
              tokenProcessing: {
                subjectTokens: ['test'],
                qualifierTokens: [],
                formattedSubject: ['test'],
                formattedQualifiers: [],
                includedEntries: [],
              },
              lengthCalculation: {
                allowance: 100,
                effectiveAllowance: 100,
                finalLength: 8,
              },
            },
          },
          finalOutcome: {
            path: `test${index}.pdf`,
            filename: `test${index}.pdf`,
            reasonTags: [],
            source: 'on-device' as const,
            originalPath: `document${index}.pdf`,
            fileType: 'pdf' as const,
          },
          processingTime: 0,
          renamed: false,
          decision: { shouldRename: false, reason: 'pending' },
        });

        debugLogger.finishContext(id, {
          processingTime: 10,
          renamed: true,
          decision: { shouldRename: true, reason: 'test' },
        });
      });

      const allContexts = debugLogger.getAllContexts();
      expect(allContexts.length).toBeLessThanOrEqual(10);
    });
  });

  describe('logging behavior', () => {
    beforeEach(() => {
      debugLogger.setEnabled(true);
    });

    it('should not log when disabled', () => {
      debugLogger.setEnabled(false);
      const downloadId = debugLogger.createDownloadId();

      debugLogger.logCandidateEvaluation(downloadId, []);
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log at basic level', () => {
      debugLogger.setLevel('basic');
      const downloadId = debugLogger.createDownloadId();

      debugLogger.logDecision(downloadId, {
        shouldRename: true,
        reason: 'test',
      });
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log more at detailed level', () => {
      debugLogger.setLevel('detailed');
      const downloadId = debugLogger.createDownloadId();

      debugLogger.logPolicyApplication(downloadId, { test: 'data' });
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log most at verbose level', () => {
      debugLogger.setLevel('verbose');
      const downloadId = debugLogger.createDownloadId();

      debugLogger.logDecision(downloadId, {
        shouldRename: true,
        reason: 'test',
      });
      expect(consoleSpy.group).toHaveBeenCalled();
    });
  });
});
