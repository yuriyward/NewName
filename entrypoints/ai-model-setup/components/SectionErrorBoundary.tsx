import { Component, type ErrorInfo, type ReactNode } from 'react';

interface SectionErrorBoundaryProps {
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Error boundary for section-level components in AI model setup page.
 * Prevents component render failures from breaking the entire page.
 */
export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SectionErrorBoundary] Section render failed', {
      error,
      info,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border-2 border-danger-200 bg-danger-50 p-4">
          <h2 className="mb-1 text-sm font-semibold text-danger-700">
            Unable to render this section
          </h2>
          <p className="text-xs text-danger-600/80">
            {this.state.errorMessage ??
              'An unexpected error occurred while loading this section.'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
