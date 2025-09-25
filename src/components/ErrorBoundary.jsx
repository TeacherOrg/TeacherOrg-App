import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    if (error.message.includes('Objects are not valid as a React child')) {
      // Spezifischer Fallback: Zeige Warnung in UI
      this.setState({ hasError: true, errorMessage: 'Fehler beim Rendern: Ungültige Daten. Bitte Daten überprüfen.' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Etwas ist schiefgelaufen.</h1>
            <p>{this.state.errorMessage}</p>
            <p>Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;