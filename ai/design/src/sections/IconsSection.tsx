import {
  BoltIcon,
  EyeIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/16/solid';

const IconsSection = () => (
  <div className="space-y-3">
    <h2 className="text-xl font-bold">Iconography</h2>
    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Primary Symbols</h3>
      <p className="text-xs opacity-70 mb-3">
        Heroicons provide consistent metaphors across toasts, settings, and
        onboarding flows. Stick to 16px filled icons for density-constrained
        surfaces.
      </p>
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <BoltIcon className="w-4 h-4" />
          <span className="text-sm">Bolt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4" />
          <span className="text-sm">Sparkles</span>
        </div>
        <div className="flex items-center gap-1.5">
          <EyeIcon className="w-4 h-4" />
          <span className="text-sm">Eye</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheckIcon className="w-4 h-4" />
          <span className="text-sm">Shield</span>
        </div>
      </div>
    </div>
  </div>
);

export default IconsSection;
