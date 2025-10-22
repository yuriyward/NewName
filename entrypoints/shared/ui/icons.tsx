/**
 * Icon component wrapper using Heroicons React library
 * Provides a centralized, type-safe way to use icons throughout the app
 */

import {
  BoltIcon,
  CheckCircleIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MoonIcon,
  PauseIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SunIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import type React from 'react';

export interface IconProps {
  className?: string;
  'aria-label'?: string;
}

/**
 * Icon component factory - provides semantic icon components
 * sized consistently (defaults to 16px)
 */

export const IconCheckmark: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <CheckIcon className={className} {...props} />;

export const IconSparkles: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <SparklesIcon className={className} {...props} />;

export const IconWarning: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <ExclamationTriangleIcon className={className} {...props} />;

export const IconError: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <XCircleIcon className={className} {...props} />;

export const IconSuccess: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <CheckCircleIcon className={className} {...props} />;

export const IconSun: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <SunIcon className={className} {...props} />;

export const IconMoon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <MoonIcon className={className} {...props} />;

export const IconBolt: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <BoltIcon className={className} {...props} />;

export const IconEye: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <EyeIcon className={className} {...props} />;

export const IconShield: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <ShieldCheckIcon className={className} {...props} />;

export const IconPause: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => <PauseIcon className={className} {...props} />;
