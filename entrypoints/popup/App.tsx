/**
 * Settings popup for configuring deterministic Instant Baseline strategies
 */

import { Alert } from '@heroui/alert';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { Radio, RadioGroup } from '@heroui/radio';
import { Skeleton } from '@heroui/skeleton';
import { useTheme } from '@heroui/use-theme';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { STRATEGY_OPTIONS } from '@/entrypoints/shared/pipeline/strategy-options';
import {
  getSettings,
  type InstantBaselineStrategy,
  subscribeSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';
import { getAppropriateTheme } from '@/entrypoints/shared/ui/theme-service';

function App(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const [strategy, setStrategy] = useState<InstantBaselineStrategy | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    getSettings()
      .then((settings) => {
        if (!active) return;
        setStrategy(settings.instantBaselineStrategy);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings', err);
        if (!active) return;
        setError('Unable to load settings. Please reopen the popup.');
        setLoading(false);
      });

    unsubscribe = subscribeSettings((settings) => {
      if (!active) return;
      setStrategy(settings.instantBaselineStrategy);
    });

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

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
      console.error('Failed to update strategy', err);
      setError('Could not save changes. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-80 p-3 bg-background text-foreground relative">
      {/* Dark Mode Toggle */}
      <button
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
        <h1 className="text-lg font-semibold mb-1">Rename Strategy</h1>
        <p className="text-xs text-default-600 leading-relaxed">
          Choose how to rename downloads automatically.
        </p>
      </header>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {error && (
            <Alert color="danger" variant="flat" className="mb-3 text-xs">
              {error}
            </Alert>
          )}

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
        </>
      )}
    </div>
  );
}

export default App;
