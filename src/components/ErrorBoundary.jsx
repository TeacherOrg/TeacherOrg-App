import React from 'react';

class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 flex items-center justify-center">
          <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl p-4">
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p>{this.state.error}</p>
            <button
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;