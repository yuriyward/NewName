import { SparklesIcon } from '@heroicons/react/16/solid';
import { useReducer } from 'react';
import {
  type FilenamePresetKey,
  filenameVariants,
} from '../mocks/notification-data';
import {
  CompactCodeSnippet,
  FilenamePresetToggles,
  ImplRef,
  OnboardingScreenPreview,
  StatePreview,
  StateToggleButton,
  UpgradeConfirmToastPreview,
} from '../notification-examples';

type ConfirmState = 'pending' | 'applied' | 'error';
type FilenamePreset = FilenamePresetKey;

interface NotificationsState {
  confirmState: ConfirmState;
  filenamePreset: FilenamePreset;
}

type NotificationsAction =
  | { type: 'setConfirmState'; value: ConfirmState }
  | { type: 'setFilenamePreset'; value: FilenamePreset };

const initialState: NotificationsState = {
  confirmState: 'pending',
  filenamePreset: 'normal',
};

const notificationsReducer = (
  state: NotificationsState,
  action: NotificationsAction,
): NotificationsState => {
  switch (action.type) {
    case 'setConfirmState':
      return { ...state, confirmState: action.value };
    case 'setFilenamePreset':
      return { ...state, filenamePreset: action.value };
    default:
      return state;
  }
};

const NotificationsSection = () => {
  const [{ confirmState, filenamePreset }, dispatch] = useReducer(
    notificationsReducer,
    initialState,
  );

  const isFilenamePreset = (value: string): value is FilenamePreset =>
    Object.hasOwn(filenameVariants, value);

  const isConfirmState = (value: string): value is ConfirmState =>
    value === 'pending' || value === 'applied' || value === 'error';

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Notifications & Toasts</h2>

      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-2">Filename Length Presets</h3>
        <p className="text-xs opacity-70 mb-2">
          Test all notifications with different filename lengths:
        </p>
        <FilenamePresetToggles
          selected={filenamePreset}
          onChange={(value) =>
            isFilenamePreset(value) &&
            dispatch({ type: 'setFilenamePreset', value })
          }
        />
      </div>

      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4" />
          Upgrade Notification (Confirm Pattern)
        </h3>
        <div className="space-y-2">
          <StateToggleButton
            states={['pending', 'applied', 'error']}
            current={confirmState}
            onChange={(value) =>
              isConfirmState(value) &&
              dispatch({
                type: 'setConfirmState',
                value,
              })
            }
          />
          <div className="space-y-1.5">
            <p className="text-xs opacity-70">
              State: <strong>{confirmState}</strong>
              {confirmState === 'pending' && (
                <span className="ml-2 text-default-500">
                  • Hover over toast to see pause/edit state
                </span>
              )}
            </p>
            <div className="p-2 bg-default-100 rounded border border-default-200">
              <UpgradeConfirmToastPreview
                state={confirmState}
                filenamePreset={filenamePreset}
              />
            </div>
          </div>
          <div className="text-xs opacity-70 space-y-1 bg-blue-50 border border-blue-200 rounded p-2">
            <p>
              <strong>Behavior:</strong>
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Auto-rename countdown runs by default (5s)</li>
              <li>Hover pauses countdown and reveals buttons + inline edit</li>
              <li>Edit the filename in textarea (auto-show on hover)</li>
              <li>Choose "Rename" or "Keep" to resolve</li>
              <li>Resume countdown when hover ends without action</li>
            </ul>
          </div>
          <ImplRef
            file="entrypoints/shared/ui/ConfirmToast.tsx"
            description="Upgrade notification with auto-rename + hover pause pattern"
          />
        </div>
      </div>

      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4" />
          Contextual Upgrade Pipeline
        </h3>
        <div className="space-y-2 text-xs opacity-70">
          <p>
            After the <strong>Upgrade Notification (Confirm Pattern)</strong>{' '}
            resolves, the contextual upgrade pipeline runs in the background to
            generate smarter suggestions.
          </p>
          <div className="bg-default-100 rounded p-2 space-y-1">
            <p>
              <strong>Confidence Levels:</strong>
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>High - Very confident this is the right name</li>
              <li>Suggested - Good alternative, worth considering</li>
              <li>Alternative - Additional option, lower confidence</li>
            </ul>
          </div>
          <div className="bg-default-100 rounded p-2 space-y-1">
            <p>
              <strong>Reason tags:</strong> Title, Date, Geo, Source, Language
            </p>
            <p>
              <strong>Actions:</strong> Apply, Details, Not now, Always apply
              for type
            </p>
          </div>
          <ImplRef
            file="entrypoints/background/upgrade/"
            description="Contextual upgrade pipeline (background AI analysis)"
          />
        </div>
      </div>

      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-2">
          Onboarding Screens (PRD 3)
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((screen) => (
            <OnboardingScreenPreview key={screen} screen={screen} />
          ))}
        </div>
        <div className="text-xs opacity-70 mt-2 space-y-1">
          <p>Screen 1: Mode selection (Balanced, Silent, Careful, Custom)</p>
          <p>Screen 2: Cloud assist toggle + per-type checkboxes</p>
          <p>Screen 3: Downloads folder permission grant</p>
          <p>Screen 4: Enable on-device AI models</p>
        </div>
      </div>

      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-2">
          Error & Processing States
        </h3>
        <div className="space-y-2">
          <StatePreview type="error" />
          <StatePreview type="permission" />
          <StatePreview type="processing" />
          <div className="text-xs opacity-70">
            <p>
              <strong>PRD copy (Section 6):</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>"🧠 Analyzing first pages…"</li>
              <li>"☁️ Using cloud assist (per your settings)…"</li>
              <li>"On-device model not ready — using Metadata-only mode."</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="heroui-card">
        <h3 className="text-sm font-semibold mb-2">PRD Copy Examples</h3>
        <div className="space-y-2 text-xs">
          <div>
            <p className="font-medium mb-1">Success:</p>
            <CompactCodeSnippet
              code={
                '✨ Found better name: **Database — CORS**\n✅ Applied smarter name: **…**\n"Kept original — already clear."'
              }
              label="Renamed toast & kept toast"
            />
          </div>
          <div>
            <p className="font-medium mb-1">Processing:</p>
            <CompactCodeSnippet
              code={
                '🧠 Analyzing first pages…\n📖 Reading document…\n⚡ Almost ready with upgrade…'
              }
              label="Background processing messages"
            />
          </div>
          <div>
            <p className="font-medium mb-1">Error/Fallback:</p>
            <CompactCodeSnippet
              code={
                'On-device model not ready\nTaking longer than expected\nFile is busy — retrying…'
              }
              label="Error/timeout messages"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsSection;
