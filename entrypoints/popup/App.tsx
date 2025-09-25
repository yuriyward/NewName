/**
 * Settings popup for configuring deterministic Instant Baseline strategies
 */

import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  getSettings,
  type InstantBaselineStrategy,
  subscribeSettings,
  updateSettings,
} from '@/entrypoints/shared/settings/settings';

type StrategyOption = {
  value: InstantBaselineStrategy;
  title: string;
  description: string;
};

const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    value: 'keep-original',
    title: 'Keep original name',
    description:
      'Leave downloads untouched in Phase 1. Use Phase 2 when you want an upgraded suggestion.',
  },
  {
    value: 'original-with-date',
    title: 'Original name + download date',
    description:
      'Sanitize the original filename and append the YYYY-MM-DD download date when available.',
  },
  {
    value: 'page-title',
    title: 'Page title only',
    description:
      'Use the page title captured at download time. Falls back to the original name if no title was available.',
  },
  {
    value: 'page-title-with-date',
    title: 'Page title + download date',
    description:
      'Combine the page title with the download date. If either input is missing the original filename is kept.',
  },
];

function App(): JSX.Element {
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
    <section
      className="flex flex-col gap-4 p-5 bg-white text-slate-900 w-[360px] max-w-full m-0 dark:bg-slate-900 dark:text-slate-200"
      aria-label="Phase 1 strategy settings"
    >
      <header className="space-y-1">
        <h1 className="m-0 text-xl font-semibold text-slate-900 dark:text-slate-50">
          Phase 1 strategy
        </h1>
        <p className="mt-1 mb-0 text-sm leading-relaxed text-slate-600 dark:text-blue-300">
          Choose how NewName handles downloads instantly. These options only use
          deterministic metadata—semantic upgrades stay in Phase 2.
        </p>
      </header>

      {loading ? (
        <div
          className="text-center text-sm text-slate-600 dark:text-blue-300"
          aria-live="polite"
        >
          Loading…
        </div>
      ) : (
        <>
          {error && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2.5 text-sm dark:border-red-800 dark:bg-red-900 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          )}

          <fieldset className="border-0 m-0 p-0 flex flex-col gap-3">
            <legend className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
              Strategies
            </legend>
            {options.map((option) => {
              const checked = strategy === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ease-in-out cursor-pointer ${checked ? 'border-blue-600 bg-blue-50 shadow-[0_0_0_2px_rgba(37,99,235,0.15)] dark:border-blue-400 dark:bg-blue-900 dark:shadow-[0_0_0_2px_rgba(96,165,250,0.2)]' : 'border-slate-200 bg-slate-50 hover:border-blue-300 dark:border-slate-700 dark:bg-gray-800 dark:hover:border-blue-600'}`}
                >
                  <input
                    type="radio"
                    name="instant-baseline-strategy"
                    value={option.value}
                    checked={checked}
                    onChange={() => handleChange(option.value)}
                    disabled={saving}
                    className="mt-1 accent-blue-600"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {option.title}
                    </span>
                    <span className="text-sm leading-relaxed text-slate-600 dark:text-blue-300">
                      {option.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </fieldset>

          <footer className="flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <div
              className="min-h-[1em] text-xs text-slate-500"
              aria-live="polite"
            >
              {saving && <span>Saving…</span>}
              {!saving && savedAt !== null && (
                <span className="text-green-600 font-semibold dark:text-green-400">
                  Saved
                </span>
              )}
            </div>
            <p className="m-0 text-xs leading-relaxed text-slate-500">
              Missing inputs (e.g. no page title) automatically fall back to the
              original filename, so Phase 1 never makes unsafe guesses.
            </p>
          </footer>
        </>
      )}
    </section>
  );
}

export default App;
