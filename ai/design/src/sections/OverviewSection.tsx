import {
  ArrowPathIcon,
  BoltIcon,
  CheckIcon,
  EyeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/16/solid';

const OverviewSection = () => (
  <div className="space-y-3">
    <div>
      <h2 className="text-xl font-bold mb-2">Design Principles</h2>
      <p className="text-sm opacity-80 mb-2">
        Our design system is built around the principles of being invisible,
        competent, and privacy-forward.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
          <BoltIcon className="w-4 h-4" />
          Instant Value, Zero Drag
        </h3>
        <p className="text-xs opacity-80">
          The Instant Baseline rename never blocks the download longer than
          necessary.
        </p>
      </div>
      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" />
          Upgrade, Don't Nag
        </h3>
        <p className="text-xs opacity-80">
          Contextual Upgrade suggestions appear briefly and are easy to accept,
          ignore, or undo.
        </p>
      </div>
      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <EyeIcon className="w-4 h-4" />
          Trust at a Glance
        </h3>
        <p className="text-xs opacity-80">
          Clear "On-device" vs "Cloud assist" badges with reason tags
          (Title/Date/Geo).
        </p>
      </div>
      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4" />
          Respect Agency
        </h3>
        <p className="text-xs opacity-80">
          Undo everywhere, per-type controls, explicit cloud consent.
        </p>
      </div>
    </div>

    <div className="heroui-card">
      <h3 className="text-sm font-semibold mb-2">Voice & Tone</h3>
      <div className="space-y-1.5">
        <div>
          <h4 className="text-xs font-medium mb-1 flex items-center gap-1.5">
            <CheckIcon className="w-3.5 h-3.5" />
            Example Messages:
          </h4>
          <ul className="space-y-1 text-xs opacity-80">
            <li>
              • "Renamed (On-device) to <strong>Application Form…</strong>"
            </li>
            <li>• "Kept original name — already clear."</li>
            <li>
              • "Found better name:{' '}
              <strong>Database — CORS for Edge Functions</strong> • Apply •
              Details"
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

export default OverviewSection;
