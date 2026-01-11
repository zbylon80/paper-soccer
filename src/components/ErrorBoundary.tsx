import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Game error caught by boundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-emerald-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-red-900/30 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-300 mb-4">
              Oops! Something went wrong
            </h2>
            <p className="text-red-200 mb-6 text-sm">
              The game encountered an unexpected error. Don't worry, this happens sometimes!
            </p>
            <button
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
            >
              Restart Game
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-red-300 cursor-pointer text-sm">
                  Technical Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-200 bg-red-900/50 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}