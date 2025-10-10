/**
 * Shared types for confirm toast messaging between contexts.
 */
import type {
  SensitiveDetectionMatch,
  SensitiveReason,
} from '@/entrypoints/shared/classification/sensitive-content';
import type { ConfirmToastTriggerSource } from '@/entrypoints/shared/settings/confirm-toast-routing';
import type { FileType, Mode } from '@/entrypoints/shared/settings/types';

export type ConfirmToastAction = 'approve' | 'keep-original' | 'always-apply';

export interface ConfirmToastProposal {
  toastId: string;
  createdAt: number;
  historyId: string;
  downloadId?: string;
  originalFilename: string;
  proposedFilename: string;
  proposedPath: string;
  fileType: FileType;
  mode: Mode;
  reasonTags: string[];
  sensitiveReasons: SensitiveReason[];
  sensitiveMatches: SensitiveDetectionMatch[];
  triggerSources: ConfirmToastTriggerSource[];
  autoApplyAt: number | null;
  autoApplyDelaySeconds: number | null;
  allowAutoApply: boolean;
  allowAlwaysApply: boolean;
}

export interface ShowConfirmToastMessage {
  proposal: ConfirmToastProposal;
}

export interface ConfirmToastDecisionMessage {
  toastId: string;
  historyId: string;
  downloadId?: string;
  action: ConfirmToastAction;
  editedFilename?: string;
}

export type ConfirmToastStatusState =
  | 'applied'
  | 'kept'
  | 'timeout'
  | 'dismissed'
  | 'error';

export interface ConfirmToastStatusMessage {
  toastId: string;
  state: ConfirmToastStatusState;
  message?: string;
}

export type ConfirmToastLifecycleState = 'pending' | ConfirmToastStatusState;

export interface ConfirmToastState extends ConfirmToastProposal {
  status: ConfirmToastLifecycleState;
  statusMessage?: string;
  resolving: boolean;
}

export interface RenameToastProposal {
  toastId: string;
  createdAt: number;
  originalFilename: string;
  finalFilename: string;
  downloadId?: string;
}

export interface ShowRenameToastMessage {
  toast: RenameToastProposal;
}
