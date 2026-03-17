import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 p-6">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <div className="text-sm font-medium">
            {this.props.label || "Panel"} crashed
          </div>
          <div className="text-xs text-slate-400 max-w-xs text-center break-all">
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
