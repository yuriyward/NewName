import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon';
import ShieldExclamationIcon from '@heroicons/react/24/outline/ShieldExclamationIcon';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import type {
  CloudConsentDecision,
  CloudConsentRequestDetails,
} from '@/entrypoints/shared/integrations/text-analysis/types';
import {
  requestCloudConsentDetails,
  submitCloudConsentDecision,
} from '@/entrypoints/shared/messaging/extension-messaging';

type ConsentState =
  | { status: 'loading' }
  | { status: 'ready'; details: CloudConsentRequestDetails }
  | { status: 'submitted'; decision: CloudConsentDecision }
  | { status: 'error'; message: string };

function useToken(): string | null {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    return token && token.length > 0 ? token : null;
  }, []);
}

function formatPath(details: CloudConsentRequestDetails): string {
  if (!details.relativePath) return details.filename;
  return `${details.relativePath}`;
}

export function CloudConsentPage(): JSX.Element {
  const token = useToken();
  const [state, setState] = useState<ConsentState>({ status: 'loading' });

  useEffect(() => {
    if (!token) {
      setState({
        status: 'error',
        message: 'Missing consent token. Close this tab and retry the action.',
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const details = await requestCloudConsentDetails({ token });
        if (cancelled) return;
        if (!details) {
          setState({
            status: 'error',
            message:
              'This consent request expired. Close this tab and retry the action.',
          });
          return;
        }
        setState({ status: 'ready', details });
      } catch (error) {
        debugLogger.error('[CloudConsentPage] Failed to load details', {
          error,
        });
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              'Something went wrong while loading the request. Close this tab and try again.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = useCallback(
    async (decision: CloudConsentDecision) => {
      if (!token) return;
      if (state.status !== 'ready') return;
      setState({ status: 'submitted', decision });
      try {
        await submitCloudConsentDecision({ token, decision });
      } catch (error) {
        debugLogger.error('[CloudConsentPage] Failed to submit decision', {
          error,
        });
      } finally {
        // Give the background a moment to handle the decision, then close tab if possible
        setTimeout(() => {
          try {
            window.close();
          } catch {
            // Ignore failures; user can close tab manually.
          }
        }, 600);
      }
    },
    [state, token],
  );

  const ready = state.status === 'ready' ? state.details : null;
  const submitting =
    state.status === 'submitted' && state.decision !== 'deny'
      ? state.decision
      : null;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary-50/60 via-transparent to-transparent" />
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary-600 shadow-sm">
            NewName · Cloud AI
          </div>
          <h1 className="text-3xl font-semibold text-default-900">
            Allow cloud AI analysis for this rename?
          </h1>
          <p className="text-sm leading-relaxed text-default-600">
            Chrome couldn&apos;t reach the on-device model. You can fall back to
            NewName&apos;s encrypted cloud service to finish analysing this file
            without waiting. We only process the excerpt needed to build a
            better filename, and nothing is stored afterwards.
          </p>
        </header>

        {state.status === 'error' ? (
          <div className="rounded-2xl border border-danger-200 bg-danger-50/80 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-danger-100 text-danger-700">
                <ShieldExclamationIcon className="h-5 w-5" />
              </span>
              <div className="space-y-2 text-sm text-danger-700">
                <p className="font-semibold">We couldn&apos;t continue.</p>
                <p>{state.message}</p>
                <p className="text-xs text-danger-600">
                  Close this tab and retry from the download list.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {ready ? (
          <section className="space-y-6 rounded-3xl border border-default-200 bg-white/85 p-6 shadow-[0_24px_45px_-30px_rgba(15,23,42,0.3)] backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary-50 p-3 text-primary-500 shadow-inner">
                <InformationCircleIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs uppercase tracking-wide text-default-400">
                  File to analyse
                </p>
                <p className="truncate text-lg font-semibold text-default-900">
                  {ready.filename}
                </p>
                <p className="font-mono text-[11px] uppercase tracking-wide text-default-500">
                  {formatPath(ready)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-default-200 bg-default-50/80 p-4 text-sm text-default-600 sm:grid-cols-3">
              <div className="rounded-lg bg-white/70 p-3 shadow-sm">
                <p className="font-semibold text-default-700">What we send</p>
                <p className="mt-1 text-xs leading-relaxed text-default-500">
                  Only the excerpt needed to understand the document (up to
                  128&nbsp;KB) plus the existing filename.
                </p>
              </div>
              <div className="rounded-lg bg-white/70 p-3 shadow-sm">
                <p className="font-semibold text-default-700">What we keep</p>
                <p className="mt-1 text-xs leading-relaxed text-default-500">
                  Nothing. The cloud model returns the suggested stem and
                  qualifiers, then the data is discarded immediately.
                </p>
              </div>
              <div className="rounded-lg bg-white/70 p-3 shadow-sm">
                <p className="font-semibold text-default-700">Your control</p>
                <p className="mt-1 text-xs leading-relaxed text-default-500">
                  Change this preference anytime under Settings → Cloud AI, or
                  revoke it if you change your mind later.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => submit('allow-once')}
                disabled={state.status !== 'ready'}
              >
                <CheckIcon className="h-4 w-4" />
                Allow for this file
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary-600 shadow-sm transition hover:border-primary-300 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => submit('allow-always')}
                disabled={state.status !== 'ready'}
              >
                <CheckIcon className="h-4 w-4" />
                Always allow
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-default-200 bg-default-50 px-5 py-2.5 text-sm font-semibold text-default-600 transition hover:border-default-300 hover:text-default-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-default-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => submit('deny')}
                disabled={state.status !== 'ready'}
              >
                Not now
              </button>
            </div>
          </section>
        ) : null}

        {state.status === 'submitted' ? (
          <div className="rounded-2xl border border-success-200 bg-success-50/85 p-6 text-success-700 shadow-sm">
            {submitting === 'allow-always' || submitting === 'allow-once' ? (
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-100 text-success-700">
                  <CheckIcon className="h-5 w-5" />
                </span>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">
                    {submitting === 'allow-always'
                      ? 'Cloud analysis enabled.'
                      : 'Cloud analysis allowed for this file.'}
                  </p>
                  <p className="text-xs text-success-600">
                    You can close this tab—NewName will continue automatically.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-default-200 text-default-700">
                  <ShieldExclamationIcon className="h-5 w-5" />
                </span>
                <div className="space-y-1 text-sm text-default-600">
                  <p className="font-semibold">Cloud analysis cancelled.</p>
                  <p className="text-xs">
                    Close this tab to go back to NewName’s popup and keep the
                    original filename.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <section className="rounded-2xl border border-default-200 bg-content1/70 p-5 text-sm text-default-500 shadow-inner">
          <p className="font-medium text-default-700">Why am I seeing this?</p>
          <p className="mt-1 text-xs leading-relaxed">
            NewName prefers on-device AI for privacy. When Chrome reports that
            the local Gemini Nano model is unavailable, we pause and ask before
            sending any data to the cloud. Choose “Always allow” to skip this
            prompt next time—you can toggle the option anytime in Settings →
            Cloud AI.
          </p>
        </section>
      </main>
    </div>
  );
}
