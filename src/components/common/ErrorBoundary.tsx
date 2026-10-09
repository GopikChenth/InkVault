import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-background text-zinc-800 dark:text-zinc-200 p-6 select-none">
          <div className="max-w-md w-full p-6 rounded-3xl bg-card border border-border shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in duration-200">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                Rendering Interrupted
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                An unexpected state occurred while rendering this view. Your documents in storage remain completely safe.
              </p>
            </div>

            {this.state.error && (
              <pre className="w-full max-h-24 overflow-y-auto text-[11px] font-mono p-3 rounded-xl bg-surface border border-border text-zinc-600 dark:text-zinc-400 text-left">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex items-center gap-2.5 w-full pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-[#00363d] font-bold text-xs hover:bg-accent-hover transition-colors shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload View</span>
              </button>
              
              <button
                onClick={() => {
                  this.handleReset();
                  window.location.reload();
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-container border border-border font-medium text-xs text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Restart App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
