import { Component, type ErrorInfo, type ReactNode } from 'react';

interface SectionErrorBoundaryProps {
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

class SectionErrorBoundary extends Component<
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
    // eslint-disable-next-line no-console
    console.error('Section render failed', { error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="heroui-card border border-danger-200 bg-danger-50 text-danger-600">
          <h2 className="text-sm font-semibold mb-1">
            Unable to render this section
          </h2>
          <p className="text-xs opacity-80">
            {this.state.errorMessage ??
              'An unexpected error occurred while loading the design preview.'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SectionErrorBoundary;
