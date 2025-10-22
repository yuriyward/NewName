// Icon components for the NewName extension design system
// Using Heroicons for consistent, professional appearance

import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PhotoIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  TableCellsIcon,
  VideoCameraIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export const FileTypeIcons = {
  PDF: () => <DocumentTextIcon className="w-4 h-4" />,
  Image: () => <PhotoIcon className="w-4 h-4" />,
  Audio: () => <SpeakerWaveIcon className="w-4 h-4" />,
  Video: () => <VideoCameraIcon className="w-4 h-4" />,
  Archive: () => <ArchiveBoxIcon className="w-4 h-4" />,
  Data: () => <TableCellsIcon className="w-4 h-4" />,
};

export const ActionIcons = {
  Undo: () => <ArrowUturnLeftIcon className="w-4 h-4" />,
  Apply: () => <CheckCircleIcon className="w-4 h-4" />,
  Edit: () => <PencilIcon className="w-4 h-4" />,
  Copy: () => <DocumentDuplicateIcon className="w-4 h-4" />,
  Settings: () => <Cog6ToothIcon className="w-4 h-4" />,
  Close: () => <XMarkIcon className="w-4 h-4" />,
  ChevronDown: () => <ChevronDownIcon className="w-4 h-4" />,
  ChevronRight: () => <ChevronRightIcon className="w-4 h-4" />,
};

export const StatusIcons = {
  OnDevice: () => <ComputerDesktopIcon className="w-4 h-4" />,
  CloudAssist: () => <CloudIcon className="w-4 h-4" />,
  Loading: () => <ArrowPathIcon className="w-4 h-4 animate-spin" />,
  Success: () => <CheckIcon className="w-4 h-4" />,
  Warning: () => <ExclamationTriangleIcon className="w-4 h-4" />,
  Error: () => <XCircleIcon className="w-4 h-4" />,
};

export const AnimatedIcons = {
  Spinner: ({ className = 'w-4 h-4' }) => (
    <ArrowPathIcon className={`${className} animate-spin`} />
  ),
  Sparkles: () => <SparklesIcon className="w-4 h-4" />,
};

// Language flags - kept as text for design system documentation
export const LanguageFlags = {
  PL: () => <span className="text-sm">🇵🇱</span>,
  EN: () => <span className="text-sm">🇬🇧</span>,
  UK: () => <span className="text-sm">🇺🇦</span>,
  Auto: () => <span className="text-sm">🌐</span>,
};
