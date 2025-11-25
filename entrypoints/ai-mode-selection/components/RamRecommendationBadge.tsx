import type { JSX } from 'react';

interface RamRecommendationBadgeProps {
  ramGB: number;
  recommendation: 'local' | 'cloud';
}

export function RamRecommendationBadge({
  ramGB,
  recommendation,
}: RamRecommendationBadgeProps): JSX.Element {
  if (ramGB === 0) {
    return (
      <div className="rounded-xl border border-default-200 bg-default-50 p-3 text-sm text-default-600">
        Couldn't detect RAM. Both options work on any system.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-3 text-sm">
      <p className="font-medium text-primary-900">{ramGB}GB RAM detected</p>
      <p className="mt-1 text-primary-700">
        {recommendation === 'local'
          ? 'Local AI recommended'
          : 'Cloud AI recommended'}
      </p>
    </div>
  );
}
