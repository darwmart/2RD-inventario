import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log a consola estructurado (Sentry lo intercepta si está configurado)
    console.error('[ErrorBoundary]', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1">Algo salió mal</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ocurrió un error inesperado en esta sección.
              Puedes intentar recargar o contactar al administrador.
            </p>
            {import.meta.env.DEV && (
              <pre className="mt-3 text-left text-xs bg-muted rounded p-3 max-w-lg overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Recargar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── HOC para envolver cualquier componente ───────────────────
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
