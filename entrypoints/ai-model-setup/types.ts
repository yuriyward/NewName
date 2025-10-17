import type { AiModelStatusMap } from '@/entrypoints/shared/integrations/chrome-ai/model-status';

export type ModelProgress = {
  started: boolean;
  completed: boolean;
  loaded?: number;
  total?: number;
  error?: string;
  errorCode?: string;
};

export type StatusSnapshot = {
  statuses: AiModelStatusMap;
  lastUpdated: number;
};

export type ModelActionConfig = {
  label: string;
  tone: 'primary' | 'secondary';
};

export type SetupErrorDisplay = {
  title: string;
  description: string;
};
