/**
 * Settings popup for configuring deterministic Instant Baseline strategies
 */

import { Alert } from '@heroui/alert';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { Radio, RadioGroup } from '@heroui/radio';
import { Skeleton } from '@heroui/skeleton';
import { Tab, Tabs } from '@heroui/tabs';
import { useTheme } from '@heroui/use-theme';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import { getHistory } from '@/entrypoints/shared/history/history';
import type { HistoryItem } from '@/entrypoints/shared/history/types';
import { getOnboardingState } from '@/entrypoints/shared/onboarding/onboarding-state';
import { STRATEGY_OPTIONS } from '@/entrypoints/shared/pipeline/strategy-options';
import {
  getSettings,
  type InstantBaselineStrategy,
  subscribeSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';
import { getAppropriateTheme } from '@/entrypoints/shared/ui/theme-service';
import { DownloadsAccessScreen } from './onboarding/DownloadsAccessScreen';

function App(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const [downloadsAccessChecked, setDownloadsAccessChecked] = useState(false);
  const [hasDownloadsAccess, setHasDownloadsAccess] = useState<boolean | null>(
    null,
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [accessCheckError, setAccessCheckError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<InstantBaselineStrategy | null>(
    null,
  );
  const [settingsTheme, setSettingsTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<
    'all' | 'upgrades' | 'media'
  >('all');

  const refreshDownloadsAccess = useCallback(async () => {
    setDownloadsAccessChecked(false);
    try {
      const [state, handle] = await Promise.all([
        getOnboardingState(),
        getStoredDirectoryHandle(),
      ]);
      let permitted = false;
      if (handle) {
        try {
          const permissionFn = (
            handle as unknown as {
              queryPermission?: (descriptor?: {
                mode?: 'read' | 'readwrite';
              }) => Promise<PermissionState>;
            }
          ).queryPermission;
          if (typeof permissionFn === 'function') {
            const permission = await permissionFn.call(handle, {
              mode: 'readwrite',
            });
            permitted = permission === 'granted';
          } else {
            permitted = false;
          }
        } catch (err) {
          debugLogger.warn('Querying directory permission failed', {
            error: err,
          });
          permitted = false;
        }
      }
      setHasDownloadsAccess(permitted);
      setShowOnboarding(!permitted && state.status !== 'skipped');
      setAccessCheckError(null);
    } catch (err) {
      debugLogger.error('Failed to evaluate onboarding state', { error: err });
      setAccessCheckError(
        err instanceof Error
          ? err.message
          : 'Unable to verify Downloads access.',
      );
      setHasDownloadsAccess(null);
      setShowOnboarding(false);
    } finally {
      setDownloadsAccessChecked(true);
    }
  }, []);

  useEffect(() => {
    void refreshDownloadsAccess();
  }, [refreshDownloadsAccess]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    getSettings()
      .then((settings) => {
        if (!active) return;
        setStrategy(settings.instantBaselineStrategy);
        setSettingsTheme(settings.theme);
        setTheme(settings.theme);
        setLoading(false);
      })
      .catch((err) => {
        debugLogger.error('Failed to load settings', { error: err });
        if (!active) return;
        setError('Unable to load settings. Please reopen the popup.');
        setLoading(false);
      });

    unsubscribe = subscribeSettings((settings) => {
      if (!active) return;
      setStrategy(settings.instantBaselineStrategy);
      if (settings.theme !== settingsTheme) {
        setSettingsTheme(settings.theme);
        setTheme(settings.theme);
      }
    });

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [setTheme, settingsTheme]);

  useEffect(() => {
    if (savedAt === null) return;
    const timeout = window.setTimeout(() => setSavedAt(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [savedAt]);

  // Auto-detect system theme on first load and daily reset
  useEffect(() => {
    const appropriateTheme = getAppropriateTheme(theme);
    if (appropriateTheme !== theme) {
      setTheme(appropriateTheme);
    }
  }, [theme, setTheme]);

  const options = useMemo(() => STRATEGY_OPTIONS, []);

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;
    try {
      const items = await getHistory();
      setHistory(items);
      setHistoryLoaded(true);
    } catch (err) {
      debugLogger.error('Failed to load history', { error: err });
    }
  }, [historyLoaded]);

  const filteredHistory = useMemo(() => {
    switch (historyFilter) {
      case 'upgrades':
        return history.filter((item) => item.upgrade);
      case 'media':
        return history.filter(
          (item) => item.fileType === 'audio' || item.fileType === 'video',
        );
      default:
        return history;
    }
  }, [history, historyFilter]);

  const handleChange = async (value: InstantBaselineStrategy) => {
    if (saving) return;
    if (strategy === value) return;

    setSaving(true);
    setError(null);

    try {
      await updateSettings({ instantBaselineStrategy: value });
      setStrategy(value);
      setSavedAt(Date.now());
    } catch (err) {
      debugLogger.error('Failed to update strategy', { error: err });
      setError('Could not save changes. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!downloadsAccessChecked) {
    return (
      <div className="w-96 p-3 bg-background text-foreground">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="w-96 p-3 bg-background text-foreground">
        <DownloadsAccessScreen
          onComplete={() => {
            setShowOnboarding(false);
            setHasDownloadsAccess(null);
            setDownloadsAccessChecked(false);
            void refreshDownloadsAccess();
          }}
          onSkip={() => {
            setShowOnboarding(false);
            setHasDownloadsAccess(false);
            void refreshDownloadsAccess();
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-96 p-3 bg-background text-foreground relative">
      {/* Dark Mode Toggle */}
      <button
        type="button"
        onClick={() => {
          const newTheme = theme === 'dark' ? 'light' : 'dark';
          setTheme(newTheme);
          setSettingsTheme(newTheme);
          updateSettings({ theme: newTheme }).catch((err) => {
            debugLogger.error('Failed to save theme', { error: err });
          });
        }}
        className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-default-100 hover:bg-default-200 flex items-center justify-center text-default-600 hover:text-default-900 transition-colors cursor-pointer"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* Floating Saved Chip */}
      {!saving && savedAt !== null && (
        <Chip
          color="success"
          variant="flat"
          size="sm"
          className="absolute top-2 right-10 z-10 text-xs animate-in fade-in slide-in-from-top-2 duration-300"
        >
          Saved
        </Chip>
      )}

      <header className="mb-3">
        <h1 className="text-lg font-semibold">NewName</h1>
      </header>

      {accessCheckError ? (
        <Alert color="warning" variant="flat" className="mb-3 text-xs">
          {accessCheckError}
        </Alert>
      ) : null}

      {hasDownloadsAccess === false ? (
        <Alert
          color="warning"
          variant="flat"
          className="mb-3 text-xs space-y-2"
        >
          <p>
            Downloads access is disabled. Post-download renames and undo will be
            paused until access is granted.
          </p>
          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="inline-flex items-center justify-center rounded border border-warning-400 px-3 py-1 text-[11px] font-semibold text-warning-800 transition hover:bg-warning-100"
          >
            Grant access
          </button>
        </Alert>
      ) : null}

      <Tabs
        aria-label="Navigation tabs"
        variant="underlined"
        onSelectionChange={(key) => {
          if (key === 'history' && !historyLoaded) {
            void loadHistory();
          }
        }}
        classNames={{
          tabList: 'gap-6 w-full relative p-0',
          cursor: 'w-full',
          tab: 'px-0 h-10',
          tabContent:
            'text-default-500 group-data-[selected=true]:text-foreground',
        }}
      >
        <Tab
          key="strategy"
          title={
            <div className="flex items-center gap-2">
              <span>Strategy</span>
            </div>
          }
        >
          {loading ? (
            <div className="space-y-2 pt-3">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : (
            <div className="pt-3">
              {error && (
                <Alert color="danger" variant="flat" className="mb-3 text-xs">
                  {error}
                </Alert>
              )}

              <p className="text-xs text-default-600 leading-relaxed mb-3">
                Choose how to rename downloads automatically.
              </p>

              <RadioGroup
                value={strategy || ''}
                onValueChange={(value) =>
                  handleChange(value as InstantBaselineStrategy)
                }
                isDisabled={saving}
                className="mb-3"
              >
                {options.map((option) => (
                  <Radio
                    key={option.value}
                    value={option.value}
                    description={option.description}
                    classNames={{
                      base: 'max-w-full m-0 bg-content1 hover:bg-content2 items-start cursor-pointer rounded-lg gap-3 p-2 border border-transparent data-[selected=true]:border-primary data-[selected=true]:bg-primary-50',
                      wrapper: 'mt-0.5',
                      labelWrapper: 'ml-0',
                      label: 'text-sm font-medium',
                      description: 'text-xs text-default-500 mt-0.5',
                    }}
                  >
                    {option.title}
                  </Radio>
                ))}
              </RadioGroup>

              <Divider className="mb-2" />

              <footer>
                <p className="text-xs text-default-500 leading-relaxed">
                  If it can't rename, saves with original name.
                </p>
              </footer>
            </div>
          )}
        </Tab>

        <Tab
          key="history"
          title={
            <div className="flex items-center gap-2">
              <span>History</span>
              {history.filter((item) => item.upgrade).length > 0 && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="text-[9px] h-4 px-1 min-w-4"
                >
                  {history.filter((item) => item.upgrade).length}
                </Chip>
              )}
            </div>
          }
        >
          <div className="pt-3">
            <div className="flex gap-2 mb-3 flex-wrap">
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  historyFilter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-default-100 text-default-600 hover:bg-default-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('upgrades')}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  historyFilter === 'upgrades'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-default-100 text-default-600 hover:bg-default-200'
                }`}
              >
                Upgrades
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('media')}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  historyFilter === 'media'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-default-100 text-default-600 hover:bg-default-200'
                }`}
              >
                Media
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 text-xs">
              {filteredHistory.length === 0 ? (
                <p className="text-default-400 text-center py-4">
                  {historyFilter === 'all'
                    ? 'No history yet'
                    : historyFilter === 'upgrades'
                      ? 'No upgrades available'
                      : 'No media files yet'}
                </p>
              ) : (
                filteredHistory.slice(0, 20).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-content1 rounded-md border border-divider"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-foreground flex-1 break-all">
                        {item.final}
                      </span>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={
                          item.fileType === 'video' || item.fileType === 'audio'
                            ? 'secondary'
                            : 'default'
                        }
                        className="text-[10px] flex-shrink-0"
                      >
                        {item.fileType}
                      </Chip>
                    </div>

                    {item.upgrade && (
                      <div className="mt-2 p-2 bg-primary-50 dark:bg-primary-100/10 rounded-md border border-primary-200/50 dark:border-primary-400/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-primary-600 dark:text-primary-400">
                            ✨
                          </span>
                          <span className="text-primary-700 dark:text-primary-300 font-medium text-[11px]">
                            Upgrade available
                          </span>
                        </div>
                        <p className="text-foreground dark:text-foreground/90 break-all text-[11px] leading-relaxed">
                          {item.upgrade.proposedFilename}
                        </p>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {item.upgrade.reasonTags.map((tag) => (
                            <Chip
                              key={tag}
                              size="sm"
                              variant="flat"
                              color="primary"
                              className="text-[9px] h-4"
                            >
                              {tag}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.media &&
                      item.media.status === 'success' &&
                      item.media.summary && (
                        <div className="mt-1 text-[10px] text-default-500">
                          {item.media.summary.video[0] && (
                            <span>
                              {item.media.summary.video[0].width}×
                              {item.media.summary.video[0].height}
                              {item.media.summary.video[0].frameRate &&
                                ` • ${Math.round(item.media.summary.video[0].frameRate)}fps`}
                            </span>
                          )}
                          {item.media.summary.audio[0] && (
                            <span>
                              {item.media.summary.audio[0].channels && (
                                <> • {item.media.summary.audio[0].channels}ch</>
                              )}
                              {item.media.summary.audio[0].sampleRateHz && (
                                <>
                                  {' '}
                                  •{' '}
                                  {Math.round(
                                    item.media.summary.audio[0].sampleRateHz /
                                      1000,
                                  )}
                                  kHz
                                </>
                              )}
                            </span>
                          )}
                          {item.media.summary.general.durationMs && (
                            <span>
                              {' '}
                              •{' '}
                              {Math.round(
                                item.media.summary.general.durationMs / 1000,
                              )}
                              s
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}

export default App;
