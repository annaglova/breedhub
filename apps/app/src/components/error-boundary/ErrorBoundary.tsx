import React from "react";

type ErrorBoundaryLevel = "page" | "tab";

interface SharedErrorBoundaryProps {
  children: React.ReactNode;
  contextLabel?: string;
  resetKeys?: unknown[];
}

interface ErrorBoundaryProps extends SharedErrorBoundaryProps {
  level: ErrorBoundaryLevel;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

function haveResetKeysChanged(
  prevResetKeys: unknown[] | undefined,
  nextResetKeys: unknown[] | undefined,
): boolean {
  const previous = prevResetKeys ?? [];
  const next = nextResetKeys ?? [];

  if (previous.length !== next.length) {
    return true;
  }

  return previous.some((value, index) => !Object.is(value, next[index]));
}

function PageFallback({
  contextLabel,
  onRetry,
}: {
  contextLabel?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-amber-200 bg-amber-50/80 p-8 text-center shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          Page Error
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">
          This page hit a snag
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {contextLabel
            ? `We ran into a rendering error while opening ${contextLabel}.`
            : "We ran into a rendering error while opening this page."}{" "}
          You can try again, and if it keeps happening a refresh should usually recover it.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function TabFallback({
  contextLabel,
  onRetry,
}: {
  contextLabel?: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-6 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
        Tab Error
      </div>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">
        {contextLabel
          ? `${contextLabel} could not be rendered`
          : "This section could not be rendered"}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        The rest of the page is still available. You can retry just this section.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100"
      >
        Retry section
      </button>
    </div>
  );
}

class ErrorBoundaryRoot extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const boundaryLabel = this.props.level === "page" ? "Page" : "Tab";
    const contextSuffix = this.props.contextLabel
      ? ` (${this.props.contextLabel})`
      : "";

    console.error(
      `[ErrorBoundary] ${boundaryLabel} boundary caught an error${contextSuffix}:`,
      error,
      errorInfo,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (
      this.state.hasError &&
      haveResetKeysChanged(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.setState({ hasError: false });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.level === "page") {
      return (
        <PageFallback
          contextLabel={this.props.contextLabel}
          onRetry={this.handleRetry}
        />
      );
    }

    return (
      <TabFallback
        contextLabel={this.props.contextLabel}
        onRetry={this.handleRetry}
      />
    );
  }
}

export function PageErrorBoundary(props: SharedErrorBoundaryProps) {
  return <ErrorBoundaryRoot {...props} level="page" />;
}

export function TabErrorBoundary(props: SharedErrorBoundaryProps) {
  return <ErrorBoundaryRoot {...props} level="tab" />;
}
